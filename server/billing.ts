import crypto from 'crypto';
import { PLAN_REGISTRY, PlanId } from '../shared/platformRegistry.js';
import { audit, AuthorizationError, PlatformError, TenantContext, nowIso } from './platform.js';

export class BillingError extends PlatformError {
  constructor(message: string, status = 400, code = 'BILLING_ERROR') { super(message, status, code); }
}
export const publicPlans = () => Object.values(PLAN_REGISTRY).filter(plan => plan.active && plan.public).sort((a, b) => a.sortOrder - b.sortOrder).map(plan => ({ ...plan, entitlements: [...plan.entitlements], limits: { ...plan.limits } }));

export function canManageBilling(context: TenantContext) {
  return context.tenantType === 'personal' || context.permissions.includes('billing.manage');
}

export function validateCoupon(config: any, code: unknown, planId: PlanId) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  const coupon = (Array.isArray(config.coupons) ? config.coupons : []).find((item: any) => String(item.code || '').trim().toUpperCase() === normalized && item.active !== false);
  if (!coupon) throw new BillingError('Coupon is invalid or unavailable.', 400, 'COUPON_INVALID');
  if (coupon.startsAt && Date.parse(coupon.startsAt) > Date.now()) throw new BillingError('Coupon is not active yet.', 400, 'COUPON_INACTIVE');
  if (coupon.endsAt && Date.parse(coupon.endsAt) <= Date.now()) throw new BillingError('Coupon has expired.', 400, 'COUPON_EXPIRED');
  if (Array.isArray(coupon.plans) && !coupon.plans.includes(planId)) throw new BillingError('Coupon does not apply to this plan.', 400, 'COUPON_PLAN_MISMATCH');
  const discount = Math.max(0, Math.min(100, Number(coupon.percentOff ?? String(coupon.discount || '').replace('%', ''))));
  if (!Number.isFinite(discount) || discount <= 0) throw new BillingError('Coupon configuration is invalid.', 500, 'COUPON_CONFIGURATION');
  return { code: normalized, percentOff: discount };
}

export function razorpayConfigured() { return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET); }

