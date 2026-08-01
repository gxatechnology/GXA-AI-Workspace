import crypto from 'crypto';
import {
  BUSINESS_PRO_PLAN_HIGHLIGHTS, FEATURE_PLAN_REQUIREMENTS, PLAN_FEATURE_LABELS, PLAN_REGISTRY, FeatureKey, PlanDefinition, PlanId,
  minimumPlanForFeature, planIncludesFeature, resolvePlanKey, upgradePresentationForFeature,
} from '../shared/platformRegistry.js';
import { BUSINESS_TOOLS } from '../shared/businessRegistry.js';
import { CAREER_TOOLS } from '../shared/careerRegistry.js';
import { audit, AuthorizationError, PlatformError, TenantContext, nowIso, resolvePlanState } from './platform.js';

export class BillingError extends PlatformError {
  constructor(message: string, status = 400, code = 'BILLING_ERROR') { super(message, status, code); }
}

const SELECTION_TTL_MS = 45 * 60_000;
const CHECKOUT_TTL_MS = 2 * 60 * 60_000;
const SUBSCRIPTION_CREATION_TTL_MS = 10 * 60_000;
const SUPPORTED_SUBSCRIPTION_EVENTS = new Set([
  'subscription.authenticated', 'subscription.activated', 'subscription.charged', 'subscription.pending',
  'subscription.halted', 'subscription.paused', 'subscription.resumed', 'subscription.cancelled', 'subscription.completed',
]);
export type BillingMode = 'orders' | 'subscriptions';
export type BillingEnvironment = 'test' | 'live' | 'unknown';
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
  const contextualHighlights = plan.key === 'business-pro' ? BUSINESS_PRO_PLAN_HIGHLIGHTS : [];
  const limitFeatures = [
    `${Number(plan.limits.ai_requests_month || 0).toLocaleString('en-IN')} AI requests per month`,
    `${Number(plan.limits.project_limit || 0).toLocaleString('en-IN')} projects`,
    `${Number(plan.limits.saved_document_limit || 0).toLocaleString('en-IN')} saved documents`,
    `${Number(plan.limits.available_ai_models || 0)} AI ${Number(plan.limits.available_ai_models || 0) === 1 ? 'model' : 'models'}`,
  ];
  return {
    id: plan.key, key: plan.key, name: plan.name, displayName: plan.displayName, description: plan.description,
    currency: plan.currency, monthlyPrice, displayPrice: plan.key === 'team' ? 'Contact Sales' : plan.key === 'enterprise' ? 'Custom Pricing' : `₹${monthlyPrice}`,
    billingLabel: plan.billingType === 'fixed' ? '/month' : plan.billingType === 'free' ? 'Free' : '',
    billingType: plan.billingType, billingIntervals: [...plan.billingIntervals], contactSales: plan.contactSales,
    active: plan.active, public: plan.public, upgradeable: plan.upgradeable,
    recommended: plan.recommended, rank: plan.rank, features: [...new Set([...contextualHighlights, ...limitFeatures, ...plan.entitlements.map(key => PLAN_FEATURE_LABELS[key])])],
    entitlements: [...plan.entitlements], limits: { ...plan.limits },
  };
}

export const publicPlans = () => Object.values(PLAN_REGISTRY)
  .filter(plan => plan.active && plan.public)
  .sort((a, b) => a.rank - b.rank)
  .map(publicPlan);

type ComparisonValue = { kind: 'included' | 'excluded' | 'limit' | 'text' | 'planned'; label: string };
type ComparisonRow = { id: string; label: string; description?: string; values: Partial<Record<PlanId, ComparisonValue>> };

const comparisonPlans = () => Object.values(PLAN_REGISTRY).filter(plan => plan.active && plan.public).sort((a, b) => a.rank - b.rank);
const comparisonValues = (value: (plan: PlanDefinition) => ComparisonValue) => Object.fromEntries(comparisonPlans().map(plan => [plan.key, value(plan)]));
const included = (value: boolean): ComparisonValue => value ? { kind: 'included', label: 'Included' } : { kind: 'excluded', label: 'Not included' };
const featureRow = (id: string, label: string, featureKey: string, description?: string): ComparisonRow => ({ id, label, description, values: comparisonValues(plan => included(planIncludesFeature(plan.key, featureKey))) });
const limitRow = (id: string, label: string, limitKey: string, suffix = ''): ComparisonRow => ({
  id, label,
  values: comparisonValues(plan => {
    const value = Number(plan.limits[limitKey] || 0);
    return { kind: 'limit', label: `${value.toLocaleString('en-IN')}${suffix}` };
  }),
});

