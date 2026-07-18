import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { WorkspaceId } from '../../types';

interface Props {
  currentUser?: any;
  onRequireAuth: (mode: 'login' | 'register', returnTo: WorkspaceId) => void;
  onSelectWorkspace: (id: WorkspaceId) => void;
}

const formatPrice = (plan: any) => {
  if (plan.billingType === 'contact') return plan.id === 'enterprise' ? 'Custom Pricing' : 'Contact Sales';
  return `₹${Number(plan.monthlyPrice || 0).toLocaleString('en-IN')}/month`;
};

export default function Pricing({ currentUser, onRequireAuth, onSelectWorkspace }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/platform/plans').then(async response => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Pricing is unavailable.');
      setPlans(body.plans || []);
    }).catch(cause => setError(cause.message)).finally(() => setLoading(false));
  }, []);

  const selectPlan = (plan: any) => {
    if (plan.billingType === 'contact') { window.location.href = `mailto:sales@gxatechnologies.com?subject=${encodeURIComponent(`${plan.name} plan enquiry`)}`; return; }
    if (plan.billingType === 'free') { onSelectWorkspace('home'); return; }
    localStorage.setItem('gxa_checkout_plan', plan.id);
    if (!currentUser?.sessionToken || currentUser?.guest) onRequireAuth('login', 'billing');
    else onSelectWorkspace('billing');
  };

  return <div className="mx-auto max-w-7xl space-y-8 pb-12">
    <header className="text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">Plans and pricing</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Simple INR pricing, resolved by the backend</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">Explore every plan before signing in. Checkout begins only after you choose a paid plan and authenticate.</p></header>
    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-500" aria-label="Loading pricing" /></div> : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{plans.map(plan => <article key={plan.id} className={`flex min-w-0 flex-col rounded-3xl border bg-white p-5 dark:bg-zinc-900 ${plan.id === 'pro_plus' ? 'border-teal-500 shadow-lg shadow-teal-500/10' : 'border-slate-200 dark:border-zinc-800'}`}>
      <div><h2 className="text-lg font-black">{plan.name}</h2><p className="mt-2 min-h-12 text-xl font-black text-teal-700 dark:text-teal-300">{formatPrice(plan)}</p></div>
      <ul className="mt-5 flex-1 space-y-2 text-xs text-slate-600 dark:text-zinc-300">{(plan.entitlements || []).slice(0, 8).map((feature: string) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /><span>{feature.replaceAll('_', ' ')}</span></li>)}</ul>
      <button onClick={() => selectPlan(plan)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-teal-700 dark:bg-white dark:text-slate-950">{plan.billingType === 'free' ? 'Use free workspace' : plan.billingType === 'contact' ? (plan.id === 'enterprise' ? 'Request pricing' : 'Contact Sales') : 'Choose plan'}<ArrowRight className="h-4 w-4" /></button>
    </article>)}</div>}
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 dark:border-zinc-800 dark:bg-zinc-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><p>Payments are processed through Razorpay when configured. A frontend callback never activates a subscription; the backend verifies the provider signature and waits for a signed provider webhook.</p></div>
  </div>;
}
