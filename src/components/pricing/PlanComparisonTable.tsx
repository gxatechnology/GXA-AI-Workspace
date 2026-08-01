import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Clock3, Minus, X } from 'lucide-react';
import { PlanComparison, PlanComparisonSection, PlanComparisonValue, PublicPlan } from '../../types/pricing';

function ComparisonValue({ value }: { value?: PlanComparisonValue }) {
  if (!value) return <span className="inline-flex items-center gap-1.5 text-slate-400"><Minus className="h-4 w-4" />Not configured</span>;
  if (value.kind === 'included') return <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" />{value.label}</span>;
  if (value.kind === 'excluded') return <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-zinc-500"><X className="h-4 w-4" />{value.label}</span>;
  if (value.kind === 'planned') return <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300"><Clock3 className="h-4 w-4" />{value.label}</span>;
  return <span className="font-bold text-slate-700 dark:text-zinc-200">{value.label}</span>;
}

interface ComparisonGroup {
  id: string;
  label: string;
  summary: string;
  sections: PlanComparisonSection[];
  defaultExpanded: boolean;
}

const sectionIds = ['general', 'ai-limits', 'projects-documents', 'history-storage', 'writing-tools', 'premium-ai-features', 'templates', 'support', 'security', 'future-integrations'];

function buildGroups(comparison: PlanComparison): ComparisonGroup[] {
  const byId = new Map(comparison.sections.map(section => [section.id, section]));
  const standard = sectionIds.flatMap(id => {
    const section = byId.get(id);
    return section ? [{ id, label: section.label, summary: `${section.rows.length} comparison ${section.rows.length === 1 ? 'point' : 'points'}`, sections: [section], defaultExpanded: ['general', 'ai-limits', 'writing-tools'].includes(id) }] : [];
  });
  const businessSections = comparison.sections.filter(section => section.id === 'business-studio' || section.id.startsWith('business-') && section.id !== 'business-studio');
  const businessTools = businessSections.filter(section => section.id !== 'business-studio').reduce((total, section) => total + section.rows.length, 0);
  const careerSection = byId.get('career-studio');
  const professionalGroups: ComparisonGroup[] = [
    { id: 'business-studio', label: 'Business Studio', summary: `${businessTools} registered tools across ${Math.max(0, businessSections.length - 1)} categories`, sections: businessSections, defaultExpanded: false },
    ...(careerSection ? [{ id: 'career-studio', label: 'Career Studio', summary: `${Math.max(0, careerSection.rows.length - 1)} available tools plus complete studio access`, sections: [careerSection], defaultExpanded: false }] : []),
  ];
  const insertAt = standard.findIndex(group => group.id === 'support');
  return [...standard.slice(0, insertAt), ...professionalGroups, ...standard.slice(insertAt)];
}

export default function PlanComparisonTable({ comparison, plans }: { comparison: PlanComparison; plans: PublicPlan[] }) {
  const groups = useMemo(() => buildGroups(comparison), [comparison]);
  const [expanded, setExpanded] = useState(() => new Set(groups.filter(group => group.defaultExpanded).map(group => group.id)));
  const toggle = (id: string) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return <section aria-labelledby="compare-plans-title" className="space-y-5">
    <div className="text-center">
      <p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">Full comparison</p>
      <h2 id="compare-plans-title" className="mt-2 text-2xl font-black sm:text-3xl">Compare every plan</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">Expand a group to inspect limits and every registered tool. All values come directly from the server plan and tool registries.</p>
    </div>
    <div className="max-h-[72vh] overflow-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full min-w-[820px] border-collapse text-left text-xs">
        <caption className="sr-only">Feature comparison for all public GXA AI Workspace plans</caption>
        <thead className="sticky top-0 z-30 bg-slate-950 text-white dark:bg-zinc-950">
          <tr>
            <th scope="col" className="sticky left-0 z-40 min-w-64 bg-slate-950 px-5 py-4 text-sm font-black dark:bg-zinc-950">Feature</th>
            {plans.map(plan => <th key={plan.key} scope="col" className={`min-w-36 px-4 py-4 text-center ${plan.key === 'business-pro' ? 'bg-teal-950/80' : ''}`}><span className="block text-sm font-black">{plan.name}</span><span className="mt-1 block font-medium text-slate-300">{plan.displayPrice}{plan.billingLabel === '/month' ? '/month' : ''}</span></th>)}
          </tr>
        </thead>
        {groups.map(group => {
          const open = expanded.has(group.id);
          return <React.Fragment key={group.id}>
            <tbody><tr><th colSpan={plans.length + 1} className="border-y border-slate-200 bg-slate-100 p-0 text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"><button type="button" aria-expanded={open} aria-controls={`comparison-group-${group.id}`} onClick={() => toggle(group.id)} className="flex min-h-12 w-full items-center justify-between gap-4 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"><span><span className="block text-xs font-black uppercase tracking-wider">{group.label}</span><span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-slate-500 dark:text-zinc-400">{group.summary}</span></span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} /></button></th></tr></tbody>
            <tbody id={`comparison-group-${group.id}`} hidden={!open}>
              {group.sections.flatMap(section => [
                ...(group.sections.length > 1 && section.id !== group.id ? [<tr key={`${section.id}-heading`}><th colSpan={plans.length + 1} className="bg-slate-50 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-teal-700 dark:bg-zinc-900 dark:text-teal-300">{section.label.replace(/^Business Studio · /, '')} · {section.rows.length} tools</th></tr>] : []),
                ...section.rows.map((row, index) => <tr key={row.id} className="border-b border-slate-100 odd:bg-slate-50/50 dark:border-zinc-800/70 dark:odd:bg-zinc-950/40">
                  <th scope="row" className="sticky left-0 z-10 bg-inherit px-5 py-3.5 font-bold text-slate-800 dark:text-zinc-100"><span>{row.label}</span>{row.description && <span className="mt-1 block max-w-sm text-[10px] font-normal leading-4 text-slate-500">{row.description}</span>}</th>
                  {plans.map(plan => <td key={plan.key} className={`px-4 py-3.5 text-center ${plan.key === 'business-pro' ? 'bg-teal-50/40 dark:bg-teal-950/10' : ''}`}><ComparisonValue value={row.values[plan.key]} /></td>)}
                </tr>),
              ])}
            </tbody>
          </React.Fragment>;
        })}
      </table>
    </div>
  </section>;
}
