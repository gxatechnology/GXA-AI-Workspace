import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import ContactSalesForm from '../pricing/ContactSalesForm';
import { PricingErrorState, PricingGrid, PricingSkeleton } from '../pricing/PricingComponents';
import { PlanKey, PublicPlan } from '../../types/pricing';
import { fetchCurrentPlan, fetchPlanSelection, fetchPricingPlans, trackPricingEvent } from '../../utils/pricing';

interface Props {
  currentUser?: any;
  onSelectWorkspace: (id: any) => void;
  onPlanSelected: (plan: PublicPlan, sourceTool: string, returnRoute: string) => Promise<void>;
}

export default function Pricing({ currentUser, onSelectWorkspace, onPlanSelected }: Props) {
  const [plans, setPlans] = useState<PublicPlan[]>([]); const [currentPlanKey, setCurrentPlanKey] = useState<PlanKey>('free');
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null); const [contactPlan, setContactPlan] = useState<PublicPlan | null>(null);
  const authenticated = Boolean(currentUser?.sessionToken && !currentUser?.guest);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [pricing, current, selection] = await Promise.all([
        fetchPricingPlans(),
        authenticated ? fetchCurrentPlan(currentUser).catch(() => null) : Promise.resolve(null),
        fetchPlanSelection(currentUser).catch(() => ({ selection: null, plan: null })),
      ]);
      if (!pricing.plans.length) throw new Error('No public plans are currently available.');
      setPlans(pricing.plans); setCurrentPlanKey(current?.currentPlanKey || 'free');
      if (selection.plan?.contactSales) setContactPlan(selection.plan);
      trackPricingEvent('pricing_page_viewed', { currentPlan: current?.currentPlanKey || 'free', authenticated });
    } catch (cause: any) { setError(cause.message || 'Pricing is temporarily unavailable.'); trackPricingEvent('pricing_api_failed', { authenticated }); }
    finally { setLoading(false); }
  }, [authenticated, currentUser?.sessionToken]);

  useEffect(() => { load(); }, [load]);

  const selectPlan = async (plan: PublicPlan) => {
    if (plan.key === currentPlanKey) return;
    setBusyPlan(plan.key); setError('');
    try {
      await onPlanSelected(plan, 'pricing', 'pricing');
      if (plan.contactSales) setContactPlan(plan);
      else if (plan.billingType === 'free') onSelectWorkspace('home');
    } catch (cause: any) { setError(cause.message || 'The selected plan could not be saved.'); }
    finally { setBusyPlan(null); }
  };

  return <div className="mx-auto max-w-7xl space-y-8 pb-12">
    <header className="text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">Plans and pricing</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Simple plans for every stage</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">Choose the plan that matches how you use GXA AI Workspace.</p></header>
    {loading ? <PricingSkeleton /> : error && !plans.length ? <PricingErrorState message={error} onRetry={load} retrying={loading} /> : <>{error && <PricingErrorState message={error} onRetry={load} retrying={loading} />}<PricingGrid plans={plans} currentPlanKey={currentPlanKey} onSelect={selectPlan} disabledPlanKeys={busyPlan ? [busyPlan] : []} /></>}
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 dark:border-zinc-800 dark:bg-zinc-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><p>Secure payment is handled by Razorpay when available. Subscription access is activated only after server verification.</p></div>
    {contactPlan && <ContactSalesForm plan={contactPlan} onClose={() => setContactPlan(null)} />}
  </div>;
}
