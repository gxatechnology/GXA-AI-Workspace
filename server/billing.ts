import crypto from 'crypto';
import os from 'os';
import path from 'path';
import {
  FEATURE_PLAN_REQUIREMENTS, PLAN_FEATURE_LABELS, PLAN_REGISTRY, FeatureKey, PlanDefinition, PlanId,
  minimumPlanForFeature, planIncludesFeature, resolvePlanKey,
} from '../shared/platformRegistry.js';
import { audit, AuthorizationError, PlatformError, TenantContext, nowIso, resolvePlanState } from './platform.js';

export class BillingError extends PlatformError {
  constructor(message: string, status = 400, code = 'BILLING_ERROR') { super(message, status, code); }
}

const SELECTION_TTL_MS = 45 * 60_000;
const CHECKOUT_TTL_MS = 2 * 60 * 60_000;
const safeText = (value: unknown, maximum = 160) => String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, maximum);
const safeEqual = (a: string, b: string) => { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && crypto.timingSafeEqual(left, right); };
const tokenHash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export function strictPlanKey(value: unknown): PlanId {
  const key = resolvePlanKey(value);
  if (!key) throw new BillingError('Selected plan is invalid.', 400, 'PLAN_INVALID');
  const plan = PLAN_REGISTRY[key];
  if (!plan.active || !plan.public) throw new BillingError('Selected plan is unavailable.', 404, 'PLAN_NOT_FOUND');
  return key;
}

export function publicPlan(plan: PlanDefinition) {
  const monthlyPrice = plan.monthlyPriceMinor === null ? null : plan.monthlyPriceMinor / 100;
  return {
    id: plan.key, key: plan.key, name: plan.name, displayName: plan.displayName, description: plan.description,
    currency: plan.currency, monthlyPrice, displayPrice: plan.key === 'team' ? 'Contact Sales' : plan.key === 'enterprise' ? 'Custom Pricing' : `₹${monthlyPrice}`,
    billingLabel: plan.billingType === 'fixed' ? '/month' : plan.billingType === 'free' ? 'Free' : '',
    billingType: plan.billingType, billingIntervals: [...plan.billingIntervals], contactSales: plan.contactSales,
    recommended: plan.recommended, rank: plan.rank, features: plan.entitlements.map(key => PLAN_FEATURE_LABELS[key]),
    entitlements: [...plan.entitlements], limits: { ...plan.limits },
  };
}

export const publicPlans = () => Object.values(PLAN_REGISTRY)
  .filter(plan => plan.active && plan.public)
  .sort((a, b) => a.rank - b.rank)
  .map(publicPlan);

export function canManageBilling(context: TenantContext) {
  return context.tenantType === 'personal' || context.permissions.includes('billing.manage');
}

export function recordBillingEvent(db: any, event: string, metadata: Record<string, unknown> = {}) {
  const allowedEvents = new Set(['pricing_page_viewed', 'upgrade_modal_opened', 'plan_selected', 'checkout_started', 'checkout_failed', 'payment_verification_started', 'subscription_activated', 'contact_sales_clicked', 'pricing_api_failed', 'plan_mismatch_blocked']);
  if (!allowedEvents.has(event)) return null;
  const allowedMetadata = ['planKey', 'sourceTool', 'currentPlan', 'authenticated', 'featureKey', 'reason', 'tenantType'];
  const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([key]) => allowedMetadata.includes(key)).map(([key, value]) => [key, typeof value === 'boolean' ? value : safeText(value, 80)]));
  const entry = { id: `bill_evt_${crypto.randomUUID()}`, event, metadata: safeMetadata, createdAt: nowIso() };
  db.billingEvents ||= [];
  db.billingEvents.push(entry);
  if (db.billingEvents.length > 5000) db.billingEvents.splice(0, db.billingEvents.length - 5000);
  return entry;
}

