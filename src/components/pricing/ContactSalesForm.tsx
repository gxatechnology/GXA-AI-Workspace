import React, { useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { PlanKey, PublicPlan } from '../../types/pricing';

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950';

export default function ContactSalesForm({ plan, onClose }: { plan: PublicPlan; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', workEmail: '', company: '', teamSize: '', useCase: '', message: '' });
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [submitted, setSubmitted] = useState(false);
  const update = (key: string, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try { const response = await fetch('/api/pricing/contact-sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, planKey: plan.key as PlanKey }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Your request could not be submitted.'); setSubmitted(true); }
    catch (cause: any) { setError(cause.message || 'Your request could not be submitted.'); }
    finally { setLoading(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3" role="dialog" aria-modal="true" aria-labelledby="contact-sales-title"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-teal-600">{plan.name}</p><h2 id="contact-sales-title" className="mt-1 text-2xl font-black">Contact Sales</h2><p className="mt-2 text-sm text-slate-500">Tell us what your organization needs. We will record the request for the GXA Technologies sales team.</p></div><button type="button" onClick={onClose} aria-label="Close contact form" className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button></div>
    {submitted ? <div className="py-16 text-center" role="status"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h3 className="mt-4 text-xl font-black">Request received</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Your {plan.name} enquiry was submitted successfully. The sales team can now review it.</p><button onClick={onClose} className="mt-6 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-950">Close</button></div> : <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-bold">Name<input required value={form.name} onChange={event => update('name', event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-bold">Work email<input required type="email" value={form.workEmail} onChange={event => update('workEmail', event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-bold">Company<input required value={form.company} onChange={event => update('company', event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-bold">Team size<select required value={form.teamSize} onChange={event => update('teamSize', event.target.value)} className={inputClass}><option value="">Select team size</option><option>1–10</option><option>11–50</option><option>51–200</option><option>201–1000</option><option>1000+</option></select></label>
      <label className="text-xs font-bold sm:col-span-2">Use case<textarea required rows={3} value={form.useCase} onChange={event => update('useCase', event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-bold sm:col-span-2">Additional message (optional)<textarea rows={3} value={form.message} onChange={event => update('message', event.target.value)} className={inputClass} /></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 sm:col-span-2 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Submit request</button></div>
    </form>}
  </div></div>;
}
