import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { applyRazorpayWebhook, createCheckout, publicPlans, validateCoupon, verifyPaymentSignature, verifyWebhookSignature } from '../server/billing.js';
import { applyPlatformMigration, createSession, resolveTenantContext } from '../server/platform.js';

function fixture() {
  const db: any = applyPlatformMigration({ users: { 'payer@example.com': { id: 'payer@example.com', email: 'payer@example.com', name: 'Payer', password: 'long-enough-password', subscription: 'free' } }, projects: {}, documents: {}, chats: {}, usage: {}, config: { coupons: [{ code: 'SAVE10', percentOff: 10, plans: ['pro'], active: true }] } }).db;
  const { token } = createSession(db, 'payer@example.com');
  return { db, context: resolveTenantContext(db, token) };
}

test('public plan registry exposes only approved INR defaults', () => {
  const plans = publicPlans();
  assert.deepEqual(plans.map(plan => [plan.id, plan.monthlyPrice, plan.currency]), [['free', 0, 'INR'], ['pro', 99, 'INR'], ['pro_plus', 149, 'INR'], ['team', null, 'INR'], ['enterprise', null, 'INR']]);
});

test('coupon validation is server-side and plan-scoped', () => {
  const { db } = fixture();
  assert.deepEqual(validateCoupon(db.config, 'save10', 'pro'), { code: 'SAVE10', percentOff: 10 });
  assert.throws(() => validateCoupon(db.config, 'SAVE10', 'pro_plus'), /does not apply/);
  assert.throws(() => validateCoupon(db.config, 'invented', 'pro'), /invalid/);
});

test('checkout amount and tenant metadata are created by the backend', async () => {
  const previous = { key: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET, webhook: process.env.RAZORPAY_WEBHOOK_SECRET };
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'; process.env.RAZORPAY_KEY_SECRET = 'test_secret'; process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret';
  try {
    const { db, context } = fixture(); let providerRequest: any;
    const fetcher: typeof fetch = (async (_url: any, init: any) => { providerRequest = JSON.parse(String(init.body)); return new Response(JSON.stringify({ id: 'order_verified', amount: providerRequest.amount }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }) as any;
    const checkout = await createCheckout(db, context, { planId: 'pro', couponCode: 'SAVE10', idempotencyKey: 'checkout-1' }, fetcher);
    assert.equal(providerRequest.amount, 8900);
    assert.equal(providerRequest.currency, 'INR');
    assert.equal(providerRequest.notes.tenantId, 'payer@example.com');
    assert.equal(checkout.amount, 8900);
    assert.equal(Object.values<any>(db.idempotencyRecords)[0].id, 'order_verified');
  } finally {
    if (previous.key === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previous.key;
    if (previous.secret === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previous.secret;
    if (previous.webhook === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = previous.webhook;
  }
});

test('payment and webhook signatures are verified and provider events are idempotent', () => {
  const oldPayment = process.env.RAZORPAY_KEY_SECRET; const oldWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_SECRET = 'payment-secret'; process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-secret';
  try {
    const paymentSignature = crypto.createHmac('sha256', 'payment-secret').update('order_1|pay_1').digest('hex');
    assert.equal(verifyPaymentSignature('order_1', 'pay_1', paymentSignature), true);
    assert.equal(verifyPaymentSignature('order_1', 'pay_2', paymentSignature), false);
    const raw = JSON.stringify({ event: 'payment.captured' });
    const webhookSignature = crypto.createHmac('sha256', 'webhook-secret').update(raw).digest('hex');
    assert.equal(verifyWebhookSignature(raw, webhookSignature), true);

    const { db } = fixture();
    const payload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', amount: 9900, currency: 'INR', status: 'captured', invoice_id: 'inv_1', captured_at: 1_700_000_000, notes: { tenantType: 'personal', tenantId: 'payer@example.com', planId: 'pro', interval: 'monthly' } } } } };
    const first = applyRazorpayWebhook(db, 'evt_1', payload);
    const second = applyRazorpayWebhook(db, 'evt_1', payload);
    assert.equal(first.subscription.status, 'active');
    assert.equal(db.users['payer@example.com'].subscription, 'pro');
    assert.equal(db.invoices.inv_1.amount, 9900);
    assert.equal(second.duplicate, true);
    assert.equal(Object.values(db.subscriptions).length, 1);
  } finally {
    if (oldPayment === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = oldPayment;
    if (oldWebhook === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = oldWebhook;
  }
});