export function pricingComparison() {
  const studioAccess = (plan: PlanDefinition, featureKey: string) => included(planIncludesFeature(plan.key, featureKey));
  const businessSections = Array.from(new Set(BUSINESS_TOOLS.map(tool => tool.category))).map(category => ({
    id: `business-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: `Business Studio · ${category}`,
    rows: BUSINESS_TOOLS.filter(tool => tool.category === category).map(tool => ({
      id: `business-tool-${tool.id}`,
      label: tool.name,
      description: tool.description,
      values: comparisonValues(plan => studioAccess(plan, 'business.basic')),
    })),
  }));
  const careerRows = CAREER_TOOLS.filter(tool => tool.status === 'available').map(tool => ({
    id: `career-tool-${tool.id}`,
    label: tool.name,
    description: tool.description,
    values: comparisonValues(plan => studioAccess(plan, 'career.basic')),
  }));
  const storageValues = comparisonValues(plan => {
    const megabytes = Number(plan.limits.storage_mb || 0);
    return { kind: 'limit', label: megabytes >= 1024 ? `${Number((megabytes / 1024).toFixed(megabytes % 1024 ? 1 : 0))} GB` : `${megabytes} MB` };
  });
  const priceValues = comparisonValues(plan => ({ kind: 'text', label: plan.monthlyPriceMinor === 0 ? '₹0' : `₹${Number(plan.monthlyPriceMinor || 0) / 100}/month` }));
  const futureValues = comparisonValues(() => ({ kind: 'planned', label: 'Future ready' }));

  return {
    generatedFrom: ['plan_registry', 'business_tool_registry', 'career_tool_registry'],
    sections: [
      { id: 'general', label: 'General', rows: [
        { id: 'monthly-price', label: 'Monthly price', values: priceValues },
        { id: 'monthly-billing', label: 'Monthly billing', values: comparisonValues(() => ({ kind: 'included', label: 'Included' })) },
      ] },
      { id: 'ai-limits', label: 'AI Limits', rows: [
        limitRow('ai-requests', 'AI requests', 'ai_requests_month', ' / month'),
        limitRow('ai-models', 'Available AI models', 'available_ai_models'),
        limitRow('input-size', 'Maximum input size', 'max_input_characters', ' characters'),
        limitRow('output-size', 'Maximum output size', 'max_output_tokens', ' tokens'),
      ] },
      { id: 'projects-documents', label: 'Projects and Documents', rows: [
        limitRow('project-limit', 'Projects', 'project_limit'),
        limitRow('document-limit', 'Saved documents', 'saved_document_limit'),
        featureRow('document-intelligence', 'Document intelligence', 'documents.intelligence'),
        featureRow('document-batch', 'Batch document processing', 'documents.batch'),
      ] },
      { id: 'history-storage', label: 'History and Storage', rows: [
        limitRow('history-days', 'History retention', 'history_days', ' days'),
        { id: 'storage-limit', label: 'Workspace storage', values: storageValues },
      ] },
      { id: 'writing-tools', label: 'Writing Tools', rows: [
        featureRow('ai-chat', 'AI Chat', 'chat.basic'),
        featureRow('paraphraser', 'Paraphraser', 'paraphraser.standard'),
        featureRow('grammar', 'Grammar Checker', 'grammar.basic'),
        featureRow('writer', 'AI Writer', 'writer.basic'),
        featureRow('translator', 'Translator', 'translation.basic'),
        featureRow('detector', 'AI Detector', 'originality.detector'),
      ] },
      { id: 'premium-ai-features', label: 'Premium AI Features', rows: [
        featureRow('premium-models', 'Premium AI models', 'chat.premium_models'),
        featureRow('premium-paraphraser', 'Premium paraphrasing modes', 'paraphraser.premium_modes'),
        featureRow('advanced-grammar', 'Advanced grammar suggestions', 'grammar.advanced'),
        featureRow('humanizer', 'AI Humanizer', 'humanizer.standard'),
        featureRow('advanced-originality', 'Advanced originality analysis', 'originality.advanced'),
        featureRow('advanced-exports', 'Advanced exports', 'exports.advanced'),
      ] },
      { id: 'templates', label: 'Templates', rows: [featureRow('premium-templates', 'All premium templates', 'writer.premium_templates')] },
      { id: 'business-studio', label: 'Business Studio', rows: [featureRow('business-access', 'Complete Business Studio', 'business.basic', `${BUSINESS_TOOLS.length} registered tools across ${new Set(BUSINESS_TOOLS.map(tool => tool.category)).size} categories`)] },
      ...businessSections,
      { id: 'career-studio', label: 'Career Studio', rows: [featureRow('career-access', 'Complete Career Studio', 'career.basic'), ...careerRows] },
      { id: 'support', label: 'Support', rows: [
        { id: 'account-plan-management', label: 'Account plan management', values: comparisonValues(() => ({ kind: 'included', label: 'Included' })) },
        { id: 'priority-processing', label: 'Priority processing', description: 'Architecture prepared; activation will be configured separately.', values: comparisonValues(plan => plan.key === 'business-pro' ? { kind: 'planned', label: 'Future ready' } : { kind: 'excluded', label: 'Not included' }) },
      ] },
      { id: 'security', label: 'Security', rows: [
        { id: 'server-entitlements', label: 'Server-side access enforcement', values: comparisonValues(() => ({ kind: 'included', label: 'Included' })) },
        { id: 'verified-activation', label: 'Backend-verified subscription activation', values: comparisonValues(plan => plan.billingType === 'free' ? { kind: 'text', label: 'Not required' } : { kind: 'included', label: 'Included' }) },
      ] },
      { id: 'future-integrations', label: 'Future Integrations', rows: [
        { id: 'yearly-billing', label: 'Yearly billing', values: futureValues },
        { id: 'coupons-gst', label: 'Coupons and GST invoices', values: futureValues },
        { id: 'teams-seats', label: 'Teams and seats', values: futureValues },
      ] },
    ],
  };
}

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
    billingMode: subscription?.billingMode || null,
    activationDate: subscription?.activatedAt || subscription?.currentPeriodStart || context.user.createdAt || null,
    currentPeriodStart: subscription?.currentPeriodStart || null, currentPeriodEnd: subscription?.currentPeriodEnd || null,
    nextBillingDate: subscription?.nextChargeAt || null, cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    cancellationStatus: subscription?.cancelAtPeriodEnd ? 'scheduled' : subscription?.status === 'cancelled' || subscription?.status === 'canceled' ? 'cancelled' : null,
    latestSuccessfulRenewal: subscription?.latestPaymentAt || null,
    entitlements: Object.fromEntries(Object.keys(FEATURE_PLAN_REQUIREMENTS).map(featureKey => [featureKey, planIncludesFeature(plan.key, featureKey)])),
    limits: { ...plan.limits },
  };
}

export function resolveFeatureGate(featureKey: string, currentPlanKey: PlanId) {
  const minimumRequiredPlanKey = minimumPlanForFeature(featureKey);
  if (!minimumRequiredPlanKey) throw new BillingError('Feature configuration was not found.', 404, 'FEATURE_NOT_FOUND');
  const allowed = planIncludesFeature(currentPlanKey, featureKey);
  const currentRank = PLAN_REGISTRY[currentPlanKey].rank;
  const minimumRank = PLAN_REGISTRY[minimumRequiredPlanKey].rank;
  const eligibleUpgradePlans = Object.values(PLAN_REGISTRY).filter(plan => plan.active && plan.public && plan.upgradeable && plan.rank >= minimumRank && plan.rank > currentRank).sort((a, b) => a.rank - b.rank).map(publicPlan);
  return {
    featureKey: featureKey as FeatureKey,
    allowed,
    currentPlanKey,
    currentPlan: publicPlan(PLAN_REGISTRY[currentPlanKey]),
    minimumRequiredPlanKey,
    eligibleUpgradePlans,
    presentation: upgradePresentationForFeature(featureKey),
    reason: allowed ? 'included' : 'plan_upgrade_required',
  };
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

export function razorpayConfigured() {
  return process.env.PAYMENT_MODE === 'test'
    && String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_')
    && Boolean(process.env.RAZORPAY_KEY_SECRET);
}
export function razorpayWebhookConfigured() { return razorpayConfigured() && Boolean(process.env.RAZORPAY_WEBHOOK_SECRET); }
export function activeBillingMode(): BillingMode | null {
  return process.env.BILLING_MODE === 'orders' || process.env.BILLING_MODE === 'subscriptions' ? process.env.BILLING_MODE : null;
}
export function activeBillingEnvironment(): BillingEnvironment {
  return process.env.PAYMENT_MODE === 'test' || process.env.PAYMENT_MODE === 'live' ? process.env.PAYMENT_MODE : 'unknown';
}
export function subscriptionPlanIdFor(planKey: PlanId) {
  const variable = planKey === 'pro' ? 'RAZORPAY_PLAN_STARTER' : planKey === 'pro_plus' ? 'RAZORPAY_PLAN_PRO' : planKey === 'business-pro' ? 'RAZORPAY_PLAN_BUSINESS_PRO' : '';
  return variable ? safeText(process.env[variable], 160) : '';
}
export function recurringBillingConfigured() {
  return razorpayWebhookConfigured() && ['pro', 'pro_plus', 'business-pro'].every(key => subscriptionPlanIdFor(key as PlanId));
}
export function billingPersistenceReady(activeProvider?: string) {
  if (activeProvider) return activeProvider === 'postgres';
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) return true;
  return process.env.PERSISTENCE_PROVIDER === 'postgres' && Boolean(process.env.DATABASE_URL);
}
export function billingCheckoutAvailable(activeProvider?: string) {
  const mode = activeBillingMode();
  return Boolean(mode && razorpayConfigured() && billingPersistenceReady(activeProvider) && (mode === 'orders' || recurringBillingConfigured()));
}
export function billingCheckoutAvailability(activeProvider?: string) {
  const mode = activeBillingMode();
  if (!mode) return { available: false, reason: 'billing_mode_not_configured' };
  if (process.env.PAYMENT_MODE !== 'test') return { available: false, reason: 'test_mode_required' };
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return { available: false, reason: 'payment_provider_not_configured' };
  if (!String(process.env.RAZORPAY_KEY_ID).startsWith('rzp_test_')) return { available: false, reason: 'test_credentials_required' };
  if (!billingPersistenceReady(activeProvider)) return { available: false, reason: 'durable_billing_storage_required' };
  if (mode === 'subscriptions' && !process.env.RAZORPAY_WEBHOOK_SECRET) return { available: false, reason: 'webhook_not_configured' };
  if (mode === 'subscriptions' && !['pro', 'pro_plus', 'business-pro'].every(key => subscriptionPlanIdFor(key as PlanId))) return { available: false, reason: 'subscription_plans_not_configured' };
  return { available: true, reason: null, billingMode: mode };
}
const providerAuthorization = () => `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

export async function createCheckout(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch, selectionToken = '', activePersistenceProvider?: string) {
  if (activeBillingMode() !== 'orders') throw new BillingError('One-time checkout is disabled by the active billing mode.', 409, 'BILLING_MODE_MISMATCH');
  if (!canManageBilling(context)) throw new AuthorizationError('Billing management permission required.');
  if (context.user.status && context.user.status !== 'active') throw new BillingError('This account cannot start a payment.', 403, 'ACCOUNT_INACTIVE');
  const selection = resolvePlanSelection(db, selectionToken, { userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId }, true);
  const planKey = strictPlanKey(raw?.planKey ?? selection.planKey);
  if (selection.planKey !== planKey) {
    recordBillingEvent(db, 'plan_mismatch_blocked', { planKey, currentPlan: context.planId, sourceTool: selection.sourceTool, reason: 'checkout_selection_mismatch' });
    throw new BillingError('Checkout does not match your selected plan. Choose the plan again.', 409, 'PLAN_SELECTION_MISMATCH');
  }
  const plan = PLAN_REGISTRY[planKey];
  if (plan.billingType === 'contact') throw new BillingError('Contact Sales to configure this plan.', 409, 'CONTACT_SALES_REQUIRED');
  if (plan.billingType === 'free') throw new BillingError('The Free plan does not require checkout.', 400, 'CHECKOUT_NOT_REQUIRED');
  if (!plan.upgradeable) throw new BillingError('Selected plan is not available for checkout.', 409, 'PLAN_NOT_UPGRADEABLE');
  if (PLAN_REGISTRY[context.planId].rank >= plan.rank) throw new BillingError(context.planId === planKey ? 'This is already your current plan.' : 'Plan downgrades require billing support.', 409, context.planId === planKey ? 'PLAN_ALREADY_ACTIVE' : 'PLAN_DOWNGRADE_BLOCKED');
  if (!razorpayConfigured()) throw new BillingError('Payments are not configured on this deployment.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  if (!billingPersistenceReady(activePersistenceProvider)) throw new BillingError('Secure checkout is unavailable until durable billing storage is configured.', 503, 'BILLING_STORAGE_UNAVAILABLE');
  db.pendingCheckouts ||= {};
  const existing = Object.values<any>(db.pendingCheckouts).find(item => item.planKey === planKey && item.userId === context.user.id && item.tenantType === context.tenantType && item.tenantId === context.tenantId && ['pending', 'checkout_created'].includes(item.status) && Date.parse(item.expiresAt || '0') > Date.now());
  if (existing) {
    if (existing.providerOrderId) return publicCheckout(existing);
    throw new BillingError('A payment request is already being prepared. Please retry shortly.', 409, 'CHECKOUT_IN_PROGRESS');
  }
  const baseAmountMinor = plan.monthlyPriceMinor;
  if (baseAmountMinor === null) throw new BillingError('Selected plan has no checkout price.', 400, 'PRICE_UNAVAILABLE');
  const amountMinor = baseAmountMinor;
  const internalIdempotencyKey = crypto.randomUUID();
  const idempotencyKeyHash = tokenHash(`${context.tenantType}:${context.tenantId}:${internalIdempotencyKey}`);
  const receipt = `gxa_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const record: any = {
    id: `payment_${crypto.randomUUID()}`, providerOrderId: null, providerPaymentId: null, provider: 'razorpay', receipt, idempotencyKeyHash,
    selectionId: selection.id, planKey, internalPlanKey: planKey, billingInterval: 'monthly', amountMinor, expectedAmountPaise: amountMinor, currency: 'INR', couponCode: null,
    tenantType: context.tenantType, tenantId: context.tenantId, userId: context.user.id, status: 'pending', billingEnvironment: activeBillingEnvironment(), billingType: 'one_time_monthly',
    signatureVerified: false, capturedAt: null, accessPeriodStart: null, accessPeriodEnd: null, failureCode: null, failureDescription: null,
    createdAt: nowIso(), updatedAt: nowIso(), expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS).toISOString(),
  };
  db.pendingCheckouts[record.id] = record;
  let providerResponse: Response;
  try {
    providerResponse = await fetcher('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { Authorization: providerAuthorization(), 'Content-Type': 'application/json', 'Idempotency-Key': internalIdempotencyKey },
      body: JSON.stringify({ amount: amountMinor, currency: 'INR', receipt, notes: { tenantType: context.tenantType, tenantId: context.tenantId, userId: context.user.id, planKey, billingInterval: 'monthly', selectionId: selection.id } }),
    });
  } catch {
    record.status = 'failed'; record.failureCode = 'provider_unavailable'; record.failureDescription = 'Secure checkout could not be created.'; record.updatedAt = nowIso();
    throw new BillingError('Payment could not be started. Please try again.', 502, 'PAYMENT_PROVIDER_ERROR');
  }
  const body: any = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok || !body.id) {
    record.status = 'failed'; record.failureCode = 'order_creation_failed'; record.failureDescription = 'Secure checkout could not be created.'; record.updatedAt = nowIso();
    throw new BillingError('Payment could not be started. Please try again.', 502, 'PAYMENT_PROVIDER_ERROR');
  }
  if (Number(body.amount) !== amountMinor || String(body.currency || 'INR').toUpperCase() !== 'INR') {
    record.status = 'failed'; record.failureCode = 'provider_amount_mismatch'; record.failureDescription = 'Provider checkout details did not match the selected plan.'; record.updatedAt = nowIso();
    throw new BillingError('Payment provider returned an inconsistent checkout amount.', 502, 'PAYMENT_PROVIDER_AMOUNT_MISMATCH');
  }
  delete db.pendingCheckouts[record.id];
  record.providerOrderId = String(body.id); record.status = 'checkout_created'; record.updatedAt = nowIso();
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
    checkoutAvailable: true, provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, orderId: record.providerOrderId, amount: record.amountMinor,
    currency: record.currency, planKey: plan.key, planId: plan.key, planName: plan.name, billingInterval: record.billingInterval,
    description: `GXA AI Workspace ${plan.name} — Monthly Access`, supportEmail: 'support@gxatechnologies.com',
    summary: { planKey: plan.key, planName: plan.name, displayPrice: `₹${record.amountMinor / 100}`, billingLabel: '/month', billingInterval: 'Monthly', amountMinor: record.amountMinor, currency: record.currency },
  };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex'), signature);
}
export function verifySubscriptionSignature(subscriptionId: string, paymentId: string, signature: string) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${paymentId}|${subscriptionId}`).digest('hex'), signature);
}
export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  return safeEqual(crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex'), signature);
}

async function razorpayRequest(pathname: string, init: RequestInit, fetcher: typeof fetch) {
  let response: Response;
  try {
    response = await fetcher(`https://api.razorpay.com/v1${pathname}`, {
      ...init,
      headers: { Authorization: providerAuthorization(), 'Content-Type': 'application/json', ...(init.headers || {}) },
      signal: init.signal || AbortSignal.timeout(12_000),
    });
  } catch {
    throw new BillingError('The payment provider is temporarily unavailable. Please try again.', 502, 'PAYMENT_PROVIDER_ERROR');
  }
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new BillingError('The payment provider could not complete this request.', 502, 'PAYMENT_PROVIDER_ERROR');
  return body;
}

export async function validateRazorpaySubscriptionPlan(planKey: PlanId, fetcher: typeof fetch = fetch) {
  const plan = PLAN_REGISTRY[planKey];
  const providerPlanId = subscriptionPlanIdFor(planKey);
  if (!providerPlanId) throw new BillingError('Recurring checkout is not configured for this plan.', 503, 'SUBSCRIPTION_PLAN_NOT_CONFIGURED');
  const providerPlan = await razorpayRequest(`/plans/${encodeURIComponent(providerPlanId)}`, { method: 'GET' }, fetcher);
  const expectedAmount = Number(plan.monthlyPriceMinor);
  const valid = String(providerPlan.id || '') === providerPlanId
    && Number(providerPlan.item?.amount) === expectedAmount
    && String(providerPlan.item?.currency || '').toUpperCase() === 'INR'
    && String(providerPlan.period || '').toLowerCase() === 'monthly'
    && Number(providerPlan.interval) === 1
    && providerPlan.active !== false;
  if (!valid) throw new BillingError('Recurring checkout is unavailable because the provider plan does not match the selected plan.', 503, 'SUBSCRIPTION_PLAN_MISMATCH');
  return { providerPlanId, amountMinor: expectedAmount, currency: 'INR' as const };
}

export function publicSubscriptionRecord(record: any) {
  const planKey = resolvePlanKey(record.planId || record.internalPlanKey) || 'free';
  const plan = PLAN_REGISTRY[planKey];
  const reference = String(record.providerSubscriptionId || '');
  return {
    id: record.id, planKey, planName: plan.name, billingMode: record.billingMode || 'one_time_monthly',
    status: record.status, amountMinor: Number(record.amountMinor || record.amountPaise || 0), currency: record.currency || 'INR',
    activatedAt: record.activatedAt || null, currentPeriodStart: record.currentPeriodStart || null,
    currentPeriodEnd: record.currentPeriodEnd || null, nextChargeAt: record.nextChargeAt || null,
    cancelAtPeriodEnd: Boolean(record.cancelAtPeriodEnd), cancelledAt: record.cancelledAt || null,
    latestPaymentAt: record.latestPaymentAt || null, reference: reference ? `••••${reference.slice(-8)}` : null,
  };
}

export async function createRecurringSubscription(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch, selectionToken = '', activePersistenceProvider?: string) {
  if (!canManageBilling(context)) throw new AuthorizationError('Billing management permission required.');
  if (context.user.status && context.user.status !== 'active') throw new BillingError('This account cannot start a subscription.', 403, 'ACCOUNT_INACTIVE');
  if (activeBillingMode() !== 'subscriptions') throw new BillingError('Recurring subscriptions are disabled by the active billing mode.', 409, 'BILLING_MODE_MISMATCH');
  if (!razorpayConfigured() || !razorpayWebhookConfigured()) throw new BillingError('Recurring payments are not configured on this deployment.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  if (!billingPersistenceReady(activePersistenceProvider)) throw new BillingError('Secure checkout is unavailable until durable billing storage is configured.', 503, 'BILLING_STORAGE_UNAVAILABLE');
  const planKey = strictPlanKey(raw?.planKey);
  const plan = PLAN_REGISTRY[planKey];
  if (plan.billingType !== 'fixed' || !plan.upgradeable || planKey === 'free') throw new BillingError('Selected plan is not available for recurring checkout.', 400, 'SUBSCRIPTION_PLAN_INVALID');
  if (selectionToken) {
    const selection = resolvePlanSelection(db, selectionToken, { userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId }, true);
    if (selection.planKey !== planKey) throw new BillingError('Checkout does not match your selected plan. Choose the plan again.', 409, 'PLAN_SELECTION_MISMATCH');
  }
  db.subscriptions ||= {};
  const recurring = Object.values<any>(db.subscriptions).filter(item => item.billingMode === 'recurring_subscription' && item.tenantType === context.tenantType && item.tenantId === context.tenantId);
  const reusable = recurring.find(item => item.planId === planKey && ['created', 'authenticated'].includes(item.status) && item.providerSubscriptionId && Date.parse(item.createdAt || '0') > Date.now() - SUBSCRIPTION_CREATION_TTL_MS);
  if (reusable) return { checkout: { checkoutAvailable: true, provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: reusable.providerSubscriptionId, planKey, planName: plan.name, amount: Number(plan.monthlyPriceMinor), currency: 'INR', supportEmail: 'support@gxatechnologies.com' }, subscription: publicSubscriptionRecord(reusable), duplicate: true };
  const existing = recurring.find(item => ['created', 'authenticated', 'active', 'pending', 'halted', 'paused'].includes(item.status) && (!item.currentPeriodEnd || Date.parse(item.currentPeriodEnd) > Date.now()));
  if (existing) throw new BillingError(existing.planId === planKey ? 'A recurring subscription for this plan already exists.' : 'Cancel the current recurring subscription at period end before starting another plan.', 409, 'SUBSCRIPTION_ALREADY_EXISTS');

  const providerPlan = await validateRazorpaySubscriptionPlan(planKey, fetcher);
  const createdAt = nowIso();
  const internal: any = {
    id: `rsub_${crypto.randomUUID()}`, userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId, workspaceId: context.workspace.id,
    internalPlanKey: planKey, planId: planKey, billingMode: 'recurring_subscription', provider: 'razorpay', providerPlanId: providerPlan.providerPlanId,
    providerSubscriptionId: null, providerCustomerId: null, status: 'created', quantity: 1, billingInterval: 'monthly', amountMinor: providerPlan.amountMinor,
    currency: providerPlan.currency, currentPeriodStart: null, currentPeriodEnd: null, nextChargeAt: null, authenticatedAt: null, activatedAt: null,
    pausedAt: null, resumedAt: null, cancelledAt: null, cancelAtPeriodEnd: false, completedAt: null, haltedAt: null, expiredAt: null,
    latestPaymentId: null, latestInvoiceId: null, lastProviderEventAt: null, billingEnvironment: activeBillingEnvironment(), reconciliationStatus: 'not_checked', lastReconciledAt: null, createdAt, updatedAt: createdAt,
  };
  db.subscriptions[internal.id] = internal;
  let providerSubscription: any;
  try {
    providerSubscription = await razorpayRequest('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ plan_id: providerPlan.providerPlanId, total_count: 100, quantity: 1, customer_notify: 1, notes: { internalSubscriptionId: internal.id, userId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId, planKey } }),
    }, fetcher);
  } catch (error) {
    Object.assign(internal, { processingError: error instanceof BillingError ? error.code : 'PAYMENT_PROVIDER_ERROR', updatedAt: nowIso() });
    throw error;
  }
  if (!providerSubscription.id || String(providerSubscription.plan_id || '') !== providerPlan.providerPlanId) {
    Object.assign(internal, { processingError: 'SUBSCRIPTION_PROVIDER_MISMATCH', updatedAt: nowIso() });
    throw new BillingError('The provider returned an inconsistent subscription.', 502, 'SUBSCRIPTION_PROVIDER_MISMATCH');
  }
  internal.providerSubscriptionId = safeText(providerSubscription.id, 160);
  internal.providerCustomerId = safeText(providerSubscription.customer_id, 160) || null;
  internal.status = String(providerSubscription.status || 'created') === 'authenticated' ? 'authenticated' : 'created';
  internal.updatedAt = nowIso();
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'billing.subscription_created', resourceType: 'subscription', resourceId: internal.id, metadata: { planKey, billingMode: 'recurring_subscription' } });
  return {
    checkout: { checkoutAvailable: true, provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: internal.providerSubscriptionId, planKey, planName: plan.name, amount: providerPlan.amountMinor, currency: providerPlan.currency, supportEmail: 'support@gxatechnologies.com' },
    subscription: publicSubscriptionRecord(internal), duplicate: false,
  };
}

export async function verifyRecurringSubscription(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch) {
  const subscriptionId = safeText(raw?.razorpay_subscription_id, 160); const paymentId = safeText(raw?.razorpay_payment_id, 160); const signature = safeText(raw?.razorpay_signature, 300);
  if (!subscriptionId || !paymentId || !signature) throw new BillingError('Subscription verification details are incomplete.', 400, 'SUBSCRIPTION_VERIFICATION_INVALID');
  const record = Object.values<any>(db.subscriptions || {}).find(item => item.billingMode === 'recurring_subscription' && item.providerSubscriptionId === subscriptionId);
  if (!record) throw new BillingError('Subscription was not found.', 404, 'SUBSCRIPTION_NOT_FOUND');
  if (record.userId !== context.user.id || record.tenantType !== context.tenantType || record.tenantId !== context.tenantId) throw new BillingError('Subscription belongs to another account or workspace.', 403, 'SUBSCRIPTION_OWNERSHIP_MISMATCH');
  if (!verifySubscriptionSignature(subscriptionId, paymentId, signature)) {
    record.verificationError = 'invalid_signature'; record.updatedAt = nowIso();
    audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'billing.subscription_verification_failed', resourceType: 'subscription', resourceId: record.id, metadata: { reason: 'invalid_signature' } });
    throw new BillingError('Subscription verification failed. No plan change was made.', 400, 'SUBSCRIPTION_SIGNATURE_INVALID');
  }
  const provider = await razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: 'GET' }, fetcher);
  if (String(provider.id || '') !== subscriptionId || String(provider.plan_id || '') !== record.providerPlanId) throw new BillingError('Provider subscription details do not match this checkout.', 409, 'SUBSCRIPTION_PROVIDER_MISMATCH');
  record.authenticatedAt ||= nowIso(); record.latestPaymentId = paymentId; record.signatureVerified = true; record.updatedAt = nowIso();
  if (String(provider.status || '') === 'active') synchronizeSubscriptionEntity(db, record, provider, 'subscription.activated', providerEventTime(provider, provider));
  else if (String(provider.status || '') === 'authenticated') record.status = 'authenticated';
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'billing.subscription_verified', resourceType: 'subscription', resourceId: record.id, metadata: { providerStatus: String(provider.status || 'unknown') } });
  return { status: record.status, active: record.status === 'active' && Boolean(record.activatedAt), subscription: publicSubscriptionRecord(record), message: record.status === 'active' ? 'Your subscription is active.' : 'Your subscription is being verified. Access will activate after confirmation.' };
}