export async function createCheckout(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch) {
  if (!canManageBilling(context)) throw new AuthorizationError('Billing management permission required.');
  const planId = String(raw.planId || '') as PlanId; const plan = PLAN_REGISTRY[planId];
  if (!plan || !plan.active || !plan.public) throw new BillingError('Selected plan is unavailable.', 404, 'PLAN_NOT_FOUND');
  if (plan.billingType === 'contact') throw new BillingError('Contact Sales to configure this plan.', 409, 'CONTACT_SALES_REQUIRED');
  if (plan.billingType === 'free') throw new BillingError('The Free plan does not require checkout.', 400, 'CHECKOUT_NOT_REQUIRED');
  if (!razorpayConfigured()) throw new BillingError('Payments are not configured on this deployment.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  const interval = raw.interval === 'annual' ? 'annual' : 'monthly'; const base = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  if (base === null) throw new BillingError('Selected plan has no checkout price.', 400, 'PRICE_UNAVAILABLE');
  const coupon = validateCoupon(db.config, raw.couponCode, planId); const amountRupees = Math.max(1, Math.round(base * (coupon ? (100 - coupon.percentOff) / 100 : 1))); const receipt = `gxa_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetcher('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json', 'Idempotency-Key': String(raw.idempotencyKey || receipt) }, body: JSON.stringify({ amount: amountRupees * 100, currency: 'INR', receipt, notes: { tenantType: context.tenantType, tenantId: context.tenantId, userId: context.user.id, planId, interval, coupon: coupon?.code || '' } }) });
  const body: any = await response.json().catch(() => ({})); if (!response.ok || !body.id) throw new BillingError('Payment provider could not create checkout.', 502, 'PAYMENT_PROVIDER_ERROR');
  db.idempotencyRecords[`checkout:${raw.idempotencyKey || receipt}`] = { id: body.id, tenantId: context.tenantId, planId, status: 'created', createdAt: nowIso() };
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'checkout.created', resourceType: 'razorpay_order', resourceId: body.id, metadata: { planId, interval, amount: amountRupees, currency: 'INR' } });
  return { provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, orderId: body.id, amount: body.amount, currency: 'INR', planId, interval, coupon: coupon?.code || null };
}

const safeEqual = (a: string, b: string) => { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && crypto.timingSafeEqual(left, right); };
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) { if (!process.env.RAZORPAY_KEY_SECRET) return false; return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex'), signature); }
export function verifyWebhookSignature(rawBody: string, signature: string) { if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false; return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex'), signature); }

export function applyRazorpayWebhook(db: any, eventId: string, payload: any) {
  const idempotencyKey = `razorpay:webhook:${eventId}`; if (db.idempotencyRecords[idempotencyKey]) return { duplicate: true, subscription: null };
  const event = String(payload.event || ''); const payment = payload.payload?.payment?.entity; const subscriptionEntity = payload.payload?.subscription?.entity; const order = payload.payload?.order?.entity; const notes = payment?.notes || subscriptionEntity?.notes || order?.notes || {};
  const tenantType = notes.tenantType === 'organization' ? 'organization' : 'personal'; const tenantId = String(notes.tenantId || ''); const planId = String(notes.planId || '') as PlanId;
  db.idempotencyRecords[idempotencyKey] = { event, receivedAt: nowIso() };
  if (!tenantId || !PLAN_REGISTRY[planId]) return { duplicate: false, subscription: null };
  const existing = Object.values<any>(db.subscriptions).find(item => item.tenantType === tenantType && item.tenantId === tenantId);
  const statusMap: Record<string, string> = { 'payment.captured': 'active', 'subscription.activated': 'active', 'subscription.charged': 'active', 'payment.failed': 'past_due', 'subscription.pending': 'incomplete', 'subscription.paused': 'paused', 'subscription.cancelled': 'canceled' };
  const status = statusMap[event]; if (!status) return { duplicate: false, subscription: existing || null };
  const subscription = existing || { id: `sub_${crypto.randomUUID()}`, tenantType, tenantId, provider: 'razorpay', createdAt: nowIso() };
  Object.assign(subscription, { providerCustomerId: subscriptionEntity?.customer_id || subscription.providerCustomerId || null, providerSubscriptionId: subscriptionEntity?.id || subscription.providerSubscriptionId || null, planId, status, billingInterval: notes.interval || subscription.billingInterval || 'monthly', currentPeriodStart: subscriptionEntity?.current_start ? new Date(subscriptionEntity.current_start * 1000).toISOString() : subscription.currentPeriodStart || null, currentPeriodEnd: subscriptionEntity?.current_end ? new Date(subscriptionEntity.current_end * 1000).toISOString() : subscription.currentPeriodEnd || null, cancelAtPeriodEnd: Boolean(subscriptionEntity?.cancel_at_cycle_end), updatedAt: nowIso() });
  db.subscriptions[subscription.id] = subscription;
  if (tenantType === 'personal' && db.users[tenantId]) db.users[tenantId].subscription = planId; else if (tenantType === 'organization' && db.organizations[tenantId]) db.organizations[tenantId].planId = planId;
  if (payment?.invoice_id) { db.invoices ||= {}; db.invoices[payment.invoice_id] = { id: payment.invoice_id, tenantType, tenantId, provider: 'razorpay', amount: payment.amount, currency: payment.currency || 'INR', status: payment.status, paidAt: payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : null, createdAt: nowIso() }; }
  audit(db, { tenantId, actorId: 'razorpay', actorType: 'provider', action: `billing.${event}`, resourceType: 'subscription', resourceId: subscription.id, metadata: { status, planId } }); return { duplicate: false, subscription };
}