export function createPlanSelection(db: any, raw: any, context?: TenantContext | null) {
  const planKey = strictPlanKey(raw?.planKey ?? raw?.planId);
  const token = `gxa_plan_${crypto.randomBytes(32).toString('base64url')}`;
  const selection = {
    id: `plan_sel_${crypto.randomUUID()}`, tokenHash: tokenHash(token), planKey,
    sourceTool: safeText(raw?.sourceTool || 'pricing', 80), returnRoute: safeText(raw?.returnRoute || 'pricing', 80).replace(/[^a-z0-9_-]/gi, '') || 'pricing',
    userId: context?.user.id || null, tenantType: context?.tenantType || null, tenantId: context?.tenantId || null,
    status: 'selected', createdAt: nowIso(), expiresAt: new Date(Date.now() + SELECTION_TTL_MS).toISOString(), updatedAt: nowIso(),
  };
  db.pendingPlanSelections ||= {};
  db.pendingPlanSelections[selection.id] = selection;
  recordBillingEvent(db, 'plan_selected', { planKey, sourceTool: selection.sourceTool, currentPlan: context?.planId || 'free', authenticated: Boolean(context) });
  return { token, selection: publicSelection(selection) };
}

export function publicSelection(selection: any) {
  return selection ? { id: selection.id, planKey: selection.planKey, sourceTool: selection.sourceTool, returnRoute: selection.returnRoute, status: selection.status, expiresAt: selection.expiresAt } : null;
}

export function resolvePlanSelection(db: any, token: string, identity?: { userId?: string; tenantType?: string; tenantId?: string }, required = false) {
  const hash = token ? tokenHash(token) : '';
  const selection = hash ? Object.values<any>(db.pendingPlanSelections || {}).find(item => item.tokenHash === hash) : null;
  if (!selection || selection.status !== 'selected' || Date.parse(selection.expiresAt) <= Date.now()) {
    if (selection && selection.status === 'selected') selection.status = 'expired';
    if (required) throw new BillingError('Your plan selection expired. Choose the plan again.', 409, 'PLAN_SELECTION_REQUIRED');
    return null;
  }
  if (selection.userId && identity?.userId && selection.userId !== identity.userId) throw new BillingError('This plan selection belongs to another account.', 403, 'PLAN_SELECTION_OWNER_MISMATCH');
  if (selection.tenantId && identity?.tenantId && (selection.tenantId !== identity.tenantId || selection.tenantType !== identity.tenantType)) throw new BillingError('This plan selection belongs to another workspace.', 403, 'PLAN_SELECTION_TENANT_MISMATCH');
  return selection;
}

export function associatePlanSelection(db: any, token: string, context: { userId: string; tenantType?: string; tenantId?: string }) {
  const selection = resolvePlanSelection(db, token, { userId: context.userId }, false);
  if (!selection) return null;
  if (selection.userId && selection.userId !== context.userId) throw new BillingError('This plan selection belongs to another account.', 403, 'PLAN_SELECTION_OWNER_MISMATCH');
  selection.userId = context.userId;
  selection.tenantType = context.tenantType || 'personal';
  selection.tenantId = context.tenantId || context.userId;
  selection.updatedAt = nowIso();
  return publicSelection(selection);
}

export function currentPlanSummary(context: TenantContext, db?: any) {
  const state = db ? resolvePlanState(db, context.tenantType, context.tenantId, context.user) : { planId: context.planId, subscription: null, status: context.planId === 'free' ? 'free' : 'active' };
  const plan = PLAN_REGISTRY[state.planId];
  const subscription = state.subscription;
  return {
    plan: publicPlan(plan), currentPlanKey: plan.key, subscriptionStatus: state.status,
    currentPeriodStart: subscription?.currentPeriodStart || null, currentPeriodEnd: subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    entitlements: Object.fromEntries(Object.keys(FEATURE_PLAN_REQUIREMENTS).map(featureKey => [featureKey, planIncludesFeature(plan.key, featureKey)])),
    limits: { ...context.limits },
  };
}

