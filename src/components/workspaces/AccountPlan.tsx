import React, { useEffect, useState } from 'react';
import { Archive, ArrowRight, CalendarDays, Check, CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';
import { WorkspaceId } from '../../types';
import { authenticatedFetch } from '../../utils/auth';

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not scheduled';
const primaryButton = 'theme-primary-action inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50';

export default function AccountPlan({ currentUser, onSelectWorkspace }: { currentUser: any; onSelectWorkspace: (id: WorkspaceId) => void }) {
  const [data, setData] = useState<any>(null); const [error, setError] = useState(''); const [manageOpen, setManageOpen] = useState(false);
  const [checkout, setCheckout] = useState<any>(null); const [paymentState, setPaymentState] = useState(''); const [paymentError, setPaymentError] = useState('');

  const request = async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers); if (init.body) headers.set('Content-Type', 'application/json');
    const response = await authenticatedFetch(currentUser, url, { ...init, headers }); const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'The request could not be completed.'); return body;
  };
  const load = async (active = () => true) => {
    try { const [billing, selection] = await Promise.all([request('/api/platform/billing'), request('/api/pricing/selection')]); if (active()) setData({ ...billing, selectedPlan: selection.plan, selection: selection.selection }); }
    catch (reason: any) { if (active()) setError(reason.message); }
  };
  useEffect(() => { let active = true; load(() => active); return () => { active = false; }; }, [currentUser?.id]);

  const preparePayment = async () => {
    const selected = data?.selectedPlan; if (!selected) return;
    if (data.billingMode === 'orders' && data.currentPlanKey !== 'free' && Number(selected.rank) > Number(data.plan?.rank || 0) && !window.confirm(`Your current ${data.plan.name} access period will be replaced immediately. ${selected.name} will start a new one-month access period without proration. Continue?`)) return;
    setPaymentState('Preparing payment'); setPaymentError('');
    try {
      const endpoint = data.billingMode === 'subscriptions' ? '/api/billing/subscriptions' : '/api/billing/checkout';
      const body = await request(endpoint, { method: 'POST', body: JSON.stringify({ planKey: selected.key }) });
      if (body.checkout.planKey !== selected.key || body.checkout.amount !== selected.monthlyPrice * 100) throw new Error('Checkout details do not match the selected plan. Payment was stopped.');
      setCheckout(body.checkout); setPaymentState('Ready for secure payment');
    } catch (reason: any) { setPaymentState(''); setPaymentError(reason.message || 'Payment could not be started. Please try again.'); }
  };
  const pay = async () => {
    if (!checkout) return; setPaymentError('');
    try {
      await openRazorpay(checkout, currentUser, setPaymentState, async response => {
        setPaymentState(data.billingMode === 'subscriptions' ? 'Authentication submitted. Verifying subscription' : 'Payment submitted. Verifying payment');
        const endpoint = data.billingMode === 'subscriptions' ? '/api/billing/subscriptions/verify' : '/api/billing/verify';
        const verificationPayload = data.billingMode === 'subscriptions'
          ? { razorpay_subscription_id: response.razorpay_subscription_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }
          : { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature };
        const verified = await request(endpoint, { method: 'POST', body: JSON.stringify(verificationPayload) });
        if (data.billingMode === 'subscriptions' && !verified.active) { setPaymentState('Your subscription is being verified. Access will activate after confirmation.'); setCheckout(null); await load(); return; }
        if (data.billingMode !== 'subscriptions' && verified.status !== 'active') throw new Error('Payment verification is not complete. Your current plan remains unchanged.');
        setPaymentState(data.billingMode === 'subscriptions' ? 'Your subscription is active.' : 'Your payment was successful and your plan is now active.'); window.setTimeout(() => window.location.reload(), 900);
      });
    } catch (reason: any) { const dismissed = reason.message === 'Payment was not completed. Your current plan remains unchanged.'; setPaymentState(dismissed ? 'Payment dismissed' : 'Payment verification failed'); setPaymentError(reason.message || 'Payment verification failed. No plan change was made.'); }
  };

  const cancelSubscription = async (subscription: any) => {
    if (!window.confirm(`Cancel ${subscription.planName} at the end of the current billing period? Your saved work will remain available.`)) return;
    setPaymentState('Scheduling cancellation'); setPaymentError('');
    try { const result = await request(`/api/billing/subscriptions/${encodeURIComponent(subscription.id)}/cancel`, { method: 'POST', body: JSON.stringify({ confirm: true }) }); setPaymentState(result.message || 'Cancellation is scheduled.'); setManageOpen(false); await load(); }
    catch (reason: any) { setPaymentState(''); setPaymentError(reason.message || 'Cancellation could not be scheduled.'); }
  };

  if (error) return <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><strong>Plan details unavailable</strong><p className="mt-2">{error} No account data was changed.</p></div>;
  if (!data) return <div className="flex min-h-80 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /><span className="ml-2 text-sm text-slate-500">Loading your plan…</span></div>;
  const plan = data.plan; const selected = data.selectedPlan; const managedSubscription = data.subscriptions?.find((item: any) => item.billingMode === 'recurring_subscription' && ['active', 'pending', 'halted', 'paused', 'authenticated'].includes(item.status));
  const subscriptionMessage = managedSubscription?.status === 'pending' ? `Your renewal is pending. Current access remains available until ${formatDate(managedSubscription.currentPeriodEnd)}.` : managedSubscription?.status === 'halted' ? `Automatic renewal has stopped. Current access remains available until ${formatDate(managedSubscription.currentPeriodEnd)}.` : managedSubscription?.status === 'paused' ? `Your subscription is paused. Confirmed paid access remains available until ${formatDate(managedSubscription.currentPeriodEnd)}.` : null;
  const unavailable = data.checkoutAvailability?.reason === 'durable_billing_storage_required' ? 'Secure checkout is temporarily unavailable because durable payment storage is not active.' : data.checkoutAvailability?.reason === 'subscription_plans_not_configured' ? 'Recurring checkout is disabled until the Razorpay Test Mode plans are configured.' : 'Secure checkout is disabled until Razorpay Test Mode billing is configured.';

  return <section className="mx-auto max-w-4xl space-y-6"><header><p className="text-xs font-black uppercase tracking-widest text-teal-600">Account</p><h1 className="mt-1 text-2xl font-black">Plan</h1><p className="mt-1 text-sm text-slate-500">Review your current plan, billing status and monthly payment details.</p></header>
    <article className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current plan</p><h2 className="mt-2 text-3xl font-black">{plan?.displayName || plan?.name || 'Free'}</h2><p className="mt-1 text-sm text-slate-500">{plan?.description}</p><span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{data.subscriptionStatus || 'free'}</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onSelectWorkspace('pricing')} className={primaryButton}>Upgrade plan <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black dark:border-zinc-700"><CreditCard className="h-4 w-4" />Manage subscription</button></div></div>
      <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800"><div><dt className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" />Activation date</dt><dd className="mt-1 font-bold">{formatDate(data.activationDate)}</dd></div><div><dt className="text-xs text-slate-400">Period start</dt><dd className="mt-1 font-bold">{formatDate(data.currentPeriodStart)}</dd></div><div><dt className="text-xs text-slate-400">Period end</dt><dd className="mt-1 font-bold">{formatDate(data.currentPeriodEnd)}</dd></div><div><dt className="text-xs text-slate-400">Next billing date</dt><dd className="mt-1 font-bold">{formatDate(data.nextBillingDate)}</dd></div></dl>
    </article>
    {manageOpen && <div role="status" className="relative rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100"><button type="button" onClick={() => setManageOpen(false)} aria-label="Close plan details" className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-teal-100 dark:hover:bg-teal-900"><X className="h-4 w-4" /></button><p className="font-black">Plan management</p><p className="mt-1 pr-8">{subscriptionMessage || (managedSubscription ? managedSubscription.cancelAtPeriodEnd ? `Cancellation is scheduled for ${formatDate(managedSubscription.currentPeriodEnd)}. Your saved work remains safe.` : `Your ${managedSubscription.planName} subscription renews monthly. Provider-confirmed billing events control access.` : 'One-time monthly access does not renew automatically. Only a backend-verified payment can change your plan.')}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onSelectWorkspace('pricing')} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-black text-white">Compare plans</button>{managedSubscription && !managedSubscription.cancelAtPeriodEnd && <button type="button" onClick={() => cancelSubscription(managedSubscription)} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-black text-rose-700 dark:border-rose-800 dark:text-rose-200">Cancel at period end</button>}</div></div>}
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="font-black">Selected plan and secure payment</h2>{selected ? <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="text-xl font-black">{selected.name}</p><p className="mt-1 text-sm text-slate-500">{selected.displayPrice}/month · {data.billingMode === 'subscriptions' ? 'recurring monthly subscription' : 'one-time monthly access'}</p></div>{!checkout ? <button disabled={!data.provider || paymentState === 'Preparing payment'} onClick={preparePayment} className={primaryButton}>{paymentState === 'Preparing payment' && <Loader2 className="h-4 w-4 animate-spin" />}Prepare secure payment</button> : <button disabled={paymentState.includes('Verifying') || paymentState.includes('successful')} onClick={pay} className={primaryButton}><ShieldCheck className="h-4 w-4" />Continue to Secure Payment</button>}</div> : <div className="mt-4"><p className="text-sm text-slate-500">Choose Starter, Pro or Business Pro before starting payment.</p><button onClick={() => onSelectWorkspace('pricing')} className={`${primaryButton} mt-3`}>Choose a plan</button></div>}{!data.provider && <p className="mt-4 text-xs font-bold text-amber-700 dark:text-amber-300">{unavailable}</p>}{paymentState && <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-slate-100 p-3 text-xs font-bold dark:bg-zinc-800">{paymentState}</p>}{paymentError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">{paymentError}</p>}</article>
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="flex items-center gap-2 font-black"><Archive className="h-4 w-4 text-teal-600" />Payment history</h2>{data.payments?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b dark:border-zinc-700"><th className="p-2">Date</th><th>Plan</th><th>Amount</th><th>Type</th><th>Status</th><th>Reference</th></tr></thead><tbody>{data.payments.map((payment: any) => <tr key={payment.id} className="border-b dark:border-zinc-800"><td className="p-2">{formatDate(payment.date)}</td><td>{payment.planName}</td><td>₹{(Number(payment.amountMinor || 0) / 100).toFixed(2)} {payment.currency}</td><td className="capitalize">{payment.billingType}</td><td className="capitalize">{String(payment.status).replaceAll('_', ' ')}</td><td className="font-mono">{payment.reference}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No payment records are available for this workspace.</p>}<p className="mt-4 text-xs text-slate-500">Invoice download is not configured yet.</p></article>
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between gap-4"><h2 className="font-black">Plan benefits</h2><button type="button" onClick={() => onSelectWorkspace('pricing')} className="text-xs font-black text-teal-700 hover:underline dark:text-teal-300">Compare plans</button></div><ul className="mt-4 grid gap-3 sm:grid-cols-2">{(plan?.features || []).slice(0, 10).map((feature: string) => <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{feature}</li>)}</ul></article>
  </section>;
}

async function openRazorpay(checkout: any, user: any, onState: (state: string) => void, onSuccess: (response: any) => Promise<void>) {
  const win = window as any;
  if (!win.Razorpay) { onState('Loading secure checkout'); await new Promise<void>((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Secure checkout could not be loaded. Please try again.')); document.head.appendChild(script); }); }
  const prefill: Record<string, string> = { name: String(user?.name || ''), email: String(user?.email || '') }; if (user?.phone) prefill.contact = String(user.phone);
  await new Promise<void>((resolve, reject) => { const target = checkout.subscriptionId ? { subscription_id: checkout.subscriptionId } : { order_id: checkout.orderId }; const instance = new win.Razorpay({ key: checkout.keyId, ...target, amount: checkout.amount, currency: checkout.currency, name: 'GXA AI Workspace', description: checkout.description || `${checkout.planName} monthly subscription`, prefill, theme: { color: '#0d9488' }, handler: async (response: any) => { try { await onSuccess(response); resolve(); } catch (reason) { reject(reason); } }, modal: { ondismiss: () => reject(new Error('Payment was not completed. Your current plan remains unchanged.')) } }); onState('Secure checkout opened'); instance.open(); });
}
