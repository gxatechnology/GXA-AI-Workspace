import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.PERSISTENCE_PROVIDER = 'memory';
process.env.PAYMENT_MODE = 'test';
process.env.BILLING_MODE = 'orders';
process.env.RAZORPAY_KEY_ID = 'rzp_test_api_key';
process.env.RAZORPAY_KEY_SECRET = 'api_test_secret';
delete process.env.DATABASE_URL;

const { default: app } = await import('../server.js');

test('billing mutation endpoints require an authenticated HttpOnly session', async () => {
  const checkout = await request(app).post('/api/billing/checkout').send({ planKey: 'pro', amount: 1 }).expect(401);
  assert.equal(checkout.body.code, 'AUTHENTICATION_REQUIRED');
  const verification = await request(app).post('/api/billing/verify').send({ razorpay_order_id: 'order_other', razorpay_payment_id: 'pay_other', razorpay_signature: 'signature' }).expect(401);
  assert.equal(verification.body.code, 'AUTHENTICATION_REQUIRED');
  const subscription = await request(app).post('/api/billing/subscriptions').send({ planKey: 'pro' }).expect(401);
  assert.equal(subscription.body.code, 'AUTHENTICATION_REQUIRED');
  const subscriptionVerification = await request(app).post('/api/billing/subscriptions/verify').send({ razorpay_subscription_id: 'sub_other' }).expect(401);
  assert.equal(subscriptionVerification.body.code, 'AUTHENTICATION_REQUIRED');
  const cancellation = await request(app).post('/api/billing/subscriptions/sub_other/cancel').send({ confirm: true }).expect(401);
  assert.equal(cancellation.body.code, 'AUTHENTICATION_REQUIRED');
});

test('canonical Razorpay webhook requires a verified raw-body signature', async () => {
  const response = await request(app).post('/api/webhooks/razorpay').set('x-razorpay-event-id', 'event_unsigned').send({ event: 'subscription.activated' }).expect(401);
  assert.equal(response.body.code, 'WEBHOOK_SIGNATURE_INVALID');
});

test('public pricing remains available without PostgreSQL or an enabled checkout', async () => {
  const response = await request(app).get('/api/pricing/plans').expect(200);
  assert.deepEqual(response.body.plans.map((plan: any) => [plan.name, plan.monthlyPrice]), [['Free', 0], ['Starter', 99], ['Pro', 149], ['Business Pro', 499]]);
  assert.equal(response.body.provider, null);
  assert.deepEqual(response.body.checkoutAvailability, { available: false, reason: 'durable_billing_storage_required' });
  assert.doesNotMatch(JSON.stringify(response.body), /api_test_secret/);
});