export function resolveFeatureGate(featureKey: string, currentPlanKey: PlanId) {
  const minimumRequiredPlanKey = minimumPlanForFeature(featureKey);
  if (!minimumRequiredPlanKey) throw new BillingError('Feature configuration was not found.', 404, 'FEATURE_NOT_FOUND');
  const allowed = planIncludesFeature(currentPlanKey, featureKey);
  const currentRank = PLAN_REGISTRY[currentPlanKey].rank;
  const minimumRank = PLAN_REGISTRY[minimumRequiredPlanKey].rank;
  const eligibleUpgradePlans = Object.values(PLAN_REGISTRY).filter(plan => plan.active && plan.public && plan.rank >= minimumRank && plan.rank > currentRank).sort((a, b) => a.rank - b.rank).map(publicPlan);
  return { featureKey: featureKey as FeatureKey, allowed, currentPlanKey, minimumRequiredPlanKey, eligibleUpgradePlans, reason: allowed ? 'included' : 'plan_upgrade_required' };
}

export function validateCoupon(config: any, code: unknown, planId: PlanId) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  const coupon = (Array.isArray(config.coupons) ? config.coupons : []).find((item: any) => String(item.code || '').trim().toUpperCase() === normalized && item.active !== false);
  if (!coupon) throw new BillingError('Coupon is invalid or unavailable.', 400, 'COUPON_INVALID');
  if (coupon.startsAt && Date.parse(coupon.startsAt) > Date.now()) throw new BillingError('Coupon is not active yet.', 400, 'COUPON_INACTIVE');
  if (coupon.endsAt && Date.parse(coupon.endsAt) <= Date.now()) throw new BillingError('Coupon has expired.', 400, 'COUPON_EXPIRED');
  if (Array.isArray(coupon.plans) && !coupon.plans.map(resolvePlanKey).includes(planId)) throw new BillingError('Coupon does not apply to this plan.', 400, 'COUPON_PLAN_MISMATCH');
  const discount = Math.max(0, Math.min(100, Number(coupon.percentOff ?? String(coupon.discount || '').replace('%', ''))));
  if (!Number.isFinite(discount) || discount <= 0) throw new BillingError('Coupon configuration is invalid.', 500, 'COUPON_CONFIGURATION');
  return { code: normalized, percentOff: discount };
}

