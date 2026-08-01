import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  activeBillingMode, applyRazorpayWebhook, billingCheckoutAvailability, cancelRecurringSubscription, createRecurringSubscription,
  paymentHistory, reconcileSubscriptions, subscriptionPlanIdFor, validateRazorpaySubscriptionPlan, verifyRecurringSubscription,
} from '../server/billing.js';
import { sendBillingLifecycleEmail } from '../server/authEmail.js';
import { applyPlatformMigration, createSession, resolveTenantContext } from '../server/platform.js';

const previous = Object.fromEntries(['PAYMENT_MODE', 'BILLING_MODE', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_PLAN_STARTER', 'RAZORPAY_PLAN_PRO', 'RAZORPAY_PLAN_BUSINESS_PRO', 'RESEND_API_KEY', 'AUTH_EMAIL_FROM', 'APP_ORIGIN'].map(key => [key, process.env[key]]));
Object.assign(process.env, {
  PAYMENT_MODE: 'test', BILLING_MODE: 'subscriptions', RAZORPAY_KEY_ID: 'rzp_test_subscription_key', RAZORPAY_KEY_SECRET: 'subscription_secret',
  RAZORPAY_WEBHOOK_SECRET: 'subscription_webhook_secret', RAZORPAY_PLAN_STARTER: 'plan_starter', RAZORPAY_PLAN_PRO: 'plan_pro',
  RAZORPAY_PLAN_BUSINESS_PRO: 'plan_business_pro',
});
test.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

function fixture() {
  const db: any = applyPlatformMigration({ users: { payer: { id: 'payer', email: 'payer@example.test', name: 'Payer', password: 'long-enough-password', subscription: 'free' } }, projects: { payer: [{ id: 'project-preserved' }] }, documents: { payer: [{ id: 'document-preserved' }] }, chats: {}, usage: {}, config: {} }).db;
  const { token } = createSession(db, 'payer');
  return { db, token, context: resolveTenantContext(db, token) };
}

const planAmount: Record<string, number> = { plan_starter: 9900, plan_pro: 14900, plan_business_pro: 49900 };
function provider(options: { planAmount?: number; planCurrency?: string; planPeriod?: string; planInterval?: number; subscriptionStatus?: string; subscriptionId?: string; currentStart?: number; currentEnd?: number } = {}): typeof fetch {
  return (async (input: any, init: any = {}) => {
    const url = String(input); const id = decodeURIComponent(url.split('/').at(-1) || '');
    if (url.includes('/plans/')) return new Response(JSON.stringify({ id, period: options.planPeriod || 'monthly', interval: options.planInterval ?? 1, active: true, item: { amount: options.planAmount ?? planAmount[id], currency: options.planCurrency || 'INR' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/subscriptions') && init.method === 'POST') { const body = JSON.parse(String(init.body)); return new Response(JSON.stringify({ id: options.subscriptionId || 'sub_created', plan_id: body.plan_id, status: options.subscriptionStatus || 'created' }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
    if (url.endsWith('/cancel')) { const subscriptionId = url.split('/').at(-2); return new Response(JSON.stringify({ id: subscriptionId, status: 'active', current_end: options.currentEnd || Math.floor(Date.now() / 1000) + 86_400 }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
    if (url.includes('/subscriptions/')) { const subscriptionId = url.split('/').at(-1); const planId = subscriptionId === 'sub_created' ? 'plan_starter' : 'plan_pro'; return new Response(JSON.stringify({ id: subscriptionId, plan_id: planId, status: options.subscriptionStatus || 'authenticated', current_start: options.currentStart, current_end: options.currentEnd }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
    return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
  }) as any;
}

test('subscription mode uses server-only plan mapping and fails closed when configuration is incomplete', async () => {
  assert.equal(activeBillingMode(), 'subscriptions');
  assert.equal(subscriptionPlanIdFor('pro'), 'plan_starter'); assert.equal(subscriptionPlanIdFor('pro_plus'), 'plan_pro'); assert.equal(subscriptionPlanIdFor('business-pro'), 'plan_business_pro');
  assert.deepEqual(billingCheckoutAvailability('postgres'), { available: true, reason: null, billingMode: 'subscriptions' });
  const configured = process.env.RAZORPAY_PLAN_STARTER; delete process.env.RAZORPAY_PLAN_STARTER;
  assert.deepEqual(billingCheckoutAvailability('postgres'), { available: false, reason: 'subscription_plans_not_configured' });
  process.env.RAZORPAY_PLAN_STARTER = configured;
});

test('provider plan validation rejects amount, currency and cadence mismatches', async () => {
  await assert.rejects(validateRazorpaySubscriptionPlan('pro', provider({ planAmount: 14900 })), (error: any) => error.code === 'SUBSCRIPTION_PLAN_MISMATCH');
  await assert.rejects(validateRazorpaySubscriptionPlan('pro', provider({ planCurrency: 'USD' })), (error: any) => error.code === 'SUBSCRIPTION_PLAN_MISMATCH');
  await assert.rejects(validateRazorpaySubscriptionPlan('pro', provider({ planPeriod: 'yearly' })), (error: any) => error.code === 'SUBSCRIPTION_PLAN_MISMATCH');
});

test('subscription creation rejects Free and unknown plans and returns safe server-created checkout fields', async () => {
  const { db, context } = fixture();
  await assert.rejects(createRecurringSubscription(db, context, { planKey: 'free' }, provider(), '', 'postgres'), (error: any) => error.code === 'SUBSCRIPTION_PLAN_INVALID');
  await assert.rejects(createRecurringSubscription(db, context, { planKey: 'invented' }, provider(), '', 'postgres'), (error: any) => error.code === 'PLAN_INVALID');
  const result = await createRecurringSubscription(db, context, { planKey: 'pro', providerPlanId: 'browser_override', amount: 1 }, provider(), '', 'postgres');
  assert.deepEqual({ planKey: result.checkout.planKey, amount: result.checkout.amount, currency: result.checkout.currency, subscriptionId: result.checkout.subscriptionId }, { planKey: 'pro', amount: 9900, currency: 'INR', subscriptionId: 'sub_created' });
  assert.doesNotMatch(JSON.stringify(result), /subscription_secret|subscription_webhook_secret|browser_override/);
  const repeated = await createRecurringSubscription(db, context, { planKey: 'pro' }, (() => { throw new Error('provider must not run'); }) as any, '', 'postgres');
  assert.equal(repeated.duplicate, true); assert.equal(Object.values(db.subscriptions).length, 1);
});

test('Checkout signature alone records authentication but cannot activate access', async () => {
  const { db, context } = fixture(); await createRecurringSubscription(db, context, { planKey: 'pro' }, provider(), '', 'postgres');
  const paymentId = 'pay_authenticated'; const signature = crypto.createHmac('sha256', 'subscription_secret').update(`${paymentId}|sub_created`).digest('hex');
  await assert.rejects(verifyRecurringSubscription(db, context, { razorpay_subscription_id: 'sub_created', razorpay_payment_id: paymentId, razorpay_signature: 'invalid' }, provider()), (error: any) => error.code === 'SUBSCRIPTION_SIGNATURE_INVALID');
  const verified = await verifyRecurringSubscription(db, context, { razorpay_subscription_id: 'sub_created', razorpay_payment_id: paymentId, razorpay_signature: signature }, provider({ subscriptionStatus: 'authenticated' }));
  assert.equal(verified.active, false); assert.equal(verified.status, 'authenticated');
  assert.equal(db.users.payer.subscription, 'free');
});

test('verified active provider state activates only the configured plan', async () => {
  const { db, context, token } = fixture(); await createRecurringSubscription(db, context, { planKey: 'pro' }, provider(), '', 'postgres');
  const paymentId = 'pay_active'; const signature = crypto.createHmac('sha256', 'subscription_secret').update(`${paymentId}|sub_created`).digest('hex');
  const start = Math.floor(Date.now() / 1000); const end = start + 2_592_000;
  const verified = await verifyRecurringSubscription(db, context, { razorpay_subscription_id: 'sub_created', razorpay_payment_id: paymentId, razorpay_signature: signature }, provider({ subscriptionStatus: 'active', currentStart: start, currentEnd: end }));
  assert.equal(verified.active, true); assert.equal(resolveTenantContext(db, token).planId, 'pro');
});

function recurringRecord(db: any, planId = 'business-pro') {
  const now = new Date().toISOString();
  const record: any = { id: 'internal_sub', userId: 'payer', tenantType: 'personal', tenantId: 'payer', workspaceId: 'personal_payer', internalPlanKey: planId, planId, billingMode: 'recurring_subscription', provider: 'razorpay', providerPlanId: planId === 'business-pro' ? 'plan_business_pro' : 'plan_pro', providerSubscriptionId: 'provider_sub', status: 'created', quantity: 1, billingInterval: 'monthly', amountMinor: planId === 'business-pro' ? 49900 : 14900, currency: 'INR', currentPeriodStart: null, currentPeriodEnd: null, nextChargeAt: null, activatedAt: null, latestPaymentId: null, createdAt: now, updatedAt: now };
  db.subscriptions[record.id] = record; return record;
}

test('webhook activation, renewal and duplicate delivery are idempotent and preserve event metadata only', () => {
  const { db, token } = fixture(); const record = recurringRecord(db); const start = Math.floor(Date.now() / 1000); const end = start + 2_592_000;
  const activated = { event: 'subscription.activated', created_at: start, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_business_pro', status: 'active', current_start: start, current_end: end, charge_at: end } } } };
  applyRazorpayWebhook(db, 'event_activate', activated, 'hash_activate');
  assert.equal(record.status, 'active'); assert.equal(resolveTenantContext(db, token).planId, 'business-pro'); assert.equal(db.subscriptionEvents.event_activate.payloadHash, 'hash_activate'); assert.equal((db.subscriptionEvents.event_activate as any).payload, undefined);
  const charged = { event: 'subscription.charged', created_at: end, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_business_pro', status: 'active', current_start: end, current_end: end + 2_592_000 } }, payment: { entity: { id: 'pay_renewal', status: 'captured', amount: 49900, currency: 'INR', created_at: end } } } };
  const first = applyRazorpayWebhook(db, 'event_charge', charged); const duplicateEvent = applyRazorpayWebhook(db, 'event_charge', charged); const duplicatePayment = applyRazorpayWebhook(db, 'event_charge_retry', charged);
  assert.equal(first.duplicate, false); assert.equal(duplicateEvent.duplicate, true); assert.equal(duplicatePayment.duplicate, true); assert.equal(Object.keys(db.subscriptionPayments).length, 1);
  assert.equal(db.subscriptionPayments.pay_renewal.billingType, 'initial_subscription_payment'); assert.equal(db.subscriptionPayments.pay_renewal.billingEnvironment, 'test'); assert.equal(db.subscriptionPayments.pay_renewal.signatureVerified, true);
  const renewed = { event: 'subscription.charged', created_at: end + 2_592_000, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_business_pro', status: 'active', current_start: end + 2_592_000, current_end: end + 5_184_000 } }, payment: { entity: { id: 'pay_renewal_2', status: 'captured', amount: 49900, currency: 'INR', created_at: end + 2_592_000 } } } };
  applyRazorpayWebhook(db, 'event_charge_2', renewed); assert.equal(db.subscriptionPayments.pay_renewal_2.billingType, 'recurring_renewal'); assert.equal(paymentHistory(db, resolveTenantContext(db, token)).length, 2);
});

test('out-of-order, pending, halted, pause, resume and cancellation states preserve only confirmed paid access', () => {
  const { db, token } = fixture(); const record = recurringRecord(db, 'pro_plus'); const now = Math.floor(Date.now() / 1000); const end = now + 86_400;
  applyRazorpayWebhook(db, 'activate', { event: 'subscription.activated', created_at: now, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_start: now, current_end: end } } } });
  const older = applyRazorpayWebhook(db, 'older_pending', { event: 'subscription.pending', created_at: now - 10, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_end: end - 10 } } } });
  assert.equal(older.outOfOrder, true); assert.equal(record.status, 'active');
  applyRazorpayWebhook(db, 'pending', { event: 'subscription.pending', created_at: now + 1, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_end: end } } } }); assert.equal(resolveTenantContext(db, token).planId, 'pro_plus');
  applyRazorpayWebhook(db, 'halted', { event: 'subscription.halted', created_at: now + 2, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_end: end } } } }); assert.equal(resolveTenantContext(db, token).planId, 'pro_plus');
  applyRazorpayWebhook(db, 'paused', { event: 'subscription.paused', created_at: now + 3, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_end: end } } } }); assert.equal(resolveTenantContext(db, token).planId, 'pro_plus');
  applyRazorpayWebhook(db, 'resumed', { event: 'subscription.resumed', created_at: now + 4, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_end: end } } } }); assert.equal(record.status, 'active');
  applyRazorpayWebhook(db, 'cancelled', { event: 'subscription.cancelled', created_at: now + 5, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', current_end: end, cancel_at_cycle_end: true } } } }); assert.equal(resolveTenantContext(db, token).planId, 'pro_plus'); assert.equal(record.cancelAtPeriodEnd, true);
  applyRazorpayWebhook(db, 'cancelled_immediate', { event: 'subscription.cancelled', created_at: now + 6, payload: { subscription: { entity: { id: 'provider_sub', plan_id: 'plan_pro', ended_at: now - 1, cancel_at_cycle_end: false } } } }); assert.equal(resolveTenantContext(db, token).planId, 'free');
  assert.equal(db.projects.payer[0].id, 'project-preserved'); assert.equal(db.documents.payer[0].id, 'document-preserved');
});

