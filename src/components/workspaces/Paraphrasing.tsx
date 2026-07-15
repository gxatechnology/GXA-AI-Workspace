import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeftRight, Check, Clipboard, Copy, Download, FilePlus2,
  Loader2, Lock, Redo2, RefreshCw, Save, Trash2, Undo2, Upload, X
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';
import { fetchSystemConfig, fetchUsage, incrementUsage, SystemConfig, UsageStats } from '../../utils/limits';

type ModeId = 'standard' | 'fluency' | 'humanize' | 'formal' | 'academic' | 'professional' | 'business' | 'creative' | 'simple' | 'expand' | 'shorten' | 'custom';
type PlanId = 'free' | 'pro' | 'pro_plus' | 'team' | 'enterprise';

interface ModeDefinition {
  id: ModeId;
  label: string;
  instruction: string;
}

interface ParaphrasingProps {
  sharedText?: string;
  setSharedText?: (text: string) => void;
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

const MODES: ModeDefinition[] = [
  { id: 'standard', label: 'Standard', instruction: 'Rewrite clearly while preserving the exact meaning.' },
  { id: 'fluency', label: 'Fluency', instruction: 'Improve flow, grammar, cadence, and readability without changing meaning.' },
  { id: 'humanize', label: 'Humanize', instruction: 'Rewrite with natural phrasing, varied rhythm, and authentic human expression.' },
  { id: 'formal', label: 'Formal', instruction: 'Rewrite in polished, objective, formal language.' },
  { id: 'academic', label: 'Academic', instruction: 'Rewrite as precise scholarly prose suitable for academic work.' },
  { id: 'professional', label: 'Professional', instruction: 'Rewrite for clear, confident professional communication.' },
  { id: 'business', label: 'Business', instruction: 'Rewrite as concise, action-oriented business communication.' },
  { id: 'creative', label: 'Creative', instruction: 'Rewrite with vivid, expressive language while preserving intent.' },
  { id: 'simple', label: 'Simple', instruction: 'Rewrite using plain language and short, accessible sentences.' },
  { id: 'expand', label: 'Expand', instruction: 'Expand the text with useful supporting context without inventing facts.' },
  { id: 'shorten', label: 'Shorten', instruction: 'Condense the text to its essential meaning.' },
  { id: 'custom', label: 'Custom', instruction: 'Follow the supplied custom rewrite instructions exactly.' }
];

const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, pro_plus: 2, team: 3, enterprise: 4 };