export function razorpayConfigured() { return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET); }
export function billingPersistenceReady() {
  // Vercel's local filesystem (including /tmp) is ephemeral and cannot safely
  // coordinate checkout creation with a later webhook invocation.
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV !== 'production') return true;
  if (!process.env.GXA_DB_FILE) return false;
  const databasePath = path.resolve(process.env.GXA_DB_FILE);
  const temporaryPath = path.resolve(os.tmpdir());
  return databasePath !== temporaryPath && !databasePath.startsWith(`${temporaryPath}${path.sep}`);
}
export function billingCheckoutAvailable() { return razorpayConfigured() && billingPersistenceReady(); }
const providerAuthorization = () => `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

export async function createCheckout(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch, selectionToken = '') {
  if (!canManageBilling(context)) throw new AuthorizationError('Billing management permission required.');
  const selection = resolvePlanSelection(db, selectionToken, { userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId }, true);
  const planKey = strictPlanKey(raw?.planKey ?? raw?.planId ?? selection.planKey);
  if (selection.planKey !== planKey) {
    recordBillingEvent(db, 'plan_mismatch_blocked', { planKey, currentPlan: context.planId, sourceTool: selection.sourceTool, reason: 'checkout_selection_mismatch' });
    throw new BillingError('Checkout does not match your selected plan. Choose the plan again.', 409, 'PLAN_SELECTION_MISMATCH');
  }
  const plan = PLAN_REGISTRY[planKey];
  if (plan.billingType === 'contact') throw new BillingError('Contact Sales to configure this plan.', 409, 'CONTACT_SALES_REQUIRED');
  if (plan.billingType === 'free') throw new BillingError('The Free plan does not require checkout.', 400, 'CHECKOUT_NOT_REQUIRED');
  if (raw?.billingInterval && raw.billingInterval !== 'monthly' || raw?.interval && raw.interval !== 'monthly') throw new BillingError('Only monthly billing is currently available.', 400, 'BILLING_INTERVAL_UNAVAILABLE');
  if (PLAN_REGISTRY[context.planId].rank >= plan.rank) throw new BillingError(context.planId === planKey ? 'This is already your current plan.' : 'Plan downgrades require billing support.', 409, context.planId === planKey ? 'PLAN_ALREADY_ACTIVE' : 'PLAN_DOWNGRADE_BLOCKED');
  if (!razorpayConfigured()) throw new BillingError('Payments are not configured on this deployment.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  if (!billingPersistenceReady()) throw new BillingError('Secure checkout is unavailable until durable billing storage is configured.', 503, 'BILLING_STORAGE_UNAVAILABLE');
  const idempotencyKey = safeText(raw?.idempotencyKey || crypto.randomUUID(), 120);
  const idempotencyKeyHash = tokenHash(`${context.tenantType}:${context.tenantId}:${idempotencyKey}`);
  const existing = Object.values<any>(db.pendingCheckouts || {}).find(item => item.idempotencyKeyHash === idempotencyKeyHash);
  if (existing) {
    if (existing.planKey !== planKey || existing.userId !== context.user.id) throw new BillingError('Checkout idempotency key was reused with different details.', 409, 'CHECKOUT_IDEMPOTENCY_MISMATCH');
    return publicCheckout(existing);
  }
  const coupon = validateCoupon(db.config || {}, raw?.couponCode, planKey);
  const baseAmountMinor = plan.monthlyPriceMinor;
  if (baseAmountMinor === null) throw new BillingError('Selected plan has no checkout price.', 400, 'PRICE_UNAVAILABLE');
  const amountMinor = Math.max(1, Math.round(baseAmountMinor * (coupon ? (100 - coupon.percentOff) / 100 : 1)));
  const receipt = `gxa_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const providerResponse = await fetcher('https://api.razorpay.com/v1/orders', {
    method: 'POST', headers: { Authorization: providerAuthorization(), 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ amount: amountMinor, currency: 'INR', receipt, notes: { tenantType: context.tenantType, tenantId: context.tenantId, userId: context.user.id, planKey, billingInterval: 'monthly', selectionId: selection.id } }),
  });
  const body: any = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok || !body.id) throw new BillingError('Payment provider could not create checkout.', 502, 'PAYMENT_PROVIDER_ERROR');
  if (Number(body.amount) !== amountMinor || String(body.currency || 'INR').toUpperCase() !== 'INR') throw new BillingError('Payment provider returned an inconsistent checkout amount.', 502, 'PAYMENT_PROVIDER_AMOUNT_MISMATCH');
  const record = {
    id: `checkout_${crypto.randomUUID()}`, providerOrderId: String(body.id), provider: 'razorpay', receipt, idempotencyKeyHash,
    selectionId: selection.id, planKey, billingInterval: 'monthly', amountMinor, currency: 'INR', couponCode: coupon?.code || null,
    tenantType: context.tenantType, tenantId: context.tenantId, userId: context.user.id, status: 'created',
    createdAt: nowIso(), updatedAt: nowIso(), expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS).toISOString(),
  };
  db.pendingCheckouts ||= {};
  db.pendingCheckouts[record.providerOrderId] = record;
  selection.checkoutId = record.id;
  selection.updatedAt = nowIso();
  recordBillingEvent(db, 'checkout_started', { planKey, currentPlan: context.planId, sourceTool: selection.sourceTool, authenticated: true, tenantType: context.tenantType });
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'checkout.created', resourceType: 'razorpay_order', resourceId: record.providerOrderId, metadata: { planKey, billingInterval: 'monthly', amountMinor, currency: 'INR' } });
  return publicCheckout(record);
}

function publicCheckout(record: any) {
  const plan = PLAN_REGISTRY[record.planKey as PlanId];
  return {
    provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, orderId: record.providerOrderId, amount: record.amountMinor,
    currency: record.currency, planKey: plan.key, planId: plan.key, billingInterval: record.billingInterval,
    summary: { planKey: plan.key, planName: plan.name, displayPrice: `₹${record.amountMinor / 100}`, billingLabel: '/month', billingInterval: 'Monthly', amountMinor: record.amountMinor, currency: record.currency },
  };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex'), signature);
}
export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex'), signature);
}