export function monthlyAccessEnd(value: string | Date) {
  const start = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(start.getTime())) throw new BillingError('Payment capture time is invalid.', 502, 'PAYMENT_CAPTURE_TIME_INVALID');
  const year = start.getUTCFullYear(); const month = start.getUTCMonth(); const day = start.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const end = new Date(start);
  end.setUTCFullYear(year, month + 1, Math.min(day, lastDay));
  return end.toISOString();
}

function activateCapturedOrder(db: any, record: any, paymentId: string, capturedAt: string, actorId: string) {
  db.processedPayments ||= {};
  const processed = db.processedPayments[paymentId];
  if (processed) {
    if (processed.providerOrderId !== record.providerOrderId) throw new BillingError('Payment was already associated with another checkout.', 409, 'PAYMENT_REPLAY_BLOCKED');
    const existingSubscription = Object.values<any>(db.subscriptions || {}).find(item => item.sourceCheckoutId === record.id && item.sourcePaymentId === paymentId);
    if (processed.status === 'activated' && existingSubscription) return { subscription: existingSubscription, duplicate: true };
  }

  const planKey = record.planKey as PlanId;
  const activeSubscriptions = Object.values<any>(db.subscriptions || {}).filter(item => item.tenantType === record.tenantType && item.tenantId === record.tenantId && ['active', 'trialing'].includes(item.status) && (!item.currentPeriodEnd || Date.parse(item.currentPeriodEnd) > Date.now()));
  if (activeSubscriptions.some(item => PLAN_REGISTRY[resolvePlanKey(item.planId) || 'free'].rank >= PLAN_REGISTRY[planKey].rank)) throw new BillingError('This payment cannot replace the current plan.', 409, 'PLAN_REPLACEMENT_BLOCKED');

  const periodEnd = monthlyAccessEnd(capturedAt);
  const subscription = {
    id: `sub_${crypto.randomUUID()}`, tenantType: record.tenantType, tenantId: record.tenantId, provider: 'razorpay',
    providerCustomerId: null, providerSubscriptionId: null, planId: planKey, status: 'active', billingInterval: 'monthly',
    amountMinor: record.amountMinor, currency: record.currency, sourceCheckoutId: record.id, sourcePaymentId: paymentId,
    activatedAt: capturedAt, currentPeriodStart: capturedAt, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false, lastProviderEventAt: capturedAt,
    billingEnvironment: record.billingEnvironment || activeBillingEnvironment(), reconciliationStatus: 'not_checked', lastReconciledAt: null,
    createdAt: capturedAt, updatedAt: capturedAt,
  };
  for (const existing of activeSubscriptions) {
    existing.status = 'replaced'; existing.replacedAt = capturedAt; existing.replacedByPaymentId = paymentId; existing.updatedAt = capturedAt;
  }
  db.subscriptions ||= {}; db.subscriptions[subscription.id] = subscription;
  Object.assign(record, {
    providerPaymentId: paymentId, paymentId, status: 'captured', capturedAt,
    accessPeriodStart: capturedAt, accessPeriodEnd: periodEnd, failureCode: null, failureDescription: null, updatedAt: capturedAt,
  });
  db.processedPayments[paymentId] = { providerOrderId: record.providerOrderId, checkoutId: record.id, subscriptionId: subscription.id, status: 'activated', createdAt: capturedAt, updatedAt: capturedAt };
  if (record.tenantType === 'personal' && db.users?.[record.userId]) db.users[record.userId].subscription = planKey;
  else if (record.tenantType === 'organization' && db.organizations?.[record.tenantId]) db.organizations[record.tenantId].planId = planKey;
  const selection = db.pendingPlanSelections?.[record.selectionId]; if (selection) { selection.status = 'completed'; selection.updatedAt = capturedAt; }
  recordBillingEvent(db, 'subscription_activated', { planKey, currentPlan: planKey, authenticated: true, tenantType: record.tenantType });
  audit(db, { tenantId: record.tenantId, actorId, actorType: actorId === 'razorpay' ? 'provider' : 'user', action: 'billing.payment_captured', resourceType: 'payment_order', resourceId: record.id, metadata: { planKey, amountMinor: record.amountMinor, currency: record.currency, accessPeriodEnd: periodEnd } });
  return { subscription, duplicate: false };
}

