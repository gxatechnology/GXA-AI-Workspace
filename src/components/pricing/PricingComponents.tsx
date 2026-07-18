import React from 'react';
import { ArrowRight, Check, Loader2, RefreshCw } from 'lucide-react';
import { PlanKey, PublicPlan } from '../../types/pricing';

export function PlanPrice({ plan }: { plan: PublicPlan }) {
  return <div className="mt-2 flex min-h-10 items-baseline gap-1 text-slate-950 dark:text-white">
    <span className="text-2xl font-black">{plan.displayPrice}</span>
    {plan.billingLabel === '/month' && <span className="text-xs font-bold text-slate-500">/month</span>}
  </div>;
}

export function CurrentPlanBadge() {
  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Current Plan</span>;
}

export function PlanFeatureList({ features, limit = 8 }: { features: string[]; limit?: number }) {
  return <ul className="mt-5 flex-1 space-y-2 text-xs text-slate-600 dark:text-zinc-300">{features.slice(0, limit).map(feature => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /><span>{feature}</span></li>)}</ul>;
}

export function PlanCard({ plan, currentPlanKey, disabled = false, badge, onSelect }: { plan: PublicPlan; currentPlanKey?: PlanKey | null; disabled?: boolean; badge?: string; onSelect: (plan: PublicPlan) => void | Promise<void> }) {
  const current = currentPlanKey === plan.key;
  const label = current ? 'Current Plan' : plan.contactSales ? 'Contact Sales' : plan.billingType === 'free' ? 'Continue with Free' : `Upgrade to ${plan.name}`;
  const cardBadge = badge || (plan.recommended ? 'Recommended' : '');
  return <article className={`relative flex min-w-0 flex-col rounded-3xl border bg-white p-5 dark:bg-zinc-900 ${cardBadge ? 'border-teal-500 shadow-lg shadow-teal-500/10' : 'border-slate-200 dark:border-zinc-800'}`}>
    <div className="flex min-h-7 items-start justify-between gap-2"><h2 className="text-lg font-black">{plan.name}</h2>{current ? <CurrentPlanBadge /> : cardBadge ? <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-teal-700 dark:bg-teal-950 dark:text-teal-300">{cardBadge}</span> : null}</div>
    <PlanPrice plan={plan} />
    <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{plan.description}</p>
    <PlanFeatureList features={plan.features} />
    <button type="button" disabled={disabled || current} onClick={() => onSelect(plan)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-950">{label}{!current && <ArrowRight className="h-4 w-4" />}</button>
  </article>;
}

export function PricingGrid({ plans, currentPlanKey, onSelect, disabledPlanKeys = [] }: { plans: PublicPlan[]; currentPlanKey?: PlanKey | null; onSelect: (plan: PublicPlan) => void | Promise<void>; disabledPlanKeys?: PlanKey[] }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{plans.map(plan => <PlanCard key={plan.key} plan={plan} currentPlanKey={currentPlanKey} disabled={disabledPlanKeys.includes(plan.key)} onSelect={onSelect} />)}</div>;
}

export function PricingSkeleton() {
  return <div aria-label="Loading plans" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="h-5 w-24 rounded bg-slate-200 dark:bg-zinc-800" /><div className="mt-4 h-8 w-32 rounded bg-slate-100 dark:bg-zinc-800" /><div className="mt-8 space-y-3">{Array.from({ length: 5 }, (__, row) => <div key={row} className="h-3 rounded bg-slate-100 dark:bg-zinc-800" />)}</div></div>)}</div>;
}

export function PricingErrorState({ message, onRetry, retrying = false }: { message: string; onRetry: () => void; retrying?: boolean }) {
  return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><p className="font-bold">Plans could not be loaded.</p><p className="mt-1">{message}</p><button type="button" disabled={retrying} onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Retry</button></div>;
}