export async function verifyCheckoutPayment(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch) {
  const orderId = safeText(raw?.razorpay_order_id, 160); const paymentId = safeText(raw?.razorpay_payment_id, 160); const signature = safeText(raw?.razorpay_signature, 300);
  if (!orderId || !paymentId || !signature || !verifyPaymentSignature(orderId, paymentId, signature)) throw new BillingError('Payment signature verification failed.', 400, 'PAYMENT_SIGNATURE_INVALID');
  const record = db.pendingCheckouts?.[orderId];
  if (!record) throw new BillingError('Checkout order was not found.', 404, 'CHECKOUT_NOT_FOUND');
  if (record.tenantType !== context.tenantType || record.tenantId !== context.tenantId) throw new BillingError('Checkout belongs to another workspace.', 403, 'CHECKOUT_TENANT_MISMATCH');
  if (record.userId !== context.user.id) throw new BillingError('Checkout belongs to another account.', 403, 'CHECKOUT_USER_MISMATCH');
  const submittedPlan = raw?.planKey === undefined ? record.planKey : strictPlanKey(raw.planKey);
  if (submittedPlan !== record.planKey) throw new BillingError('Payment plan does not match the pending checkout.', 409, 'PAYMENT_PLAN_MISMATCH');
  if (record.paymentId && record.paymentId !== paymentId) throw new BillingError('Checkout was already verified with another payment.', 409, 'PAYMENT_REPLAY_BLOCKED');
  const processed = db.processedPayments?.[paymentId];
  if (processed && processed.providerOrderId !== orderId) throw new BillingError('Payment was already associated with another checkout.', 409, 'PAYMENT_REPLAY_BLOCKED');
  const paymentResponse = await fetcher(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: providerAuthorization() } });
  const payment: any = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok) throw new BillingError('Payment provider verification is temporarily unavailable.', 502, 'PAYMENT_PROVIDER_ERROR');
  if (String(payment.order_id || '') !== orderId) throw new BillingError('Payment order does not match checkout.', 409, 'PAYMENT_ORDER_MISMATCH');
  if (Number(payment.amount) !== Number(record.amountMinor)) throw new BillingError('Payment amount does not match the selected plan.', 409, 'PAYMENT_AMOUNT_MISMATCH');
  if (String(payment.currency || '').toUpperCase() !== record.currency) throw new BillingError('Payment currency does not match checkout.', 409, 'PAYMENT_CURRENCY_MISMATCH');
  if (!['authorized', 'captured'].includes(String(payment.status || ''))) throw new BillingError('Payment has not been accepted by the provider.', 409, 'PAYMENT_NOT_ACCEPTED');
  record.status = 'client_verified_pending_webhook'; record.paymentId = paymentId; record.updatedAt = nowIso();
  db.processedPayments ||= {};
  db.processedPayments[paymentId] = { providerOrderId: orderId, checkoutId: record.id, status: 'verification_pending', createdAt: nowIso() };
  recordBillingEvent(db, 'payment_verification_started', { planKey: record.planKey, currentPlan: context.planId, authenticated: true, tenantType: context.tenantType });
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'payment.signature_and_amount_verified', resourceType: 'razorpay_order', resourceId: orderId, metadata: { planKey: record.planKey, amountMinor: record.amountMinor, currency: record.currency } });
  return { status: 'verification_pending', planKey: record.planKey, message: 'Payment received. Subscription activation is waiting for provider confirmation.' };
}

function providerEventTime(payload: any, entity: any) {
  const seconds = Number(payload?.created_at || entity?.created_at || entity?.captured_at || 0);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : nowIso();
}