export async function verifyCheckoutPayment(db: any, context: TenantContext, raw: any, fetcher: typeof fetch = fetch) {
  const orderId = safeText(raw?.razorpay_order_id, 160); const paymentId = safeText(raw?.razorpay_payment_id, 160); const signature = safeText(raw?.razorpay_signature, 300);
  if (!orderId || !paymentId || !signature) throw new BillingError('Payment verification details are incomplete.', 400, 'PAYMENT_VERIFICATION_INVALID');
  const record = db.pendingCheckouts?.[orderId];
  if (!record) throw new BillingError('Checkout order was not found.', 404, 'CHECKOUT_NOT_FOUND');
  if (record.tenantType !== context.tenantType || record.tenantId !== context.tenantId) throw new BillingError('Checkout belongs to another workspace.', 403, 'CHECKOUT_TENANT_MISMATCH');
  if (record.userId !== context.user.id) throw new BillingError('Checkout belongs to another account.', 403, 'CHECKOUT_USER_MISMATCH');
  if (!verifyPaymentSignature(record.providerOrderId, paymentId, signature)) {
    if (record.status !== 'captured') Object.assign(record, { status: 'verification_failed', signatureVerified: false, failureCode: 'invalid_signature', failureDescription: 'Payment signature verification failed.', updatedAt: nowIso() });
    audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'billing.payment_verification_failed', resourceType: 'payment_order', resourceId: record.id, metadata: { reason: 'invalid_signature' } });
    throw new BillingError('Payment verification failed. No plan change was made.', 400, 'PAYMENT_SIGNATURE_INVALID');
  }
  if (record.paymentId && record.paymentId !== paymentId) throw new BillingError('Checkout was already verified with another payment.', 409, 'PAYMENT_REPLAY_BLOCKED');
  const processed = db.processedPayments?.[paymentId];
  if (processed && processed.providerOrderId !== orderId) throw new BillingError('Payment was already associated with another checkout.', 409, 'PAYMENT_REPLAY_BLOCKED');
  if (record.status === 'captured' && record.paymentId === paymentId && processed?.status === 'activated') {
    return { status: 'active', duplicate: true, planKey: record.planKey, payment: publicPaymentRecord(record), currentPlan: currentPlanSummary(context, db), message: 'Your payment was successful and your plan is now active.' };
  }
  let paymentResponse: Response;
  try { paymentResponse = await fetcher(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: providerAuthorization() } }); }
  catch {
    Object.assign(record, { failureCode: 'provider_unavailable', failureDescription: 'Payment verification is temporarily unavailable.', updatedAt: nowIso() });
    throw new BillingError('Your payment is being verified. Please try again.', 502, 'PAYMENT_PROVIDER_ERROR');
  }
  const payment: any = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok) {
    Object.assign(record, { failureCode: 'provider_verification_failed', failureDescription: 'Payment verification is temporarily unavailable.', updatedAt: nowIso() });
    throw new BillingError('Your payment is being verified. Please try again.', 502, 'PAYMENT_PROVIDER_ERROR');
  }
  const rejectProviderPayment = (message: string, code: string) => {
    Object.assign(record, { status: 'verification_failed', failureCode: code.toLowerCase(), failureDescription: message, updatedAt: nowIso() });
    throw new BillingError(message, 409, code);
  };
  if (String(payment.order_id || '') !== orderId) rejectProviderPayment('Payment order does not match checkout.', 'PAYMENT_ORDER_MISMATCH');
  if (Number(payment.amount) !== Number(record.amountMinor)) rejectProviderPayment('Payment amount does not match the selected plan.', 'PAYMENT_AMOUNT_MISMATCH');
  if (String(payment.currency || '').toUpperCase() !== record.currency) rejectProviderPayment('Payment currency does not match checkout.', 'PAYMENT_CURRENCY_MISMATCH');
  if (String(payment.status || '') !== 'captured') {
    Object.assign(record, { providerPaymentId: paymentId, paymentId, status: String(payment.status || '') === 'authorized' ? 'authorized' : 'verification_failed', signatureVerified: true, failureCode: 'payment_not_captured', failureDescription: 'The provider has not confirmed a captured payment.', updatedAt: nowIso() });
    throw new BillingError('Your payment is being verified. Your plan has not changed.', 409, 'PAYMENT_NOT_CAPTURED');
  }
  const capturedAt = providerEventTime(payment, payment);
  record.signatureVerified = true;
  const activation = activateCapturedOrder(db, record, paymentId, capturedAt, context.user.id);
  recordBillingEvent(db, 'payment_verification_started', { planKey: record.planKey, currentPlan: context.planId, authenticated: true, tenantType: context.tenantType });
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'payment.signature_amount_and_capture_verified', resourceType: 'payment_order', resourceId: record.id, metadata: { planKey: record.planKey, amountMinor: record.amountMinor, currency: record.currency } });
  return { status: 'active', duplicate: activation.duplicate, planKey: record.planKey, payment: publicPaymentRecord(record), currentPlan: currentPlanSummary(context, db), message: 'Your payment was successful and your plan is now active.' };
}

