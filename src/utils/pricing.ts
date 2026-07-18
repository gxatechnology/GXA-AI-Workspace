import { CurrentPlanResponse, FeatureGateResult, PlanKey, PlanSelection, PricingResponse } from '../types/pricing';

const jsonHeaders = (user?: any): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(user?.sessionToken && !user?.guest ? { Authorization: `Bearer ${user.sessionToken}` } : {}),
});

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body as T;
}

export const fetchPricingPlans = () => requestJson<PricingResponse>('/api/pricing/plans');
export const fetchFeatureGate = (featureKey: string, user?: any) => requestJson<FeatureGateResult>(`/api/pricing/features/${encodeURIComponent(featureKey)}`, { headers: jsonHeaders(user) });
export const fetchCurrentPlan = (user: any) => requestJson<CurrentPlanResponse>('/api/billing/current-plan', { headers: jsonHeaders(user) });
export const fetchPlanSelection = (user?: any) => requestJson<{ selection: PlanSelection | null; plan: any | null }>('/api/pricing/selection', { headers: jsonHeaders(user) });
export const savePlanSelection = (planKey: PlanKey, sourceTool: string, returnRoute: string, user?: any) => requestJson<{ selection: PlanSelection }>('/api/pricing/selection', { method: 'POST', headers: jsonHeaders(user), body: JSON.stringify({ planKey, sourceTool, returnRoute }) });
export const clearPlanSelection = (user?: any) => requestJson<{ success: true }>('/api/pricing/selection', { method: 'DELETE', headers: jsonHeaders(user) });
export const trackPricingEvent = (event: string, metadata: Record<string, unknown> = {}) => fetch('/api/pricing/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, metadata }), keepalive: true }).catch(() => undefined);

export const canonicalPlanKey = (value: unknown): PlanKey | null => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || /^\d+(?:\.\d+)?$/.test(raw)) return null;
  const normalized = raw.replace(/[ -]+/g, '_');
  const aliases: Record<string, PlanKey> = { free: 'free', pro: 'pro', pro_monthly: 'pro', premium: 'pro', pro_plus: 'pro_plus', proplus: 'pro_plus', premium_plus: 'pro_plus', team: 'team', enterprise: 'enterprise' };
  return aliases[normalized] || null;
};

export const buildWorkspaceHash = (route: string) => `/#/${String(route || 'home').split('?')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'home'}`;
export const readWorkspaceHash = (hash: string) => String(hash || '').replace(/^#\/?/, '').split('?')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'home';
