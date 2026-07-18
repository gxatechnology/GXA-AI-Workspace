import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BriefcaseBusiness, CalendarDays, Copy, Download, FolderOpen,
  Languages, Loader2, Lock, Palette, Plus, Save, Trash2,
} from 'lucide-react';
import {
  BUSINESS_EXPORT_FORMATS, BUSINESS_LANGUAGES, BUSINESS_TOOLS, BUSINESS_TONES,
  CALENDAR_CADENCES, EMAIL_MODES, type BusinessToolDefinition,
} from '../../../shared/businessRegistry';
import type { WorkspaceId } from '../../types';
import { canonicalPlanKey } from '../../utils/pricing';

type StudioTab = 'home' | 'create' | 'brand' | 'calendar' | 'library';
type AssetKind = 'asset' | 'template';

interface StudioConfig {
  tools: BusinessToolDefinition[];
  languages: readonly string[];
  emailModes: readonly string[];
  tones: readonly string[];
  calendarCadences: readonly string[];
  exportFormats: readonly string[];
  currentPlan: 'free' | 'pro';
  dailyLimit: number;
  characterLimit: number;
}

const emptyKit = {
  companyName: '', tagline: '', industry: '', services: '', targetAudience: '', mission: '', vision: '',
  tone: 'Professional', preferredWords: '', blockedWords: '', ctaStyles: '', website: '',
  contactInformation: '', socialLinks: '', brandColors: '', terminology: '', glossary: '',
};

const fallbackConfig: StudioConfig = {
  tools: BUSINESS_TOOLS,
  languages: BUSINESS_LANGUAGES,
  emailModes: EMAIL_MODES,
  tones: BUSINESS_TONES,
  calendarCadences: CALENDAR_CADENCES,
  exportFormats: BUSINESS_EXPORT_FORMATS,
  currentPlan: 'free',
  dailyLimit: 10,
  characterLimit: 20000,
};

const authHeaders = (user?: any): Record<string, string> => user?.sessionToken && !user.guest
  ? { Authorization: `Bearer ${user.sessionToken}` }
  : {};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]!));