function publicPaymentRecord(record: any) {
  const plan = PLAN_REGISTRY[record.planKey as PlanId];
  const paymentId = String(record.providerPaymentId || record.paymentId || '');
  return {
    id: record.id, date: record.capturedAt || record.updatedAt || record.createdAt, planKey: plan.key, planName: plan.name,
    amountMinor: Number(record.amountMinor), currency: record.currency, status: record.status,
    reference: paymentId ? `••••${paymentId.slice(-8)}` : record.providerOrderId ? `••••${String(record.providerOrderId).slice(-8)}` : 'Pending',
    accessPeriodStart: record.accessPeriodStart || null, accessPeriodEnd: record.accessPeriodEnd || null,
    billingType: 'one-time', subscriptionStatus: null,
  };
}

export function paymentHistory(db: any, context: TenantContext) {
  const oneTime = Object.values<any>(db.pendingCheckouts || {})
    .filter(item => item.userId === context.user.id && item.tenantType === context.tenantType && item.tenantId === context.tenantId)
    .map(publicPaymentRecord);
  const recurring = Object.values<any>(db.subscriptionPayments || {})
    .filter(item => item.userId === context.user.id && item.tenantType === context.tenantType && item.tenantId === context.tenantId)
    .map(item => ({
      id: item.id, date: item.paidAt || item.createdAt, planKey: item.planId, planName: PLAN_REGISTRY[resolvePlanKey(item.planId) || 'free'].name,
      amountMinor: Number(item.amountMinor), currency: item.currency, status: item.status, reference: item.providerPaymentId ? `••••${String(item.providerPaymentId).slice(-8)}` : 'Pending',
      accessPeriodStart: item.periodStart || null, accessPeriodEnd: item.periodEnd || null, billingType: 'renewal', subscriptionStatus: item.subscriptionStatus || null,
    }));
  return [...oneTime, ...recurring].sort((left, right) => Date.parse(right.date || '0') - Date.parse(left.date || '0'));
}