export function applyRazorpayWebhook(db: any, eventId: string, payload: any) {
  const idempotencyKey = `razorpay:webhook:${safeText(eventId, 180)}`;
  if (db.idempotencyRecords?.[idempotencyKey]) return { duplicate: true, subscription: null };
  db.idempotencyRecords ||= {};
  const event = String(payload?.event || ''); const payment = payload?.payload?.payment?.entity; const subscriptionEntity = payload?.payload?.subscription?.entity; const order = payload?.payload?.order?.entity;
  const orderId = String(payment?.order_id || order?.id || ''); const record = orderId ? db.pendingCheckouts?.[orderId] : null;
  const receivedAt = nowIso();
  db.idempotencyRecords[idempotencyKey] = { event, receivedAt, orderId: orderId || null };

  if (event === 'subscription.cancelled' || event === 'subscription.paused') {
    const existing = Object.values<any>(db.subscriptions || {}).find(item => item.providerSubscriptionId && item.providerSubscriptionId === subscriptionEntity?.id);
    if (!existing) return { duplicate: false, subscription: null };
    const occurredAt = providerEventTime(payload, subscriptionEntity);
    if (existing.lastProviderEventAt && Date.parse(occurredAt) < Date.parse(existing.lastProviderEventAt)) return { duplicate: false, subscription: existing, outOfOrder: true };
    existing.status = event === 'subscription.cancelled' ? 'canceled' : 'paused'; existing.lastProviderEventAt = occurredAt; existing.updatedAt = receivedAt;
    audit(db, { tenantId: existing.tenantId, actorId: 'razorpay', actorType: 'provider', action: `billing.${event}`, resourceType: 'subscription', resourceId: existing.id, metadata: { status: existing.status, planKey: existing.planId } });
    return { duplicate: false, subscription: existing };
  }

  if (!record || !['payment.captured', 'payment.failed', 'order.paid', 'subscription.activated', 'subscription.charged'].includes(event)) return { duplicate: false, subscription: null };
  const providerAmount = payment?.amount ?? order?.amount_paid;
  const amountWasProvided = providerAmount !== undefined && providerAmount !== null;
  const amount = amountWasProvided ? Number(providerAmount) : Number(record.amountMinor);
  const currency = String(payment?.currency || order?.currency || record.currency).toUpperCase();
  const notes = payment?.notes || order?.notes || subscriptionEntity?.notes || {};
  const notePlan = notes.planKey || notes.planId;
  const replay = payment?.id ? db.processedPayments?.[payment.id] : null;
  if ((amountWasProvided && (!Number.isFinite(amount) || amount !== Number(record.amountMinor))) || currency !== record.currency || (notePlan && resolvePlanKey(notePlan) !== record.planKey) || (replay && replay.providerOrderId !== orderId)) {
    record.status = 'webhook_rejected'; record.updatedAt = receivedAt;
    audit(db, { tenantId: record.tenantId, actorId: 'razorpay', actorType: 'provider', action: 'billing.webhook_rejected', resourceType: 'razorpay_order', resourceId: orderId, metadata: { reason: 'checkout_mismatch', planKey: record.planKey } });
    return { duplicate: false, subscription: null, rejected: true };
  }
  const occurredAt = providerEventTime(payload, payment || order || subscriptionEntity);
  if (record.lastProviderEventAt && Date.parse(occurredAt) < Date.parse(record.lastProviderEventAt)) return { duplicate: false, subscription: null, outOfOrder: true };
  record.lastProviderEventAt = occurredAt; record.updatedAt = receivedAt;
  if (event === 'payment.failed') { record.status = 'failed'; return { duplicate: false, subscription: null }; }

  const planKey = record.planKey as PlanId;
  let subscription = Object.values<any>(db.subscriptions || {}).find(item => item.tenantType === record.tenantType && item.tenantId === record.tenantId && ['active', 'trialing'].includes(item.status));
  if (subscription && PLAN_REGISTRY[resolvePlanKey(subscription.planId) || 'free'].rank > PLAN_REGISTRY[planKey].rank) {
    record.status = 'blocked_downgrade';
    return { duplicate: false, subscription, rejected: true };
  }
  subscription ||= { id: `sub_${crypto.randomUUID()}`, tenantType: record.tenantType, tenantId: record.tenantId, provider: 'razorpay', createdAt: receivedAt };
  Object.assign(subscription, {
    providerCustomerId: subscriptionEntity?.customer_id || subscription.providerCustomerId || null,
    providerSubscriptionId: subscriptionEntity?.id || subscription.providerSubscriptionId || null,
    planId: planKey, status: 'active', billingInterval: 'monthly', amountMinor: record.amountMinor, currency: record.currency,
    sourceCheckoutId: record.id, currentPeriodStart: subscriptionEntity?.current_start ? new Date(subscriptionEntity.current_start * 1000).toISOString() : subscription.currentPeriodStart || receivedAt,
    currentPeriodEnd: subscriptionEntity?.current_end ? new Date(subscriptionEntity.current_end * 1000).toISOString() : subscription.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(subscriptionEntity?.cancel_at_cycle_end), lastProviderEventAt: occurredAt, updatedAt: receivedAt,
  });
  db.subscriptions ||= {}; db.subscriptions[subscription.id] = subscription;
  record.status = 'activated'; record.paymentId = payment?.id || record.paymentId || null;
  if (record.paymentId) { db.processedPayments ||= {}; db.processedPayments[record.paymentId] = { providerOrderId: orderId, checkoutId: record.id, status: 'activated', updatedAt: receivedAt }; }
  if (record.tenantType === 'personal' && db.users?.[record.tenantId]) db.users[record.tenantId].subscription = planKey;
  else if (record.tenantType === 'organization' && db.organizations?.[record.tenantId]) db.organizations[record.tenantId].planId = planKey;
  if (payment?.invoice_id) { db.invoices ||= {}; db.invoices[payment.invoice_id] = { id: payment.invoice_id, tenantType: record.tenantType, tenantId: record.tenantId, provider: 'razorpay', amount: record.amountMinor, currency: record.currency, status: payment.status, paidAt: payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : receivedAt, createdAt: receivedAt }; }
  const selection = db.pendingPlanSelections?.[record.selectionId]; if (selection) { selection.status = 'completed'; selection.updatedAt = receivedAt; }
  recordBillingEvent(db, 'subscription_activated', { planKey, currentPlan: planKey, authenticated: true, tenantType: record.tenantType });
  audit(db, { tenantId: record.tenantId, actorId: 'razorpay', actorType: 'provider', action: `billing.${event}`, resourceType: 'subscription', resourceId: subscription.id, metadata: { status: 'active', planKey, amountMinor: record.amountMinor, currency: record.currency } });
  return { duplicate: false, subscription };
}