export default function BusinessStudio({
  currentUser, onOpenUpgradeModal, onSelectWorkspace, setSharedText, initialText = '',
}: {
  currentUser?: any;
  onOpenUpgradeModal: () => void;
  onSelectWorkspace: (id: WorkspaceId) => void;
  setSharedText: (text: string) => void;
  initialText?: string;
}) {
  if (currentUser?.guest) currentUser = undefined;
  const authenticated = Boolean(currentUser);
  const auth = useMemo(() => authHeaders(currentUser), [currentUser]);
  const [config, setConfig] = useState<StudioConfig>(() => ({
    ...fallbackConfig,
    currentPlan: canonicalPlanKey(currentUser?.subscription) === 'free' || !canonicalPlanKey(currentUser?.subscription) ? 'free' : 'pro',
  }));
  const [tab, setTab] = useState<StudioTab>('home');
  const [toolId, setToolId] = useState('professional-email');
  const [brief, setBrief] = useState(initialText);
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [language, setLanguage] = useState('English');
  const [emailMode, setEmailMode] = useState('Professional');
  const [recipient, setRecipient] = useState('');
  const [cta, setCta] = useState('');
  const [ctaSuggestions, setCtaSuggestions] = useState(true);
  const [hashtagSuggestions, setHashtagSuggestions] = useState(true);
  const [emojiLevel, setEmojiLevel] = useState('None');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [channels, setChannels] = useState('');
  const [messaging, setMessaging] = useState('');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [kpis, setKpis] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [approval, setApproval] = useState('');
  const [version, setVersion] = useState('');
  const [reviewSchedule, setReviewSchedule] = useState('');
  const [calendarCadence, setCalendarCadence] = useState('Monthly');
  const [output, setOutput] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [brandKitId, setBrandKitId] = useState('');
  const [kit, setKit] = useState<any>(emptyKit);
  const [assets, setAssets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [copied, setCopied] = useState(false);

  const tool = config.tools.find((candidate) => candidate.id === toolId) || config.tools[0] || BUSINESS_TOOLS[0];
  const categories = useMemo(() => [...new Set(config.tools.map((item) => item.category))], [config.tools]);
  const overLimit = brief.length > config.characterLimit;
  const nearLimit = brief.length >= config.characterLimit * 0.85;
  const isCampaign = tool.outputType === 'campaign' || tool.outputType === 'calendar';
  const isProposal = tool.category === 'Proposals';
  const isSocial = tool.outputType === 'social';
  const isSop = tool.id === 'sop';

  useEffect(() => {
    fetch('/api/business/config', { headers: auth })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body) => setConfig({ ...fallbackConfig, ...body }))
      .catch(() => setError('Business configuration is temporarily unavailable. Safe defaults are shown.'));
    if (!authenticated) return;
    Promise.all([
      fetch('/api/business/brand-kits', { headers: auth }).then((response) => response.json()),
      fetch('/api/business/assets', { headers: auth }).then((response) => response.json()),
      fetch('/api/projects', { headers: auth }).then((response) => response.json()),
    ]).then(([kitData, assetData, projectData]) => {
      setBrandKits(kitData.brandKits || []);
      setAssets(assetData.assets || []);
      setProjects(projectData.projects || []);
    }).catch(() => setError('Saved business data could not be loaded.'));
  }, [authenticated, auth]);

  const locked = (candidate: BusinessToolDefinition) => candidate.requiredPlan === 'pro' && config.currentPlan === 'free';
  const selectTool = (id: string) => {
    const selected = config.tools.find((candidate) => candidate.id === id);
    if (!selected) return;
    if (locked(selected)) return onOpenUpgradeModal();
    setToolId(id);
    setTab(id === 'content-calendar' ? 'calendar' : 'create');
    setOutput('');
    setWarnings([]);
    setError('');
    setStatus('');
  };

  const generate = async () => {
    if (!brief.trim() || overLimit) return;
    setLoading(true);
    setError('');
    setStatus('');
    setWarnings([]);
    try {
      const response = await fetch('/api/business/generate', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId, brief, tone, length, language, emailMode, recipient, cta, ctaSuggestions,
          hashtagSuggestions, emojiLevel, goal, audience,
          channels: channels.split(',').map((item) => item.trim()).filter(Boolean),
          messaging, timeline, budget, deliverables, kpis, assumptions, exclusions,
          workflow, responsibilities, approval, version, reviewSchedule, calendarCadence,
          brandKitId: brandKitId || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (body.code === 'PREMIUM_BUSINESS_TOOL') onOpenUpgradeModal();
        setError(body.error || 'Generation failed. Your brief is preserved.');
        return;
      }
      setOutput(body.result.text);
      setWarnings(body.result.warnings || []);
      setStatus(`Generated successfully · ${body.usage.used} of ${body.usage.limit || 'unlimited'} daily requests used.`);
    } catch {
      setError('The service could not be reached. Your brief is preserved.');
    } finally {
      setLoading(false);
    }
  };

  const saveKit = async () => {
    if (!authenticated) return onOpenUpgradeModal();
    setError('');
    const payload = {
      ...kit,
      preferredWords: kit.preferredWords.split(',').map((item: string) => item.trim()).filter(Boolean),
      blockedWords: kit.blockedWords.split(',').map((item: string) => item.trim()).filter(Boolean),
      brandColors: kit.brandColors.split(',').map((item: string) => item.trim()).filter(Boolean),
    };
    try {
      const response = await fetch('/api/business/brand-kits', {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) return setError(body.error);
      setBrandKits((current) => [body.brandKit, ...current]);
      setBrandKitId(body.brandKit.id);
      setKit(emptyKit);
      setStatus('Brand Kit saved privately and is ready for every Business Studio generator.');
    } catch {
      setError('Brand Kit could not be saved. Your entries are preserved.');
    }
  };

  const removeKit = async (id: string) => {
    const response = await fetch(`/api/business/brand-kits/${id}`, { method: 'DELETE', headers: auth });
    if (!response.ok) return setError('Brand Kit could not be deleted.');
    setBrandKits((current) => current.filter((item) => item.id !== id));
    if (brandKitId === id) setBrandKitId('');
  };

  const saveAsset = async (kind: AssetKind = 'asset') => {
    if (!authenticated) return onOpenUpgradeModal();
    try {
      const response = await fetch('/api/business/assets', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tool.name, toolId, content: output, brief, projectId: projectId || undefined, kind }),
      });
      const body = await response.json();
      if (!response.ok) return setError(body.error);
      setAssets((current) => [body.asset, ...current]);
      setStatus(kind === 'template' ? 'Reusable template saved.' : projectId ? 'Asset saved to the selected Project.' : 'Business asset saved.');
    } catch {
      setError('The asset could not be saved. Your output is preserved.');
    }
  };

  const removeAsset = async (id: string) => {
    const response = await fetch(`/api/business/assets/${id}`, { method: 'DELETE', headers: auth });
    if (!response.ok) return setError('The saved item could not be deleted.');
    setAssets((current) => current.filter((item) => item.id !== id));
  };

  const useSavedItem = (asset: any) => {
    const selected = config.tools.find((candidate) => candidate.id === asset.toolId);
    if (selected && !locked(selected)) setToolId(selected.id);
    setBrief(asset.brief || '');
    setOutput(asset.content || '');
    setTab(selected?.id === 'content-calendar' ? 'calendar' : 'create');
    setStatus('Opened as a new editable draft. The saved source remains unchanged.');
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportOutput = async (format: string) => {
    if (!output) return;
    const filename = tool.id;
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return setError('Allow pop-ups to open the printable PDF view.');
      printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(tool.name)}</title><style>body{font:14px/1.6 Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;white-space:pre-wrap}</style></head><body><h1>${escapeHtml(tool.name)}</h1>${escapeHtml(output)}</body></html>`);
      printWindow.document.close();
      printWindow.print();
      return;
    }
    if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const document = new Document({ sections: [{ children: [
        new Paragraph({ children: [new TextRun({ text: tool.name, bold: true, size: 32 })] }),
        ...output.split('\n').map((line) => new Paragraph({ children: [new TextRun(line)] })),
      ] }] });
      triggerDownload(await Packer.toBlob(document), `${filename}.docx`);
      return;
    }
    const value = format === 'html'
      ? `<!doctype html><html><meta charset="utf-8"><body><article>${escapeHtml(output).replace(/\n/g, '<br>')}</article></body></html>`
      : format === 'md' ? `# ${tool.name}\n\n${output}` : output;
    const mime = format === 'html' ? 'text/html' : format === 'md' ? 'text/markdown' : 'text/plain';
    triggerDownload(new Blob([value], { type: `${mime};charset=utf-8` }), `${filename}.${format}`);
  };

  const handoff = (workspace: WorkspaceId) => {
    setSharedText(output);
    onSelectWorkspace(workspace);
  };

  const field = (label: string, value: string, setter: (value: string) => void, multiline = false) => (
    <label className="text-xs font-bold">{label}{multiline
      ? <textarea rows={3} value={value} onChange={(event) => setter(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950" />
      : <input value={value} onChange={(event) => setter(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950" />}
    </label>
  );

  return <div className="mx-auto max-w-7xl space-y-4 pb-14">
    <header>
      <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl"><BriefcaseBusiness className="h-7 w-7 text-teal-500" />Business, Marketing and Communication Studio</h1>
      <p className="mt-1 text-sm text-slate-500">Create grounded business assets from factual inputs and reusable private brand context.</p>
    </header>

    <nav aria-label="Business Studio" className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {([['home', 'Overview'], ['create', 'Create'], ['brand', 'Brand Kits'], ['calendar', 'Content Calendar'], ['library', 'Templates & Assets']] as const).map(([id, label]) =>
        <button key={id} onClick={() => { setError(''); setStatus(''); id === 'calendar' ? selectTool('content-calendar') : setTab(id); }} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${tab === id ? 'bg-teal-500 text-white' : 'text-slate-500'}`}>{label}</button>)}
    </nav>

    {error && <div role="alert" className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</div>}
    {status && <div aria-live="polite" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{status}</div>}

    {tab === 'home' && <>
      <section className="rounded-3xl bg-slate-950 p-7 text-white">
        <h2 className="max-w-3xl text-3xl font-black">Plan campaigns and create consistent business communication</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">One studio connects email, marketing, social, commerce, proposals, operations, reports and planning.</p>
        <div className="mt-5 flex flex-wrap gap-2">{['professional-email', 'campaign-planner', 'proposal', 'linkedin', 'content-calendar'].map((id) => {
          const item = config.tools.find((candidate) => candidate.id === id);
          return item && <button key={id} onClick={() => selectTool(id)} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900">{locked(item) && <Lock className="mr-1 inline h-3 w-3" />}{item.name}</button>;
        })}</div>
      </section>
      {categories.map((category) => <section key={category}>
        <h2 className="mb-2 text-lg font-black">{category}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{config.tools.filter((item) => item.category === category).map((item) =>
          <button key={item.id} onClick={() => selectTool(item.id)} className="rounded-2xl border bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <strong>{locked(item) && <Lock className="mr-1 inline h-3.5 w-3.5 text-amber-500" />}{item.name}</strong>
            <p className="mt-1 text-xs text-slate-500">{item.description}</p>
            {item.informationalOnly && <span className="mt-2 inline-block text-[10px] font-bold text-amber-600">Informational only</span>}
          </button>)}</div>
      </section>)}
    </>}

    {(tab === 'create' || tab === 'calendar') && <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div><h2 className="text-xl font-black">{tool.name}</h2><p className="text-xs text-slate-500">{tool.description}</p></div>
          <select aria-label="Business tool" value={toolId} onChange={(event) => selectTool(event.target.value)} className="max-w-full rounded-lg border p-2 text-xs dark:bg-zinc-950 sm:max-w-60">
            {config.tools.map((item) => <option key={item.id} value={item.id}>{locked(item) ? 'Locked · ' : ''}{item.name}</option>)}
          </select>
        </div>
        <label className="mt-4 block text-xs font-bold">Factual brief
          <textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Product, offer, facts, requirements and source notes…" className="mt-1 min-h-44 w-full rounded-xl border p-3 dark:bg-zinc-950" />
        </label>
        <div className={`mt-1 text-right text-xs font-bold ${overLimit ? 'text-rose-600' : nearLimit ? 'text-amber-600' : 'text-slate-400'}`}>{brief.length.toLocaleString()} / {config.characterLimit.toLocaleString()} characters</div>
        {overLimit && <p className="text-xs text-rose-600">Reduce the brief below the configured limit to re-enable generation. Your text is preserved.</p>}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">Brand Kit<select value={brandKitId} onChange={(event) => setBrandKitId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950"><option value="">No Brand Kit</option>{brandKits.map((item) => <option key={item.id} value={item.id}>{item.companyName}</option>)}</select></label>
          <label className="text-xs font-bold">Language<select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950">{config.languages.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs font-bold">Tone library<select value={tone} onChange={(event) => setTone(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950">{config.tones.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs font-bold">Length<select value={length} onChange={(event) => setLength(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950">{['Short', 'Medium', 'Long'].map((item) => <option key={item}>{item}</option>)}</select></label>
          {tool.outputType === 'email' && <>
            <label className="text-xs font-bold">Email mode<select value={emailMode} onChange={(event) => setEmailMode(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950">{config.emailModes.map((item) => <option key={item}>{item}</option>)}</select></label>
            {field('Recipient', recipient, setRecipient)}
          </>}
          {field('CTA', cta, setCta)}
          {isSocial && <>
            <label className="text-xs font-bold">Emoji controls<select value={emojiLevel} onChange={(event) => setEmojiLevel(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950">{['None', 'Light', 'Balanced'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={ctaSuggestions} onChange={(event) => setCtaSuggestions(event.target.checked)} />CTA suggestions</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={hashtagSuggestions} onChange={(event) => setHashtagSuggestions(event.target.checked)} />Hashtag suggestions</label>
            {tool.platformLimit && <p className="text-xs text-slate-500 sm:col-span-2">Configured {tool.platform} limit: {tool.platformLimit.toLocaleString()} characters per applicable item.</p>}
          </>}
          {(isCampaign || isProposal) && <>
            {field('Goal', goal, setGoal)}
            {field('Audience', audience, setAudience)}
            {field('Channels, comma separated', channels, setChannels)}
            {field('Messaging', messaging, setMessaging, true)}
            {field('Timeline', timeline, setTimeline)}
            {field('Budget / pricing (user supplied only)', budget, setBudget)}
            {field('Deliverables', deliverables, setDeliverables, true)}
            {field('KPIs (user supplied)', kpis, setKpis)}
          </>}
          {isProposal && <>{field('Assumptions', assumptions, setAssumptions, true)}{field('Exclusions', exclusions, setExclusions, true)}</>}
          {isSop && <>
            {field('Workflow', workflow, setWorkflow, true)}
            {field('Responsibilities', responsibilities, setResponsibilities, true)}
            {field('Approval', approval, setApproval)}
            {field('Version', version, setVersion)}
            {field('Review schedule', reviewSchedule, setReviewSchedule)}
          </>}
          {tool.outputType === 'calendar' && <label className="text-xs font-bold">Calendar cadence<select value={calendarCadence} onChange={(event) => setCalendarCadence(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950">{config.calendarCadences.map((item) => <option key={item}>{item}</option>)}</select></label>}
        </div>
        <button onClick={generate} disabled={loading || !brief.trim() || overLimit} className="mt-4 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">{loading ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Generating…</> : output ? 'Regenerate' : 'Generate'}</button>
        {tool.informationalOnly && <p className="mt-2 text-xs text-amber-700">Informational draft only. Obtain qualified legal review.</p>}
      </div>

      <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-black">Editable output</h2>
        <textarea value={output} onChange={(event) => setOutput(event.target.value)} placeholder="No sample output is preloaded." className="mt-3 min-h-[430px] w-full rounded-xl border p-3 leading-6 dark:bg-zinc-950" />
        {warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-700">{warning}</p>)}
        {authenticated && <label className="mt-3 block text-xs font-bold">Save into Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950"><option value="">No Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={!output} onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="rounded-lg border px-3 py-2 text-xs font-bold"><Copy className="mr-1 inline h-3 w-3" />{copied ? 'Copied' : 'Copy'}</button>
          <button disabled={!output} onClick={() => saveAsset('asset')} className="rounded-lg border px-3 py-2 text-xs font-bold"><Save className="mr-1 inline h-3 w-3" />Save</button>
          <button disabled={!output} onClick={() => saveAsset('template')} className="rounded-lg border px-3 py-2 text-xs font-bold">Save template</button>
          {config.exportFormats.map((format) => <button key={format} disabled={!output} onClick={() => exportOutput(format)} className="rounded-lg border px-3 py-2 text-xs font-bold"><Download className="mr-1 inline h-3 w-3" />{format.toUpperCase()}</button>)}
          {tool.outputType === 'calendar' && <button disabled={!output} onClick={() => { setStatus('Duplicated into a new editable calendar draft.'); setProjectId(''); }} className="rounded-lg border px-3 py-2 text-xs font-bold"><CalendarDays className="mr-1 inline h-3 w-3" />Duplicate</button>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs dark:border-zinc-800">
          <button disabled={!output} onClick={() => handoff('grammar')} className="rounded-lg border px-3 py-2 font-bold">Grammar</button>
          <button disabled={!output} onClick={() => handoff('paraphrasing')} className="rounded-lg border px-3 py-2 font-bold">Paraphrase</button>
          <button disabled={!output} onClick={() => handoff('translation')} className="rounded-lg border px-3 py-2 font-bold"><Languages className="mr-1 inline h-3 w-3" />Translate</button>
          <button disabled={!output} onClick={() => handoff('ai-humanizer')} className="rounded-lg border px-3 py-2 font-bold">Humanize</button>
          <button disabled={!output} onClick={() => handoff('grammar')} className="rounded-lg border px-3 py-2 font-bold">Readability review</button>
          <button disabled={!output} onClick={() => handoff('images')} className="rounded-lg border px-3 py-2 font-bold">Create visual</button>
        </div>
      </div>
    </section>}

    {tab === 'brand' && <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="flex items-center gap-2 text-xl font-black"><Palette className="h-5 w-5" />Brand Kit</h2>
        <p className="text-sm text-slate-500">Private reusable brand context for every generator in this studio. Blocked words are checked after generation.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{[
          ['companyName', 'Company name'], ['tagline', 'Tagline'], ['industry', 'Industry'], ['tone', 'Tone'], ['website', 'Website'],
          ['contactInformation', 'Contact information'], ['targetAudience', 'Target audience'], ['services', 'Services'], ['mission', 'Mission'],
          ['vision', 'Vision'], ['preferredWords', 'Preferred words, comma separated'], ['blockedWords', 'Blocked words, comma separated'],
          ['ctaStyles', 'CTA styles'], ['socialLinks', 'Social links'], ['brandColors', 'Brand colors, comma separated'],
          ['terminology', 'Terminology'], ['glossary', 'Glossary'],
        ].map(([key, label]) => <label key={key} className={`text-xs font-bold ${['services', 'targetAudience', 'mission', 'vision', 'terminology', 'glossary'].includes(key) ? 'sm:col-span-2' : ''}`}>{label}<textarea rows={['services', 'targetAudience', 'mission', 'vision', 'terminology', 'glossary'].includes(key) ? 3 : 1} value={kit[key]} onChange={(event) => setKit({ ...kit, [key]: event.target.value })} className="mt-1 w-full rounded-lg border p-2 dark:bg-zinc-950" /></label>)}</div>
        <button onClick={saveKit} className="mt-4 rounded-xl bg-teal-500 px-4 py-2 font-bold text-white"><Plus className="mr-1 inline h-4 w-4" />Save Brand Kit</button>
      </div>
      <div className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-black">Saved Brand Kits</h2>
        {!authenticated ? <button onClick={onOpenUpgradeModal} className="mt-4 rounded-xl bg-teal-500 px-4 py-2 font-bold text-white">Sign in to manage Brand Kits</button> : <div className="mt-3 divide-y dark:divide-zinc-800">
          {brandKits.map((item) => <div key={item.id} className="flex items-center justify-between py-3"><div><strong>{item.companyName}</strong><p className="text-xs text-slate-500">{item.industry || 'No industry'} · {item.tone}</p></div><button onClick={() => removeKit(item.id)} aria-label={`Delete ${item.companyName}`}><Trash2 className="h-4 w-4 text-rose-500" /></button></div>)}
          {!brandKits.length && <p className="py-10 text-center text-sm text-slate-400">No Brand Kits yet.</p>}
        </div>}
      </div>
    </section>}

    {tab === 'library' && <section className="rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="flex items-center gap-2 text-xl font-black"><FolderOpen className="h-5 w-5" />Saved Templates & Business Assets</h2>
      {!authenticated ? <button onClick={onOpenUpgradeModal} className="mt-4 rounded-xl bg-teal-500 px-4 py-2 font-bold text-white">Sign in to access saved items</button> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((item) => <article key={item.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><div><span className="text-[10px] font-black uppercase text-teal-600">{item.kind || 'asset'}</span><strong className="block">{item.title}</strong><p className="text-xs text-slate-500">{config.tools.find((candidate) => candidate.id === item.toolId)?.name || item.toolId}</p></div><button onClick={() => removeAsset(item.id)} aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4 text-rose-500" /></button></div><button onClick={() => useSavedItem(item)} className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-bold">Open as new draft</button></article>)}
        {!assets.length && <p className="text-sm text-slate-400">No saved templates or assets yet.</p>}
      </div>}
    </section>}

    <footer className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">CRM sync, direct social publishing, ad-account publishing, performance prediction and legal advice are not claimed because those secure integrations are not configured.</footer>
  </div>;
}