function providerEventTime(payload: any, entity: any) {
  const seconds = Number(entity?.captured_at || payload?.captured_at || payload?.created_at || entity?.created_at || 0);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : nowIso();
}

const providerDate = (seconds: unknown) => Number(seconds) > 0 ? new Date(Number(seconds) * 1000).toISOString() : null;

function applyTenantPlan(db: any, record: any) {
  const planKey = resolvePlanKey(record.planId) || 'free';
  if (record.tenantType === 'personal' && db.users?.[record.userId]) db.users[record.userId].subscription = planKey;
  else if (record.tenantType === 'organization' && db.organizations?.[record.tenantId]) db.organizations[record.tenantId].planId = planKey;
}

export function synchronizeSubscriptionEntity(db: any, record: any, entity: any, event: string, occurredAt = nowIso()) {
  if (record.providerPlanId && entity?.plan_id && String(entity.plan_id) !== record.providerPlanId) throw new BillingError('Provider subscription plan does not match the internal subscription.', 409, 'SUBSCRIPTION_PLAN_MISMATCH');
  const outOfOrder = Boolean(record.lastProviderEventAt && Date.parse(occurredAt) < Date.parse(record.lastProviderEventAt));
  const periodStart = providerDate(entity?.current_start);
  const periodEnd = providerDate(entity?.current_end);
  const nextChargeAt = providerDate(entity?.charge_at);
  if (periodStart && (!record.currentPeriodStart || Date.parse(periodStart) >= Date.parse(record.currentPeriodStart))) record.currentPeriodStart = periodStart;
  if (periodEnd && (!record.currentPeriodEnd || Date.parse(periodEnd) >= Date.parse(record.currentPeriodEnd))) record.currentPeriodEnd = periodEnd;
  if (nextChargeAt) record.nextChargeAt = nextChargeAt;
  if (entity?.customer_id) record.providerCustomerId = safeText(entity.customer_id, 160);
  if (outOfOrder) return { outOfOrder: true };

  const timestampFields: Record<string, string> = {
    'subscription.authenticated': 'authenticatedAt', 'subscription.activated': 'activatedAt', 'subscription.halted': 'haltedAt',
    'subscription.paused': 'pausedAt', 'subscription.resumed': 'resumedAt', 'subscription.cancelled': 'cancelledAt', 'subscription.completed': 'completedAt',
  };
  if (timestampFields[event]) record[timestampFields[event]] ||= occurredAt;
  if (event === 'subscription.authenticated') record.status = record.activatedAt ? record.status : 'authenticated';
  if (event === 'subscription.activated' || event === 'subscription.resumed' || event === 'subscription.charged') {
    record.status = 'active'; record.activatedAt ||= occurredAt; record.pausedAt = event === 'subscription.resumed' ? record.pausedAt : null; applyTenantPlan(db, record);
  }
  if (event === 'subscription.pending') record.status = 'pending';
  if (event === 'subscription.halted') record.status = 'halted';
  if (event === 'subscription.paused') record.status = 'paused';
  if (event === 'subscription.cancelled') {
    record.status = 'cancelled'; record.cancelAtPeriodEnd = Boolean(entity?.cancel_at_cycle_end);
    if (!record.cancelAtPeriodEnd) record.currentPeriodEnd = providerDate(entity?.ended_at) || occurredAt;
  }
  if (event === 'subscription.completed') record.status = 'completed';
  record.lastProviderEventAt = occurredAt; record.updatedAt = nowIso();
  return { outOfOrder: false };
}