export function createContactSalesLead(db: any, raw: any, selectionToken = '', context?: TenantContext | null) {
  const planKey = strictPlanKey(raw?.planKey ?? raw?.selectedPlan);
  if (!PLAN_REGISTRY[planKey].contactSales) throw new BillingError('Contact Sales is available only for Team and Enterprise.', 400, 'CONTACT_PLAN_REQUIRED');
  const selection = resolvePlanSelection(db, selectionToken, context ? { userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId } : undefined, false);
  if (selection && selection.planKey !== planKey) throw new BillingError('The enquiry does not match your selected plan.', 409, 'PLAN_SELECTION_MISMATCH');
  const name = safeText(raw?.name, 100); const workEmail = safeText(raw?.workEmail, 200).toLowerCase(); const company = safeText(raw?.company, 160); const teamSize = safeText(raw?.teamSize, 40); const useCase = safeText(raw?.useCase, 1000); const message = safeText(raw?.message, 2000);
  if (!name || !/^\S+@\S+\.\S+$/.test(workEmail) || !company || !teamSize || !useCase) throw new BillingError('Name, work email, company, team size and use case are required.', 400, 'CONTACT_DETAILS_REQUIRED');
  const lead = { id: `sales_${crypto.randomUUID()}`, planKey, name, workEmail, company, teamSize, useCase, message, userId: context?.user.id || null, tenantId: context?.tenantId || null, status: 'received', createdAt: nowIso() };
  db.contactSalesLeads ||= {}; db.contactSalesLeads[lead.id] = lead;
  if (selection) { selection.salesLeadId = lead.id; selection.updatedAt = nowIso(); }
  recordBillingEvent(db, 'contact_sales_clicked', { planKey, sourceTool: selection?.sourceTool || 'pricing', currentPlan: context?.planId || 'free', authenticated: Boolean(context) });
  return { id: lead.id, planKey, status: lead.status, createdAt: lead.createdAt };
}