export default function Paraphrasing({ sharedText = '', setSharedText, currentUser, onOpenUpgradeModal }: ParaphrasingProps) {
  const [mode, setMode] = useState<ModeId>('standard');
  const [input, setInput] = useState(sharedText);
  const [output, setOutput] = useState('');
  const [versions, setVersions] = useState<string[]>([]);
  const [versionIndex, setVersionIndex] = useState(-1);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lockedMode, setLockedMode] = useState<ModeDefinition | null>(null);
  const [compare, setCompare] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50);
  const [synonymStrength, setSynonymStrength] = useState(2);
  const [freezeWords, setFreezeWords] = useState('');
  const [tone, setTone] = useState('Balanced');
  const [language, setLanguage] = useState('Same as input');
  const [outputLength, setOutputLength] = useState('Similar');
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [customInstruction, setCustomInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);

  const authenticated = Boolean(currentUser && !currentUser.guest);
  const userPlan = String(currentUser?.subscription || 'free').toLowerCase().replace(/\s+/g, '_').replace('+', '_plus') as PlanId;
  const effectivePlan: PlanId = userPlan in PLAN_RANK ? userPlan : 'free';
  const wordCount = useMemo(() => input.trim() ? input.trim().split(/\s+/).length : 0, [input]);
  const characterCount = input.length;
  const wordLimit = config?.paraphrase_word_limit || 125;
  const dailyLimit = config?.paraphrases_limit || 10;
  const dailyUsed = usage?.paraphrases || 0;
  const overWordLimit = wordCount > wordLimit;
  const nearWordLimit = !overWordLimit && wordCount >= Math.ceil(wordLimit * 0.85);
  const dailyLimitReached = PLAN_RANK[effectivePlan] === 0 && dailyUsed >= dailyLimit;
  const canGenerate = Boolean(input.trim()) && !overWordLimit && !dailyLimitReached && !loading && Boolean(config);

  useEffect(() => {
    let active = true;
    Promise.all([fetchSystemConfig(), fetchUsage(authenticated ? currentUser.email : 'guest')])
      .then(([nextConfig, nextUsage]) => { if (active) { setConfig(nextConfig); setUsage(nextUsage); } })
      .catch(() => { if (active) setError('Unable to load plan limits. Refresh and try again.'); });
    return () => { active = false; };
  }, [authenticated, currentUser?.email]);

  useEffect(() => {
    if (sharedText !== input && sharedText) setInput(sharedText);
  }, [sharedText]);

  useEffect(() => {
    const stop = () => { resizing.current = false; };
    const move = (event: PointerEvent) => {
      if (!resizing.current || !splitRef.current) return;
      const box = splitRef.current.getBoundingClientRect();
      setLeftWidth(Math.min(70, Math.max(30, ((event.clientX - box.left) / box.width) * 100)));
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointermove', move);
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointermove', move); };
  }, []);

  const entitlementFor = (id: ModeId): PlanId => config?.paraphraser_mode_entitlements?.[id] || (id === 'standard' || id === 'fluency' ? 'free' : 'pro_plus');
  const isLocked = (id: ModeId) => PLAN_RANK[effectivePlan] < PLAN_RANK[entitlementFor(id)];

  const updateInput = (value: string, record = true) => {
    if (record && value !== input) {
      setUndoStack(stack => [...stack.slice(-49), input]);
      setRedoStack([]);
    }
    setInput(value);
    setSharedText?.(value);
    setError('');
    setSaved(false);
  };

  const undo = () => {
    const previous = undoStack.at(-1);
    if (previous === undefined) return;
    setRedoStack(stack => [...stack, input]);
    setUndoStack(stack => stack.slice(0, -1));
    updateInput(previous, false);
  };

  const redo = () => {
    const next = redoStack.at(-1);
    if (next === undefined) return;
    setUndoStack(stack => [...stack, input]);
    setRedoStack(stack => stack.slice(0, -1));
    updateInput(next, false);
  };

  const selectMode = (nextMode: ModeDefinition) => {
    if (isLocked(nextMode.id)) { setLockedMode(nextMode); return; }
    setMode(nextMode.id);
    setError('');
  };

  const paste = async () => {
    try { updateInput(await navigator.clipboard.readText()); }
    catch { setError('Clipboard access was denied. Paste directly into the editor instead.'); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) { setError('Upload a TXT, Markdown, CSV, or JSON text file.'); return; }
    try { updateInput(await file.text()); }
    catch { setError('The selected file could not be read.'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildPrompt = () => {
    const active = MODES.find(item => item.id === mode)!;
    const frozen = freezeWords.split(',').map(item => item.trim()).filter(Boolean);
    return [
      `Rewrite mode: ${active.label}. ${active.instruction}`,
      `Synonym strength: ${['Low', 'Balanced', 'High'][synonymStrength - 1]}.`,
      `Tone: ${tone}. Output language: ${language}. Output length: ${outputLength}.`,
      `Preserve paragraph breaks, lists, and whitespace: ${preserveFormatting ? 'yes' : 'no'}.`,
      frozen.length ? `Do not change these words or phrases: ${frozen.join(', ')}.` : '',
      mode === 'custom' ? `Custom instructions: ${customInstruction || 'Rewrite clearly while preserving meaning.'}` : '',
      'Return only the rewritten text. Do not add commentary, headings, or quotation marks.',
      `Text:\n${input}`
    ].filter(Boolean).join('\n');
  };

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true); setError(''); setCopied(false); setSaved(false);
    try {
      const text = await generateContent({
        prompt: buildPrompt(),
        systemInstruction: 'You are the production GXA Paraphraser. Preserve factual meaning and never invent claims.'
      });
      if (!text.trim()) throw new Error('The model returned an empty response.');
      setOutput(text.trim());
      setVersions(items => [...items, text.trim()]);
      setVersionIndex(versions.length);
      const nextUsage = await incrementUsage(authenticated ? currentUser.email : 'guest', 'paraphrases');
      setUsage(nextUsage);
    } catch (reason: any) {
      setError(reason?.message || 'Paraphrasing failed. Your text has been preserved; please try again.');
    } finally { setLoading(false); }
  };

  const copy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { setError('Copy failed. Select the output and copy it manually.'); }
  };

  const save = async () => {
    if (!authenticated) { setError('Login is required to save outputs, history, or projects. Use Login in the header to continue.'); return; }
    if (!output) return;
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.email}` },
        body: JSON.stringify({ name: `Paraphrase - ${MODES.find(item => item.id === mode)?.label}`, pages: 1, size: `${output.length} characters`, extractedSnippet: output })
      });
      if (!response.ok) throw new Error('Save failed.');
      setSaved(true);
    } catch { setError('The output could not be saved. Your text remains available in this session.'); }
  };

  const exportOutput = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'gxa-paraphrase.txt'; anchor.click(); URL.revokeObjectURL(url);
  };

  const newVersion = () => {
    if (!output) return;
    setVersions(items => [...items, output]);
    setVersionIndex(versions.length);
  };

  const inputCounterClass = overWordLimit ? 'text-red-600' : nearWordLimit ? 'text-amber-600' : 'text-slate-400';

  return (
    <section className="max-w-[1500px] mx-auto space-y-4 text-left">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-teal-500" />Paraphraser</h1><p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Rewrite text in one focused workspace while preserving your intent.</p></div>
        <p className="text-[11px] text-slate-400">{config ? `${Math.max(0, dailyLimit - dailyUsed)} free generations remaining today` : 'Loading plan limits…'}</p>
      </header>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin" role="tablist" aria-label="Paraphrasing modes">
        {MODES.map(item => {
          const locked = isLocked(item.id);
          return <button key={item.id} role="tab" aria-selected={mode === item.id} onClick={() => selectMode(item)} className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition ${mode === item.id ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:border-teal-400'}`}>{item.label}{locked && <Lock className="h-3 w-3" />}</button>;
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3">
        <label className="text-[10px] font-bold text-slate-500">Synonym strength<select value={synonymStrength} onChange={event => setSynonymStrength(Number(event.target.value))} className="mt-1 w-full rounded-lg border bg-transparent p-2 text-xs dark:border-zinc-700"><option value={1}>Low</option><option value={2}>Balanced</option><option value={3}>High</option></select></label>
        <label className="text-[10px] font-bold text-slate-500">Tone<select value={tone} onChange={event => setTone(event.target.value)} className="mt-1 w-full rounded-lg border bg-transparent p-2 text-xs dark:border-zinc-700"><option>Balanced</option><option>Friendly</option><option>Confident</option><option>Neutral</option><option>Persuasive</option></select></label>
        <label className="text-[10px] font-bold text-slate-500">Language<select value={language} onChange={event => setLanguage(event.target.value)} className="mt-1 w-full rounded-lg border bg-transparent p-2 text-xs dark:border-zinc-700"><option>Same as input</option><option>English</option><option>Hindi</option><option>Spanish</option><option>French</option><option>German</option></select></label>
        <label className="text-[10px] font-bold text-slate-500">Output length<select value={outputLength} onChange={event => setOutputLength(event.target.value)} className="mt-1 w-full rounded-lg border bg-transparent p-2 text-xs dark:border-zinc-700"><option>Shorter</option><option>Similar</option><option>Longer</option></select></label>
        <label className="text-[10px] font-bold text-slate-500 sm:col-span-2">Freeze words<input value={freezeWords} onChange={event => setFreezeWords(event.target.value)} placeholder="Comma-separated words to preserve" className="mt-1 w-full rounded-lg border bg-transparent p-2 text-xs dark:border-zinc-700" /></label>
        <label className="sm:col-span-2 lg:col-span-6 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"><input type="checkbox" checked={preserveFormatting} onChange={event => setPreserveFormatting(event.target.checked)} />Preserve formatting</label>
        {mode === 'custom' && <label className="sm:col-span-2 lg:col-span-6 text-[10px] font-bold text-slate-500">Custom instructions<input value={customInstruction} onChange={event => setCustomInstruction(event.target.value)} placeholder="Describe how the output should be rewritten" className="mt-1 w-full rounded-lg border bg-transparent p-2 text-xs dark:border-zinc-700" /></label>}
      </div>

      {(error || overWordLimit || nearWordLimit || dailyLimitReached) && <div className={`rounded-xl border p-3 flex items-start gap-2 text-xs ${error || overWordLimit || dailyLimitReached ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900' : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900'}`}><AlertCircle className="h-4 w-4 shrink-0" /><span>{error || (overWordLimit ? `Limit exceeded by ${wordCount - wordLimit} words. Reduce the input to re-enable paraphrasing.` : dailyLimitReached ? 'Daily free usage limit reached. Upgrade for additional generations.' : `You are approaching the ${wordLimit}-word limit.`)}</span></div>}

      <div ref={splitRef} className="flex flex-col lg:flex-row min-h-[34rem] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <article className="flex flex-col min-w-0" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${leftWidth}%` : '100%' }}>
          <div className="h-12 border-b border-slate-100 dark:border-zinc-800 px-3 flex items-center justify-between"><span className="text-xs font-black">Original text</span><div className="flex items-center gap-1"><button onClick={undo} disabled={!undoStack.length} aria-label="Undo" className="p-2 disabled:opacity-30"><Undo2 className="h-4 w-4" /></button><button onClick={redo} disabled={!redoStack.length} aria-label="Redo" className="p-2 disabled:opacity-30"><Redo2 className="h-4 w-4" /></button><button onClick={paste} aria-label="Paste" className="p-2"><Clipboard className="h-4 w-4" /></button><button onClick={() => fileInputRef.current?.click()} aria-label="Upload text" className="p-2"><Upload className="h-4 w-4" /></button><button onClick={() => updateInput('')} aria-label="Clear" className="p-2 text-rose-500"><Trash2 className="h-4 w-4" /></button></div></div>
          <textarea value={input} onChange={event => updateInput(event.target.value)} onPaste={event => { const text = event.clipboardData.getData('text'); if (text) { event.preventDefault(); updateInput(input.slice(0, event.currentTarget.selectionStart) + text + input.slice(event.currentTarget.selectionEnd)); } }} placeholder="Type or paste the text you want to rewrite…" className="flex-1 min-h-72 resize-none bg-transparent p-4 text-sm leading-7 outline-none" />
          <div className="border-t border-slate-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between gap-3"><span className={`text-[11px] font-bold ${inputCounterClass}`}>{wordCount}/{wordLimit} words · {characterCount} characters</span><button onClick={generate} disabled={!canGenerate} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}{loading ? 'Paraphrasing…' : 'Paraphrase'}</button></div>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,text/plain" hidden onChange={event => upload(event.target.files?.[0])} />
        </article>

        <button aria-label="Resize panels" onPointerDown={() => { resizing.current = true; }} className="hidden lg:block w-1.5 cursor-col-resize bg-slate-100 hover:bg-teal-400 dark:bg-zinc-800 transition" />

        <article className="flex flex-col flex-1 min-w-0 border-t lg:border-t-0 border-slate-200 dark:border-zinc-800">
          <div className="min-h-12 border-b border-slate-100 dark:border-zinc-800 px-3 flex flex-wrap items-center justify-between gap-2"><div><span className="text-xs font-black">Paraphrased output</span>{versions.length > 0 && <span className="ml-2 text-[10px] text-slate-400">Version {Math.max(1, versionIndex + 1)} of {versions.length}</span>}</div><div className="flex items-center gap-1"><button onClick={copy} disabled={!output} className="inline-flex items-center gap-1 p-2 text-[11px] font-bold disabled:opacity-30">{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}Copy</button><button onClick={save} disabled={!output} className="inline-flex items-center gap-1 p-2 text-[11px] font-bold disabled:opacity-30"><Save className="h-4 w-4" />{saved ? 'Saved' : 'Save'}</button><button onClick={exportOutput} disabled={!output} className="inline-flex items-center gap-1 p-2 text-[11px] font-bold disabled:opacity-30"><Download className="h-4 w-4" />Export</button></div></div>
          <div className="flex-1 min-h-72 p-4 overflow-auto text-sm leading-7 whitespace-pre-wrap">{loading ? <div className="h-full flex flex-col items-center justify-center text-slate-400"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /><p className="mt-3 text-xs">Generating a faithful rewrite…</p></div> : output ? (compare ? <div className="grid sm:grid-cols-2 gap-4"><div><p className="text-[10px] font-black uppercase text-slate-400 mb-2">Original</p>{input}</div><div><p className="text-[10px] font-black uppercase text-teal-500 mb-2">Rewritten</p>{output}</div></div> : output) : <div className="h-full flex flex-col items-center justify-center text-center text-slate-400"><FilePlus2 className="h-8 w-8" /><p className="mt-3 text-xs font-bold">Your paraphrased text will appear here.</p><p className="mt-1 text-[11px]">Input is preserved if generation fails or exceeds a limit.</p></div>}</div>
          <div className="border-t border-slate-100 dark:border-zinc-800 p-3 flex flex-wrap gap-2"><button onClick={generate} disabled={!output || !canGenerate} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-30 dark:border-zinc-700"><RefreshCw className="h-3.5 w-3.5" />Regenerate</button><button onClick={() => setCompare(value => !value)} disabled={!output} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-30 dark:border-zinc-700"><ArrowLeftRight className="h-3.5 w-3.5" />Compare</button><button onClick={newVersion} disabled={!output} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-30 dark:border-zinc-700"><FilePlus2 className="h-3.5 w-3.5" />New Version</button>{versions.length > 1 && <select value={versionIndex} onChange={event => { const index = Number(event.target.value); setVersionIndex(index); setOutput(versions[index]); }} className="rounded-lg border bg-transparent px-2 text-[11px] dark:border-zinc-700">{versions.map((_, index) => <option key={index} value={index}>Version {index + 1}</option>)}</select>}</div>
        </article>
      </div>

      {lockedMode && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl"><div className="flex justify-between"><span className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><Lock className="h-5 w-5" /></span><button onClick={() => setLockedMode(null)} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button></div><h2 className="mt-4 text-lg font-black">Unlock {lockedMode.label}</h2><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">This mode requires the {entitlementFor(lockedMode.id).replace('_', ' ')} plan according to your workspace entitlements.</p><div className="mt-6 flex gap-2"><button onClick={() => setLockedMode(null)} className="flex-1 rounded-xl border py-2.5 text-xs font-bold dark:border-zinc-700">Continue Free</button><button onClick={() => { setLockedMode(null); onOpenUpgradeModal?.(); }} className="flex-1 rounded-xl bg-teal-500 py-2.5 text-xs font-black text-white">View Upgrade</button></div></div></div>}
    </section>
  );
}