function recordSubscriptionCharge(db: any, record: any, payment: any, entity: any, occurredAt: string) {
  if (!payment?.id || String(payment.status || '') !== 'captured') throw new BillingError('Subscription charge was not captured.', 409, 'SUBSCRIPTION_CHARGE_NOT_CAPTURED');
  db.processedPayments ||= {}; db.subscriptionPayments ||= {};
  const existing = db.processedPayments[payment.id];
  if (existing) {
    if (existing.subscriptionId !== record.id) throw new BillingError('Payment is already associated with another subscription.', 409, 'PAYMENT_REPLAY_BLOCKED');
    return { duplicate: true, payment: db.subscriptionPayments[payment.id] || null };
  }
  if (Number(payment.amount) !== Number(record.amountMinor) || String(payment.currency || '').toUpperCase() !== record.currency) throw new BillingError('Subscription charge does not match the configured plan.', 409, 'SUBSCRIPTION_CHARGE_MISMATCH');
  const providerStart = providerDate(entity?.current_start); const providerEnd = providerDate(entity?.current_end);
  const periodStart = providerStart || (record.currentPeriodEnd && Date.parse(record.currentPeriodEnd) > Date.parse(occurredAt) ? record.currentPeriodEnd : occurredAt);
  const periodEnd = providerEnd || monthlyAccessEnd(periodStart);
  const previousCharges = Object.values<any>(db.subscriptionPayments || {}).filter(item => item.subscriptionId === record.id && item.status === 'captured');
  const paymentRecord = {
    id: `renewal_${crypto.randomUUID()}`, providerPaymentId: String(payment.id), subscriptionId: record.id, userId: record.userId,
    tenantType: record.tenantType, tenantId: record.tenantId, planId: record.planId, amountMinor: Number(payment.amount), currency: String(payment.currency).toUpperCase(),
    status: 'captured', subscriptionStatus: 'active', billingType: previousCharges.length ? 'recurring_renewal' : 'initial_subscription_payment',
    billingEnvironment: record.billingEnvironment || activeBillingEnvironment(), signatureVerified: true,
    periodStart, periodEnd, paidAt: occurredAt, createdAt: nowIso(),
  };
  db.subscriptionPayments[payment.id] = paymentRecord;
  db.processedPayments[payment.id] = { subscriptionId: record.id, status: 'recurring_charged', createdAt: nowIso(), updatedAt: nowIso() };
  record.latestPaymentId = String(payment.id); record.latestInvoiceId = safeText(payment.invoice_id, 160) || record.latestInvoiceId || null; record.latestPaymentAt = occurredAt; record.currentPeriodStart = periodStart; record.currentPeriodEnd = periodEnd;
  synchronizeSubscriptionEntity(db, record, entity, 'subscription.charged', occurredAt);
  return { duplicate: false, payment: paymentRecord };
}

export function applyRazorpayWebhook(db: any, eventId: string, payload: any, rawPayloadHash = '') {
  const safeEventId = safeText(eventId, 180);
  if (!safeEventId) throw new BillingError('Webhook event identifier is required.', 400, 'WEBHOOK_EVENT_ID_REQUIRED');
  db.subscriptionEvents ||= {}; db.idempotencyRecords ||= {};
  if (db.subscriptionEvents[safeEventId] || db.idempotencyRecords[`razorpay:webhook:${safeEventId}`]) return { duplicate: true, subscription: null, notifications: [] as string[] };
  const event = safeText(payload?.event, 100); const receivedAt = nowIso();
  const eventRecord: any = {
    id: `subevt_${crypto.randomUUID()}`, providerEventId: safeEventId, eventType: event, providerCreatedAt: providerEventTime(payload, payload),
    payloadHash: rawPayloadHash || tokenHash(JSON.stringify(payload || {})), processingStatus: 'processing', processingError: null, processedAt: null, createdAt: receivedAt, subscriptionId: null,
    billingEnvironment: activeBillingEnvironment(),
  };
  db.subscriptionEvents[safeEventId] = eventRecord;
  db.idempotencyRecords[`razorpay:webhook:${safeEventId}`] = { event, receivedAt };
  const payment = payload?.payload?.payment?.entity; const subscriptionEntity = payload?.payload?.subscription?.entity; const order = payload?.payload?.order?.entity;

  try {
    if (SUPPORTED_SUBSCRIPTION_EVENTS.has(event)) {
      const record = Object.values<any>(db.subscriptions || {}).find(item => item.providerSubscriptionId === subscriptionEntity?.id);
      if (!record) {
        Object.assign(eventRecord, { processingStatus: 'ignored', processingError: 'subscription_not_found', processedAt: nowIso() });
        return { duplicate: false, subscription: null, ignored: true, notifications: [] as string[] };
      }
      eventRecord.subscriptionId = record.id;
      const occurredAt = providerEventTime(payload, payment || subscriptionEntity);
      let charge: any = null;
      const synchronized = event === 'subscription.charged' ? null : synchronizeSubscriptionEntity(db, record, subscriptionEntity, event, occurredAt);
      if (event === 'subscription.charged') charge = recordSubscriptionCharge(db, record, payment, subscriptionEntity, occurredAt);
      eventRecord.processingStatus = 'processed'; eventRecord.processedAt = nowIso();
      audit(db, { tenantId: record.tenantId, actorId: 'razorpay', actorType: 'provider', action: `billing.${event}`, resourceType: 'subscription', resourceId: record.id, metadata: { status: record.status, planKey: record.planId } });
      const notification = event === 'subscription.charged' ? 'renewal_successful' : event.replace('subscription.', 'subscription_');
      return { duplicate: Boolean(charge?.duplicate), subscription: record, payment: charge?.payment || null, outOfOrder: Boolean(synchronized?.outOfOrder), notifications: charge?.duplicate || synchronized?.outOfOrder ? [] : [notification] };
    }

    const orderId = String(payment?.order_id || order?.id || ''); const record = orderId ? db.pendingCheckouts?.[orderId] : null;
    if (!record || !['payment.captured', 'payment.failed'].includes(event)) {
      Object.assign(eventRecord, { processingStatus: 'ignored', processingError: 'unsupported_event', processedAt: nowIso() });
      return { duplicate: false, subscription: null, ignored: true, notifications: [] as string[] };
    }
    const providerAmount = payment?.amount ?? order?.amount_paid; const amountWasProvided = providerAmount !== undefined && providerAmount !== null;
    const amount = amountWasProvided ? Number(providerAmount) : Number(record.amountMinor); const currency = String(payment?.currency || order?.currency || record.currency).toUpperCase();
    const notes = payment?.notes || order?.notes || {}; const notePlan = notes.planKey || notes.planId; const replay = payment?.id ? db.processedPayments?.[payment.id] : null;
    if ((amountWasProvided && (!Number.isFinite(amount) || amount !== Number(record.amountMinor))) || currency !== record.currency || (notePlan && resolvePlanKey(notePlan) !== record.planKey) || (replay && replay.providerOrderId !== orderId)) {
      record.status = 'webhook_rejected'; record.updatedAt = receivedAt; Object.assign(eventRecord, { processingStatus: 'rejected', processingError: 'checkout_mismatch', processedAt: nowIso() });
      return { duplicate: false, subscription: null, rejected: true, notifications: [] as string[] };
    }
    const occurredAt = providerEventTime(payload, payment || order); record.lastProviderEventAt = occurredAt; record.updatedAt = receivedAt;
    if (event === 'payment.failed') {
      Object.assign(record, { status: 'failed', providerPaymentId: payment?.id || null, failureCode: safeText(payment?.error_code || 'payment_failed', 80), failureDescription: safeText(payment?.error_description || 'Payment was not completed.', 240) });
      Object.assign(eventRecord, { processingStatus: 'processed', processedAt: nowIso() });
      return { duplicate: false, subscription: null, notifications: [] as string[] };
    }
    record.signatureVerified = true; record.billingEnvironment ||= activeBillingEnvironment(); record.billingType ||= 'one_time_monthly';
    const activation = activateCapturedOrder(db, record, String(payment.id), occurredAt, 'razorpay');
    Object.assign(eventRecord, { processingStatus: 'processed', subscriptionId: activation.subscription.id, processedAt: nowIso() });
    return { duplicate: activation.duplicate, subscription: activation.subscription, notifications: [] as string[] };
  } catch (error) {
    Object.assign(eventRecord, { processingStatus: 'failed', processingError: error instanceof PlatformError ? error.code : 'WEBHOOK_PROCESSING_FAILED', processedAt: nowIso() });
    throw error;
  }
}

