import React from 'react';
import { ArrowRight, BriefcaseBusiness, Check, LockKeyhole } from 'lucide-react';

export default function StudioPlanGate({ studio, description, benefits, onUpgrade }: { studio: string; description: string; benefits: string[]; onUpgrade: () => void }) {
  return <section className="mx-auto flex min-h-[65vh] max-w-4xl items-center justify-center py-8" aria-labelledby="studio-plan-gate-title">
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <div className="grid md:grid-cols-[1.05fr_.95fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-200"><LockKeyhole className="h-3.5 w-3.5" />Business Pro required</span>
          <h1 id="studio-plan-gate-title" className="mt-5 text-3xl font-black">Unlock {studio}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-zinc-400">{description}</p>
          <button type="button" onClick={onUpgrade} className="theme-primary-action mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black">Upgrade to Business Pro <ArrowRight className="h-4 w-4" /></button>
          <p className="mt-3 text-xs text-slate-400">Your current workspace data is preserved. You can compare plans before continuing.</p>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-950 md:border-l md:border-t-0 sm:p-8 lg:p-10">
          <BriefcaseBusiness className="h-8 w-8 text-teal-600" />
          <h2 className="mt-4 text-sm font-black">Included with Business Pro</h2>
          <ul className="mt-4 space-y-3">{benefits.map(benefit => <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{benefit}</li>)}</ul>
        </div>
      </div>
    </div>
  </section>;
}