test('one-time and recurring access choose the highest currently valid entitlement', () => {
  const { db, token } = fixture(); const future = new Date(Date.now() + 86_400_000).toISOString();
  db.subscriptions.oneTime = { id: 'oneTime', userId: 'payer', tenantType: 'personal', tenantId: 'payer', planId: 'pro_plus', billingMode: 'one_time_monthly', status: 'active', sourcePaymentId: 'pay_one', currentPeriodEnd: future, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const recurring = recurringRecord(db, 'pro'); Object.assign(recurring, { status: 'active', activatedAt: new Date().toISOString(), currentPeriodEnd: future });
  assert.equal(resolveTenantContext(db, token).planId, 'pro_plus');
  recurring.planId = 'business-pro'; recurring.internalPlanKey = 'business-pro'; assert.equal(resolveTenantContext(db, token).planId, 'business-pro');
});

test('cancel-at-cycle-end is owner-scoped, confirmation-gated and keeps the paid period', async () => {
  const { db, context, token } = fixture(); const record = recurringRecord(db, 'pro_plus'); Object.assign(record, { status: 'active', activatedAt: new Date().toISOString(), currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString() });
  await assert.rejects(cancelRecurringSubscription(db, context, record.id, { confirm: false }, provider()), (error: any) => error.code === 'CANCELLATION_CONFIRMATION_REQUIRED');
  const result = await cancelRecurringSubscription(db, context, record.id, { confirm: true }, provider({ currentEnd: Math.floor(Date.now() / 1000) + 86_400 }));
  assert.equal(result.subscription.cancelAtPeriodEnd, true); assert.equal(resolveTenantContext(db, token).planId, 'pro_plus');
});

test('reconciliation repairs missed provider state idempotently', async () => {
  const { db, token } = fixture(); const record = recurringRecord(db, 'pro_plus'); const start = Math.floor(Date.now() / 1000); const end = start + 86_400;
  record.providerSubscriptionId = 'provider_sub'; const first = await reconcileSubscriptions(db, provider({ subscriptionStatus: 'active', currentStart: start, currentEnd: end })); const second = await reconcileSubscriptions(db, provider({ subscriptionStatus: 'active', currentStart: start, currentEnd: end }));
  assert.equal(first.repaired, 1); assert.equal(second.repaired, 1); assert.equal(resolveTenantContext(db, token).planId, 'pro_plus'); assert.equal(Object.values(db.subscriptionEvents).filter((event: any) => event.eventType === 'subscription.reconciled').length, 1);
  assert.equal(Object.keys(db.billingReconciliationRuns).length, 2); assert.equal(Object.values(db.billingReconciliationRuns).every((run: any) => run.status === 'completed' && run.billingEnvironment === 'test'), true);
});

test('email delivery failure never throws into subscription processing', async () => {
  Object.assign(process.env, { RESEND_API_KEY: 'test_resend', AUTH_EMAIL_FROM: 'billing@example.test', APP_ORIGIN: 'https://example.test' });
  const result = await sendBillingLifecycleEmail({ email: 'payer@example.test', name: 'Payer' }, 'renewal_successful', (async () => new Response('{}', { status: 503 })) as any);
  assert.deepEqual(result, { delivered: false, reason: 'delivery_failed' });
});
