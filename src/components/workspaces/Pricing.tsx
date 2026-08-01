import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import ContactSalesForm from '../pricing/ContactSalesForm';
import PlanComparisonTable from '../pricing/PlanComparisonTable';
import { PricingErrorState, PricingGrid, PricingSkeleton } from '../pricing/PricingComponents';
import { PlanComparison, PlanKey, PublicPlan } from '../../types/pricing';
import { fetchCurrentPlan, fetchPlanSelection, fetchPricingPlans, trackPricingEvent } from '../../utils/pricing';

interface Props {
  currentUser?: any;
  onSelectWorkspace: (id: any) => void;
  onPlanSelected: (plan: PublicPlan, sourceTool: string, returnRoute: string) => Promise<void>;
}

export default function Pricing({ currentUser, onSelectWorkspace, onPlanSelected }: Props) {
  const [plans, setPlans] = useState<PublicPlan[]>([]); const [currentPlanKey, setCurrentPlanKey] = useState<PlanKey>('free');
  const [comparison, setComparison] = useState<PlanComparison | null>(null); const [checkoutAvailable, setCheckoutAvailable] = useState(false);
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
      setPlans(pricing.plans); setComparison(pricing.comparison); setCheckoutAvailable(Boolean(pricing.checkoutAvailability?.available)); setCurrentPlanKey(current?.currentPlanKey || 'free');
      if (selection.plan?.contactSales) setContactPlan(selection.plan);
      trackPricingEvent('pricing_page_viewed', { currentPlan: current?.currentPlanKey || 'free', authenticated });
    } catch (cause: any) { setError(cause.message || 'Pricing is temporarily unavailable.'); trackPricingEvent('pricing_api_failed', { authenticated }); }
    finally { setLoading(false); }
  }, [authenticated, currentUser?.sessionToken]);

  useEffect(() => { load(); }, [load]);

  const selectPlan = async (plan: PublicPlan) => {
    if (authenticated && plan.key === currentPlanKey) return;
    setBusyPlan(plan.key); setError('');
    try {
      await onPlanSelected(plan, 'pricing', 'pricing');
      if (plan.contactSales) setContactPlan(plan);
      else if (plan.billingType === 'free') onSelectWorkspace('home');
    } catch (cause: any) { setError(cause.message || 'The selected plan could not be saved.'); }
    finally { setBusyPlan(null); }
  };

  const businessPro = useMemo(() => plans.find(plan => plan.key === 'business-pro') || null, [plans]);
  const faqItems = [
    ['Can I change my plan later?', 'Yes. You can select a higher plan at any time. Downgrade requests use the existing plan-management process so your account and saved work remain protected.'],
    ['Will I lose my saved work if I downgrade?', 'No. Your saved projects, documents and workspace content remain preserved when plans change. Access to plan-gated capabilities may change.'],
    ['Is Business Studio included in Pro?', 'No. Business Studio is available only with Business Pro.'],
    ['Is Career Studio included in Pro?', 'No. Career Studio, Resume Builder and related professional career tools are available only with Business Pro.'],
    ['What does Business Pro include?', 'Business Pro includes every feature from Free, Starter and Pro, plus complete Business Studio, Career Studio, premium templates and workflows, and the highest individual limits.'],
    ['Is yearly billing available?', 'Not yet. Monthly billing is the only active interval; yearly billing is planned for a future release.'],
    ['Is Razorpay payment active?', checkoutAvailable ? 'Razorpay checkout is configured. Subscription access is activated only after server verification.' : 'Razorpay checkout is not currently enabled. It will be available only when payment configuration is complete.'],
    ['Will GST invoices be available?', 'GST invoice support is future-ready but is not currently active.'],
    ['What happens when I reach my plan limit?', 'Your current work remains preserved. You will see an upgrade prompt explaining that you have reached your current plan limit, without exposing tokens, credits or provider costs.'],
  ];

  return <div className="mx-auto max-w-[1480px] space-y-10 pb-14">
    <header className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-8 sm:py-10">
      <p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">Plans and pricing</p>
      <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black sm:text-4xl">Choose the workspace that grows with you</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-zinc-400">Start with essential AI tools, then unlock advanced individual limits or complete professional studios when your work requires them.</p>
      <ul className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-bold text-slate-600 dark:text-zinc-300">
        {['Cancel anytime', 'Secure checkout when payments are enabled', 'Saved work remains preserved when plans change', 'Server-verified plan access'].map(point => <li key={point} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{point}</li>)}
      </ul>
    </header>

    <div className="text-center"><div role="group" aria-label="Billing interval" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-black shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><button type="button" aria-pressed="true" className="rounded-lg bg-slate-950 px-4 py-2 text-white dark:bg-white dark:text-zinc-950">Monthly</button><button type="button" disabled title="Yearly billing is planned for a future release" className="cursor-not-allowed rounded-lg px-4 py-2 text-slate-400">Yearly · Coming later</button></div></div>

    {loading ? <PricingSkeleton /> : error && !plans.length ? <PricingErrorState message={error} onRetry={load} retrying={loading} /> : <>{error && <PricingErrorState message={error} onRetry={load} retrying={loading} />}<PricingGrid plans={plans} currentPlanKey={currentPlanKey} authenticated={authenticated} onSelect={selectPlan} disabledPlanKeys={busyPlan ? [busyPlan] : []} /></>}

    <aside className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 sm:grid-cols-2" aria-label="Payment and data protection information">
      <p className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><span>Secure payment will be handled by Razorpay when enabled. Subscription access is activated only after server verification.</span></p>
      <p className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><span>Your projects, documents and saved work are preserved when you upgrade, downgrade or reach a plan limit.</span></p>
    </aside>

    {!loading && comparison && plans.length > 0 && <PlanComparisonTable comparison={comparison} plans={plans} />}

    <section aria-labelledby="pricing-faq-title" className="mx-auto max-w-4xl">
      <div className="text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">Questions and answers</p><h2 id="pricing-faq-title" className="mt-2 text-2xl font-black sm:text-3xl">Pricing FAQ</h2></div>
      <div className="mt-6 space-y-3">{faqItems.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><span>{question}</span><span aria-hidden="true" className="text-lg text-teal-600 transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span></summary><p className="px-5 pb-5 text-sm leading-6 text-slate-500 dark:text-zinc-400">{answer}</p></details>)}</div>
    </section>

    <section className="rounded-3xl border border-teal-200 bg-teal-50 px-5 py-8 text-center dark:border-teal-900 dark:bg-teal-950/40 sm:px-8 sm:py-10" aria-labelledby="pricing-final-cta-title">
      <h2 id="pricing-final-cta-title" className="text-2xl font-black sm:text-3xl">Ready to unlock your complete AI workspace?</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-300">Business Pro combines every individual plan benefit with complete professional business and career studios.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" disabled={!businessPro || busyPlan === 'business-pro' || authenticated && currentPlanKey === 'business-pro'} onClick={() => businessPro && selectPlan(businessPro)} className="theme-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50">{authenticated && currentPlanKey === 'business-pro' ? 'Current Plan' : 'Start with Business Pro'}<ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => document.getElementById('compare-plans-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-900">Compare all plans</button></div>
    </section>

    {contactPlan && <ContactSalesForm plan={contactPlan} onClose={() => setContactPlan(null)} />}
  </div>;
}
