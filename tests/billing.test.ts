import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  applyRazorpayWebhook, associatePlanSelection, billingPersistenceReady, createCheckout, createContactSalesLead, createPlanSelection,
  publicPlans, resolveFeatureGate, resolvePlanSelection, strictPlanKey, validateCoupon,
  currentPlanSummary, verifyCheckoutPayment, verifyPaymentSignature, verifyWebhookSignature,
} from '../server/billing.js';
import { applyPlatformMigration, createSession, resolveTenantContext } from '../server/platform.js';
import { PLAN_REGISTRY, resolvePlanKey } from '../shared/platformRegistry.js';

const previousEnvironment = { key: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET, webhook: process.env.RAZORPAY_WEBHOOK_SECRET };
process.env.RAZORPAY_KEY_ID = 'rzp_test_key'; process.env.RAZORPAY_KEY_SECRET = 'test_secret'; process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret';
test.after(() => {
  if (previousEnvironment.key === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previousEnvironment.key;
  if (previousEnvironment.secret === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previousEnvironment.secret;
  if (previousEnvironment.webhook === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = previousEnvironment.webhook;
});

test('serverless checkout fails closed when billing state cannot be durable', async () => {
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  try {
    assert.equal(billingPersistenceReady(), false);
    const { db, context } = fixture();
    const selection = createPlanSelection(db, { planKey: 'pro', sourceTool: 'pricing' }, context);
    await assert.rejects(
      () => createCheckout(db, context, { planKey: 'pro' }, providerOrder('order_should_not_exist', () => undefined), selection.token),
      (error: any) => error.code === 'BILLING_STORAGE_UNAVAILABLE',
    );
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
  }
});

function fixture(subscription = 'free') {
  const db: any = applyPlatformMigration({ users: { 'payer@example.com': { id: 'payer@example.com', email: 'payer@example.com', name: 'Payer', password: 'long-enough-password', subscription } }, projects: {}, documents: {}, chats: {}, usage: {}, config: { coupons: [{ code: 'SAVE10', percentOff: 10, plans: ['pro'], active: true }] } }).db;
  const { token } = createSession(db, 'payer@example.com');
  return { db, context: resolveTenantContext(db, token), token };
}

const providerOrder = (id: string, capture: (body: any) => void): typeof fetch => (async (_url: any, init: any) => { const body = JSON.parse(String(init.body)); capture(body); return new Response(JSON.stringify({ id, amount: body.amount, currency: body.currency }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }) as any;

async function pendingCheckout(planKey: 'pro' | 'pro_plus' = 'pro') {
  const { db, context } = fixture(); const { token } = createPlanSelection(db, { planKey, sourceTool: 'pricing', returnRoute: 'pricing' }, context); let providerBody: any;
  const checkout = await createCheckout(db, context, { planKey, billingInterval: 'monthly', idempotencyKey: `checkout-${planKey}`, amount: 1 }, providerOrder(`order_${planKey}`, body => { providerBody = body; }), token);
  return { db, context, token, checkout, providerBody };
}

test('canonical plan registry exposes deterministic approved INR defaults without annual pricing', () => {
  const plans = publicPlans();
  assert.deepEqual(plans.map(plan => [plan.key, plan.monthlyPrice, plan.currency]), [['free', 0, 'INR'], ['pro', 99, 'INR'], ['pro_plus', 149, 'INR'], ['team', null, 'INR'], ['enterprise', null, 'INR']]);
  assert.deepEqual(Object.keys(PLAN_REGISTRY), ['free', 'pro', 'pro_plus', 'team', 'enterprise']);
  assert.equal(new Set(plans.map(plan => plan.key)).size, plans.length);
  assert.ok(Object.values(PLAN_REGISTRY).every(plan => plan.annualPriceMinor === null));
  assert.ok(plans.every(plan => !(plan as any).razorpayPlanId && !(plan as any).checkoutPriceId));
});

test('legacy aliases normalize to canonical keys but price numbers never do', () => {
  assert.equal(resolvePlanKey('premium'), 'pro'); assert.equal(resolvePlanKey('pro-monthly'), 'pro'); assert.equal(resolvePlanKey('pro_monthly'), 'pro');
  assert.equal(resolvePlanKey('premium_plus'), 'pro_plus'); assert.equal(resolvePlanKey('pro-plus'), 'pro_plus'); assert.equal(resolvePlanKey('proplus'), 'pro_plus');
  assert.equal(resolvePlanKey('99'), null); assert.equal(resolvePlanKey('149'), null); assert.throws(() => strictPlanKey('149'), /invalid/);
});

test('migration adds billing stores and canonicalizes recognized legacy subscriptions without deleting them', () => {
  const input: any = { schemaVersion: 12, users: { user: { id: 'user', password: 'long-enough-password', subscription: 'premium_plus' } }, subscriptions: { old: { id: 'old', planId: 'pro-plus', status: 'active' } } };
  const result = applyPlatformMigration(input);
  assert.equal(result.toVersion, 13); assert.equal(input.users.user.subscription, 'pro_plus'); assert.equal(input.subscriptions.old.planId, 'pro_plus'); assert.ok(input.pendingPlanSelections); assert.ok(input.pendingCheckouts); assert.ok(input.processedPayments);
});

test('server-owned selection preserves Pro Plus and rejects account or tenant reuse', () => {
  const { db, context } = fixture(); const { token, selection } = createPlanSelection(db, { planKey: 'pro-plus', sourceTool: 'paraphraser', returnRoute: 'paraphrasing' });
  assert.equal(selection.planKey, 'pro_plus'); assert.equal(resolvePlanSelection(db, token)?.planKey, 'pro_plus');
  associatePlanSelection(db, token, { userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId });
  assert.throws(() => resolvePlanSelection(db, token, { userId: 'another@example.com' }), /another account/);
  assert.throws(() => resolvePlanSelection(db, token, { userId: context.user.id, tenantType: 'organization', tenantId: 'other' }), /another workspace/);
  db.pendingPlanSelections[selection.id].expiresAt = new Date(Date.now() - 1_000).toISOString();
  assert.equal(resolvePlanSelection(db, token), null); assert.equal(db.pendingPlanSelections[selection.id].status, 'expired');
});

test('coupon validation remains server-side and plan-scoped', () => {
  const { db } = fixture(); assert.deepEqual(validateCoupon(db.config, 'save10', 'pro'), { code: 'SAVE10', percentOff: 10 });
  assert.throws(() => validateCoupon(db.config, 'SAVE10', 'pro_plus'), /does not apply/); assert.throws(() => validateCoupon(db.config, 'invented', 'pro'), /invalid/);
});

test('checkout maps Pro to 9900 paise and ignores client amount', async () => {
  const { checkout, providerBody, db } = await pendingCheckout('pro');
  assert.equal(providerBody.amount, 9900); assert.equal(providerBody.currency, 'INR'); assert.equal(providerBody.notes.planKey, 'pro');
  assert.equal(checkout.amount, 9900); assert.equal(checkout.summary.planKey, 'pro'); assert.equal(db.pendingCheckouts.order_pro.amountMinor, 9900);
});

test('checkout maps Pro Plus to 14900 paise and can never silently resolve to Pro', async () => {
  const { checkout, providerBody, db } = await pendingCheckout('pro_plus');
  assert.equal(providerBody.amount, 14900); assert.equal(providerBody.notes.planKey, 'pro_plus'); assert.equal(checkout.summary.planName, 'Pro Plus'); assert.equal(checkout.summary.amountMinor, 14900); assert.equal(db.pendingCheckouts.order_pro_plus.planKey, 'pro_plus');
});

test('checkout rejects selection mismatch, free, contact sales, invalid interval and idempotency misuse', async () => {
  const { db, context } = fixture(); const pro = createPlanSelection(db, { planKey: 'pro' }, context);
  await assert.rejects(createCheckout(db, context, { planKey: 'pro_plus' }, providerOrder('unused', () => undefined), pro.token), /does not match/);
  const free = createPlanSelection(db, { planKey: 'free' }, context); await assert.rejects(createCheckout(db, context, { planKey: 'free' }, providerOrder('unused', () => undefined), free.token), /does not require/);
  const team = createPlanSelection(db, { planKey: 'team' }, context); await assert.rejects(createCheckout(db, context, { planKey: 'team' }, providerOrder('unused', () => undefined), team.token), /Contact Sales/);
  const annual = createPlanSelection(db, { planKey: 'pro' }, context); await assert.rejects(createCheckout(db, context, { planKey: 'pro', billingInterval: 'annual' }, providerOrder('unused', () => undefined), annual.token), /monthly billing/);
  const firstSelection = createPlanSelection(db, { planKey: 'pro' }, context); const first = await createCheckout(db, context, { planKey: 'pro', idempotencyKey: 'same-key' }, providerOrder('order_idempotent', () => undefined), firstSelection.token);
  const duplicate = await createCheckout(db, context, { planKey: 'pro', idempotencyKey: 'same-key' }, providerOrder('must_not_run', () => { throw new Error('provider called twice'); }), firstSelection.token);
  assert.equal(duplicate.orderId, first.orderId);
  const changedSelection = createPlanSelection(db, { planKey: 'pro_plus' }, context);
  await assert.rejects(createCheckout(db, context, { planKey: 'pro_plus', idempotencyKey: 'same-key' }, providerOrder('unused', () => undefined), changedSelection.token), /idempotency key/);
});

test('payment verification validates signature, order, amount, currency, user, tenant, plan and replay', async () => {
  const { db, context } = await pendingCheckout('pro_plus'); const paymentId = 'pay_verified';
  const signature = crypto.createHmac('sha256', 'test_secret').update(`order_pro_plus|${paymentId}`).digest('hex');
  const paymentFetcher: typeof fetch = (async () => new Response(JSON.stringify({ id: paymentId, order_id: 'order_pro_plus', amount: 14900, currency: 'INR', status: 'captured' }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as any;
  const result = await verifyCheckoutPayment(db, context, { razorpay_order_id: 'order_pro_plus', razorpay_payment_id: paymentId, razorpay_signature: signature, planKey: 'pro_plus' }, paymentFetcher);
  assert.equal(result.status, 'verification_pending'); assert.equal(db.pendingCheckouts.order_pro_plus.planKey, 'pro_plus');
  const duplicate = await verifyCheckoutPayment(db, context, { razorpay_order_id: 'order_pro_plus', razorpay_payment_id: paymentId, razorpay_signature: signature, planKey: 'pro_plus' }, paymentFetcher);
  assert.equal(duplicate.status, 'verification_pending');
  await assert.rejects(verifyCheckoutPayment(db, context, { razorpay_order_id: 'order_pro_plus', razorpay_payment_id: paymentId, razorpay_signature: signature, planKey: 'pro' }, paymentFetcher), /does not match/);
  const mismatch = await pendingCheckout('pro_plus'); const mismatchPayment = 'pay_mismatch'; const mismatchSignature = crypto.createHmac('sha256', 'test_secret').update(`order_pro_plus|${mismatchPayment}`).digest('hex'); const raw = { razorpay_order_id: 'order_pro_plus', razorpay_payment_id: mismatchPayment, razorpay_signature: mismatchSignature, planKey: 'pro_plus' };
  const wrongAmount: typeof fetch = (async () => new Response(JSON.stringify({ order_id: 'order_pro_plus', amount: 9900, currency: 'INR', status: 'captured' }), { status: 200 })) as any;
  await assert.rejects(verifyCheckoutPayment(mismatch.db, mismatch.context, raw, wrongAmount), /amount/);
  const wrongCurrency: typeof fetch = (async () => new Response(JSON.stringify({ order_id: 'order_pro_plus', amount: 14900, currency: 'USD', status: 'captured' }), { status: 200 })) as any;
  await assert.rejects(verifyCheckoutPayment(mismatch.db, mismatch.context, raw, wrongCurrency), /currency/);
  await assert.rejects(verifyCheckoutPayment(mismatch.db, mismatch.context, { ...raw, razorpay_signature: 'invalid' }, paymentFetcher), /signature/);
  await assert.rejects(verifyCheckoutPayment(mismatch.db, { ...mismatch.context, tenantId: 'other-workspace' }, raw, paymentFetcher), /another workspace/);
  await assert.rejects(verifyCheckoutPayment(mismatch.db, { ...mismatch.context, user: { ...mismatch.context.user, id: 'other@example.com' } }, raw, paymentFetcher), /another account/);
});

test('payment and webhook signatures use timing-safe server secrets', () => {
  const paymentSignature = crypto.createHmac('sha256', 'test_secret').update('order_1|pay_1').digest('hex'); assert.equal(verifyPaymentSignature('order_1', 'pay_1', paymentSignature), true); assert.equal(verifyPaymentSignature('order_1', 'pay_2', paymentSignature), false);
  const raw = JSON.stringify({ event: 'payment.captured' }); const webhookSignature = crypto.createHmac('sha256', 'webhook_secret').update(raw).digest('hex'); assert.equal(verifyWebhookSignature(raw, webhookSignature), true);
});

test('signed webhook activates the exact Pro Plus checkout idempotently and blocks mismatched amount', async () => {
  const { db } = await pendingCheckout('pro_plus');
  const payload = { event: 'payment.captured', created_at: 1_700_001_000, payload: { payment: { entity: { id: 'pay_1', order_id: 'order_pro_plus', amount: 14900, currency: 'INR', status: 'captured', invoice_id: 'inv_1', captured_at: 1_700_001_000, notes: { planKey: 'pro_plus' } } } } };
  const first = applyRazorpayWebhook(db, 'evt_1', payload); const second = applyRazorpayWebhook(db, 'evt_1', payload);
  assert.equal(first.subscription.planId, 'pro_plus'); assert.equal(first.subscription.status, 'active'); assert.equal(db.users['payer@example.com'].subscription, 'pro_plus'); assert.equal(db.invoices.inv_1.amount, 14900); assert.equal(second.duplicate, true);
  const mismatchFixture = await pendingCheckout('pro_plus'); const mismatch = structuredClone(payload); mismatch.payload.payment.entity.amount = 9900;
  assert.equal(applyRazorpayWebhook(mismatchFixture.db, 'evt_mismatch', mismatch).rejected, true); assert.equal(Object.keys(mismatchFixture.db.subscriptions).length, 0);
  const malformedFixture = await pendingCheckout('pro_plus'); const malformed = structuredClone(payload); malformed.payload.payment.entity.amount = 'not-a-number';
  assert.equal(applyRazorpayWebhook(malformedFixture.db, 'evt_malformed', malformed).rejected, true); assert.equal(Object.keys(malformedFixture.db.subscriptions).length, 0);
  const replayFixture = await pendingCheckout('pro_plus'); replayFixture.db.processedPayments.pay_1 = { providerOrderId: 'order_another' };
  assert.equal(applyRazorpayWebhook(replayFixture.db, 'evt_replay', payload).rejected, true); assert.equal(Object.keys(replayFixture.db.subscriptions).length, 0);
});

test('webhook ignores older cancellation and applies a later cancellation without rewriting plan history', async () => {
  const { db } = await pendingCheckout('pro'); const captured = { event: 'payment.captured', created_at: 2_000, payload: { payment: { entity: { id: 'pay_order', order_id: 'order_pro', amount: 9900, currency: 'INR', captured_at: 2_000, notes: { planKey: 'pro' } } } } };
  const active = applyRazorpayWebhook(db, 'captured', captured).subscription; active.providerSubscriptionId = 'provider_sub_1';
  const older = applyRazorpayWebhook(db, 'older_cancel', { event: 'subscription.cancelled', created_at: 1_000, payload: { subscription: { entity: { id: 'provider_sub_1', created_at: 1_000 } } } });
  assert.equal(older.outOfOrder, true); assert.equal(active.status, 'active');
  applyRazorpayWebhook(db, 'later_cancel', { event: 'subscription.cancelled', created_at: 3_000, payload: { subscription: { entity: { id: 'provider_sub_1', created_at: 3_000 } } } });
  assert.equal(active.status, 'canceled'); assert.equal(active.planId, 'pro');
});

test('failed payment webhooks update only the pending checkout', async () => {
  const { db } = await pendingCheckout('pro');
  const result = applyRazorpayWebhook(db, 'failed_payment', { event: 'payment.failed', created_at: 4_000, payload: { payment: { entity: { id: 'pay_failed', order_id: 'order_pro', amount: 9900, currency: 'INR', notes: { planKey: 'pro' } } } } });
  assert.equal(result.subscription, null); assert.equal(db.pendingCheckouts.order_pro.status, 'failed'); assert.equal(Object.keys(db.subscriptions).length, 0); assert.equal(db.users['payer@example.com'].subscription, 'free');
});

test('feature gates enforce minimum plan hierarchy and exclude insufficient upgrades', () => {
  const locked = resolveFeatureGate('paraphraser.premium_modes', 'free'); assert.equal(locked.minimumRequiredPlanKey, 'pro_plus'); assert.equal(locked.allowed, false); assert.ok(!locked.eligibleUpgradePlans.some(plan => plan.key === 'pro')); assert.ok(locked.eligibleUpgradePlans.some(plan => plan.key === 'pro_plus'));
  assert.equal(resolveFeatureGate('grammar.advanced', 'pro').allowed, true); assert.equal(resolveFeatureGate('chat.basic', 'free').allowed, true);
});

test('current-plan resolution preserves active cancellation periods and expires inactive access', () => {
  const active = fixture('pro');
  active.db.subscriptions.active = { id: 'active', tenantType: 'personal', tenantId: active.context.user.id, planId: 'pro_plus', status: 'active', currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(), cancelAtPeriodEnd: true, updatedAt: new Date().toISOString() };
  const activeContext = resolveTenantContext(active.db, active.token); const activeSummary = currentPlanSummary(activeContext, active.db);
  assert.equal(activeSummary.currentPlanKey, 'pro_plus'); assert.equal(activeSummary.subscriptionStatus, 'active'); assert.equal(activeSummary.cancelAtPeriodEnd, true);

  active.db.subscriptions.active.currentPeriodEnd = new Date(Date.now() - 1_000).toISOString();
  const expiredContext = resolveTenantContext(active.db, active.token); const expiredSummary = currentPlanSummary(expiredContext, active.db);
  assert.equal(expiredSummary.currentPlanKey, 'free'); assert.equal(expiredSummary.subscriptionStatus, 'expired');

  active.db.subscriptions.active.status = 'past_due'; active.db.subscriptions.active.updatedAt = new Date().toISOString();
  const pastDueContext = resolveTenantContext(active.db, active.token); const pastDueSummary = currentPlanSummary(pastDueContext, active.db);
  assert.equal(pastDueSummary.currentPlanKey, 'free'); assert.equal(pastDueSummary.subscriptionStatus, 'past_due');
});

test('Team and Enterprise submit through the stored Contact Sales flow only', () => {
  const { db } = fixture(); const { token } = createPlanSelection(db, { planKey: 'team', sourceTool: 'pricing' });
  const lead = createContactSalesLead(db, { planKey: 'team', name: 'Buyer', workEmail: 'buyer@company.com', company: 'Company', teamSize: '11–50', useCase: 'Governed writing workflows', message: '' }, token);
  assert.equal(lead.planKey, 'team'); assert.equal(db.contactSalesLeads[lead.id].status, 'received'); assert.throws(() => createContactSalesLead(db, { planKey: 'pro' }, token), /Team and Enterprise/);
});