export async function cancelRecurringSubscription(db: any, context: TenantContext, subscriptionId: string, raw: any, fetcher: typeof fetch = fetch) {
  if (!canManageBilling(context)) throw new AuthorizationError('Billing management permission required.');
  if (raw?.confirm !== true) throw new BillingError('Confirm cancellation before continuing.', 400, 'CANCELLATION_CONFIRMATION_REQUIRED');
  const record = db.subscriptions?.[subscriptionId];
  if (!record || record.billingMode !== 'recurring_subscription') throw new BillingError('Recurring subscription was not found.', 404, 'SUBSCRIPTION_NOT_FOUND');
  if (record.userId !== context.user.id || record.tenantType !== context.tenantType || record.tenantId !== context.tenantId) throw new BillingError('Subscription belongs to another account or workspace.', 403, 'SUBSCRIPTION_OWNERSHIP_MISMATCH');
  if (!record.providerSubscriptionId) throw new BillingError('Provider subscription is unavailable.', 409, 'SUBSCRIPTION_PROVIDER_ID_MISSING');
  if (['cancelled', 'completed', 'expired'].includes(record.status)) return { subscription: publicSubscriptionRecord(record), duplicate: true };
  if (record.cancelAtPeriodEnd) return { subscription: publicSubscriptionRecord(record), duplicate: true, message: `Cancellation is already scheduled${record.currentPeriodEnd ? ` for ${record.currentPeriodEnd}` : ''}.` };
  const provider = await razorpayRequest(`/subscriptions/${encodeURIComponent(record.providerSubscriptionId)}/cancel`, { method: 'POST', body: JSON.stringify({ cancel_at_cycle_end: 1 }) }, fetcher);
  if (String(provider.id || '') !== record.providerSubscriptionId) throw new BillingError('Provider cancellation response did not match this subscription.', 409, 'SUBSCRIPTION_PROVIDER_MISMATCH');
  record.cancelAtPeriodEnd = true; record.cancellationRequestedAt = nowIso(); record.updatedAt = nowIso();
  if (provider.current_end) record.currentPeriodEnd = providerDate(provider.current_end);
  audit(db, { tenantId: record.tenantId, actorId: context.user.id, action: 'billing.subscription_cancellation_scheduled', resourceType: 'subscription', resourceId: record.id, metadata: { effectiveAt: record.currentPeriodEnd } });
  return { subscription: publicSubscriptionRecord(record), duplicate: false, message: `Cancellation is scheduled${record.currentPeriodEnd ? ` for ${record.currentPeriodEnd}` : ' for the end of the current billing period'}.` };
}

export async function reconcileSubscriptions(db: any, fetcher: typeof fetch = fetch) {
  const startedAt = nowIso(); const runId = `billing_reconcile_${crypto.randomUUID()}`; const environment = activeBillingEnvironment();
  const candidates = Object.values<any>(db.subscriptions || {}).filter(item => item.billingMode === 'recurring_subscription' && item.providerSubscriptionId && ['created', 'authenticated', 'pending', 'halted', 'paused', 'active'].includes(item.status));
  const results: any[] = [];
  for (const record of candidates) {
    try {
      const before = JSON.stringify({ status: record.status, currentPeriodStart: record.currentPeriodStart, currentPeriodEnd: record.currentPeriodEnd, nextChargeAt: record.nextChargeAt, cancelAtPeriodEnd: record.cancelAtPeriodEnd });
      const provider = await razorpayRequest(`/subscriptions/${encodeURIComponent(record.providerSubscriptionId)}`, { method: 'GET' }, fetcher);
      const providerStatus = String(provider.status || '');
      const event = providerStatus === 'active' ? 'subscription.activated' : providerStatus === 'authenticated' ? 'subscription.authenticated' : `subscription.${providerStatus}`;
      if (SUPPORTED_SUBSCRIPTION_EVENTS.has(event)) synchronizeSubscriptionEntity(db, record, provider, event, nowIso());
      if (record.currentPeriodEnd && Date.parse(record.currentPeriodEnd) <= Date.now() && ['cancelled', 'completed', 'halted'].includes(record.status)) { record.status = 'expired'; record.expiredAt ||= nowIso(); record.updatedAt = nowIso(); }
      const eventId = `reconcile:${record.providerSubscriptionId}:${safeText(provider.updated_at || provider.current_end || providerStatus, 80)}`;
      db.subscriptionEvents ||= {};
      if (!db.subscriptionEvents[eventId]) db.subscriptionEvents[eventId] = { id: `subevt_${crypto.randomUUID()}`, providerEventId: eventId, subscriptionId: record.id, eventType: 'subscription.reconciled', providerCreatedAt: nowIso(), payloadHash: tokenHash(`${record.providerSubscriptionId}:${providerStatus}`), processingStatus: 'processed', processingError: null, processedAt: nowIso(), createdAt: nowIso(), billingEnvironment: record.billingEnvironment || environment };
      const synchronized = before !== JSON.stringify({ status: record.status, currentPeriodStart: record.currentPeriodStart, currentPeriodEnd: record.currentPeriodEnd, nextChargeAt: record.nextChargeAt, cancelAtPeriodEnd: record.cancelAtPeriodEnd });
      record.lastReconciledAt = nowIso(); record.reconciliationStatus = synchronized ? 'synchronized' : 'unchanged';
      results.push({ id: record.id, status: record.status, repaired: true, synchronized });
    } catch (error) {
      record.lastReconciledAt = nowIso(); record.reconciliationStatus = 'attention';
      results.push({ id: record.id, status: record.status, repaired: false, error: error instanceof PlatformError ? error.code : 'RECONCILIATION_FAILED' });
    }
  }
  const repaired = results.filter(item => item.repaired).length; const failed = results.filter(item => !item.repaired).length;
  const synchronized = results.filter(item => item.synchronized).length; const unchanged = repaired - synchronized; const completedAt = nowIso();
  db.billingReconciliationRuns ||= {}; db.billingReconciliationRuns[runId] = {
    id: runId, billingEnvironment: environment, status: failed ? 'completed_with_attention' : 'completed', recordsChecked: candidates.length,
    recordsUnchanged: unchanged, recordsSynchronized: synchronized, recordsAttention: failed, errorCount: failed, startedAt, completedAt, createdAt: startedAt,
  };
  return { runId, inspected: candidates.length, repaired, unchanged, synchronized, attention: failed, failed, results };
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
