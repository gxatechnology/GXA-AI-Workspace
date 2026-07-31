import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Loader2 } from 'lucide-react';
import { WorkspaceId } from '../../types';
import { authenticatedFetch } from '../../utils/auth';

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not scheduled';

export default function AccountPlan({ currentUser, onSelectWorkspace }: { currentUser: any; onSelectWorkspace: (id: WorkspaceId) => void }) {
  const [data, setData] = useState<any>(null); const [error, setError] = useState('');
  useEffect(() => { let active = true; authenticatedFetch(currentUser, '/api/billing/current-plan').then(async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Plan details could not be loaded.'); if (active) setData(body); }).catch(reason => { if (active) setError(reason.message); }); return () => { active = false; }; }, [currentUser?.id]);
  if (error) return <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><strong>Plan details unavailable</strong><p className="mt-2">{error} No account data was changed.</p></div>;
  if (!data) return <div className="flex min-h-80 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /><span className="ml-2 text-sm text-slate-500">Loading your plan…</span></div>;
  const plan = data.plan;
  return <section className="mx-auto max-w-4xl space-y-6"><header><p className="text-xs font-black uppercase tracking-widest text-teal-600">Account</p><h1 className="mt-1 text-2xl font-black">Plan</h1><p className="mt-1 text-sm text-slate-500">Review your current plan and compare available upgrades.</p></header>
    <article className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current plan</p><h2 className="mt-2 text-3xl font-black">{plan?.displayName || plan?.name || 'Free'}</h2><p className="mt-1 text-sm text-slate-500">{plan?.description}</p><span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{data.subscriptionStatus || 'free'}</span></div><button type="button" onClick={() => onSelectWorkspace('pricing')} className="theme-primary-action inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black">Compare plans <ArrowRight className="h-4 w-4" /></button></div>
      <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-zinc-800"><div><dt className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" />Activation date</dt><dd className="mt-1 font-bold">{formatDate(data.activationDate)}</dd></div><div><dt className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" />Renewal / expiry</dt><dd className="mt-1 font-bold">{formatDate(data.currentPeriodEnd)}</dd></div></dl>
    </article>
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="font-black">Included with your plan</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{(plan?.features || []).slice(0, 10).map((feature: string) => <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{feature}</li>)}</ul></article>
  </section>;
}
