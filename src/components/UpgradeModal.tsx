import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { PlanCard, PricingErrorState, PricingSkeleton } from './pricing/PricingComponents';
import { PlanKey, PublicPlan, UpgradeRequest } from '../types/pricing';
import { fetchFeatureGate, fetchPricingPlans, trackPricingEvent } from '../utils/pricing';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: UpgradeRequest;
  currentUser?: any;
  onSelectPlan: (plan: PublicPlan, sourceTool: string, returnRoute: string) => Promise<void>;
  onGoToPricing: () => void;
}

export default function UpgradeModal({ isOpen, onClose, request, currentUser, onSelectPlan, onGoToPricing }: UpgradeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null); const closeRef = useRef<HTMLButtonElement>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]); const [currentPlanKey, setCurrentPlanKey] = useState<PlanKey>('free'); const [minimumPlanKey, setMinimumPlanKey] = useState<PlanKey>('pro');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState<PlanKey | null>(null);

  const load = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true); setError('');
    try {
      const [pricing, gate] = await Promise.all([fetchPricingPlans(), fetchFeatureGate(request.featureKey, currentUser)]);
      const eligible = new Set(gate.eligibleUpgradePlans.map(plan => plan.key));
      setPlans(pricing.plans.filter(plan => eligible.has(plan.key)));
      setCurrentPlanKey(gate.currentPlanKey); setMinimumPlanKey(gate.minimumRequiredPlanKey);
      trackPricingEvent('upgrade_modal_opened', { featureKey: request.featureKey, sourceTool: request.sourceTool, currentPlan: gate.currentPlanKey, authenticated: Boolean(currentUser?.sessionToken) });
    } catch (cause: any) { setError(cause.message || 'Upgrade options could not be loaded.'); }
    finally { setLoading(false); }
  }, [isOpen, request.featureKey, request.sourceTool, currentUser?.sessionToken]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const minimumName = plans.find(plan => plan.key === minimumPlanKey)?.name || minimumPlanKey.replace('_', ' ');
  const select = async (plan: PublicPlan) => { setBusy(plan.key); setError(''); try { await onSelectPlan(plan, request.sourceTool, request.returnRoute); onClose(); } catch (cause: any) { setError(cause.message || 'The selected plan could not be saved.'); } finally { setBusy(null); } };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="upgrade-title" aria-describedby="upgrade-description" className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close upgrade dialog" className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
      <div className="pr-12"><span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-teal-700 dark:bg-teal-950 dark:text-teal-300"><Sparkles className="h-3.5 w-3.5" />Plan upgrade</span><h2 id="upgrade-title" className="mt-3 text-2xl font-black">Upgrade your plan</h2><p id="upgrade-description" className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Choose a plan to unlock {request.featureName} and its configured workspace capabilities. The minimum eligible plan is <strong className="text-slate-800 dark:text-zinc-200">{minimumName}</strong>.</p></div>
      <div className="mt-6">{loading ? <PricingSkeleton /> : error && !plans.length ? <PricingErrorState message={error} onRetry={load} retrying={loading} /> : <>{error && <PricingErrorState message={error} onRetry={load} retrying={loading} />}<div className={`grid gap-4 ${plans.length >= 3 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}>{plans.map(plan => <PlanCard key={plan.key} plan={plan} currentPlanKey={currentPlanKey} disabled={busy === plan.key} badge={plan.key === minimumPlanKey ? 'Minimum plan' : undefined} onSelect={select} />)}</div>{!plans.length && !error && <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600 dark:bg-zinc-950 dark:text-zinc-300">No eligible upgrade plan is currently available.</p>}</>}</div>
      <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row dark:border-zinc-800"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-zinc-700">Continue with {currentPlanKey === 'free' ? 'Free' : currentPlanKey === 'pro_plus' ? 'Pro Plus' : currentPlanKey.charAt(0).toUpperCase() + currentPlanKey.slice(1)}</button><button type="button" onClick={() => { onClose(); onGoToPricing(); }} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-950">Compare Plans</button></div>
      {busy && <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/70 dark:bg-zinc-900/70" aria-live="polite"><span className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><Loader2 className="h-4 w-4 animate-spin" />Saving {busy.replace('_', ' ')} selection</span></div>}
    </div>
  </div>;
}
