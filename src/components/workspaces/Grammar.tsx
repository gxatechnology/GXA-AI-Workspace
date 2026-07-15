import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Check, CheckCheck, CheckSquare, Clock, Copy, Download, FileText,
  History, Loader2, Lock, Redo2, Save, Trash2, Undo2, Upload, X
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';
import { fetchSystemConfig, fetchUsage, incrementUsage, SystemConfig, UsageStats } from '../../utils/limits';

type IssueType = 'Grammar' | 'Spelling' | 'Punctuation' | 'Capitalization' | 'Clarity' | 'Conciseness' | 'Passive voice' | 'Repeated words' | 'Sentence structure';
type PlanId = 'free' | 'pro' | 'pro_plus' | 'team' | 'enterprise';

interface Suggestion {
  id: string;
  type: IssueType;
  original: string;
  correction: string;
  explanation: string;
  advanced: boolean;
}

interface Scores {
  overall: number;
  grammar: number;
  spelling: number;
  clarity: number;
  readability: number;
  tone: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  text: string;
  score: number;
  suggestionCount: number;
}

interface GrammarProps {
  sharedText?: string;
  setSharedText?: (text: string) => void;
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

const BASIC_TYPES: IssueType[] = ['Grammar', 'Spelling', 'Punctuation', 'Capitalization'];
const ADVANCED_TYPES: IssueType[] = ['Clarity', 'Conciseness', 'Passive voice', 'Repeated words', 'Sentence structure'];
const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, pro_plus: 2, team: 3, enterprise: 4 };
const DEFAULT_SCORES: Scores = { overall: 100, grammar: 100, spelling: 100, clarity: 100, readability: 100, tone: 'Neutral' };

export default function Grammar({ sharedText = '', setSharedText, currentUser, onOpenUpgradeModal }: GrammarProps) {
  const [text, setText] = useState(sharedText);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);
  const [hasChecked, setHasChecked] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [fixAllSnapshot, setFixAllSnapshot] = useState<string | null>(null);
  const [confirmFixAll, setConfirmFixAll] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authenticated = Boolean(currentUser && !currentUser.guest);
  const normalizedPlan = String(currentUser?.subscription || 'free').toLowerCase().replace(/\s+/g, '_').replace('+', '_plus') as PlanId;
  const plan: PlanId = normalizedPlan in PLAN_RANK ? normalizedPlan : 'free';
  const advancedRequiredPlan = config?.grammar_advanced_entitlement || 'pro';
  const advancedEnabled = PLAN_RANK[plan] >= PLAN_RANK[advancedRequiredPlan];
  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);
  const characterCount = text.length;
  const wordLimit = config?.grammar_word_limit || 500;
  const dailyLimit = config?.grammar_corrections_limit || 5;
  const usedToday = usage?.grammar_corrections || 0;
  const overLimit = wordCount > wordLimit;
  const nearLimit = !overLimit && wordCount >= Math.ceil(wordLimit * 0.85);
  const dailyLimitReached = PLAN_RANK[plan] === 0 && usedToday >= dailyLimit;
  const activeSuggestions = suggestions.filter(item => !ignoredIds.includes(item.id));
  const canCheck = Boolean(text.trim()) && !overLimit && !dailyLimitReached && !loading && Boolean(config);

  useEffect(() => {
    let active = true;
    Promise.all([fetchSystemConfig(), fetchUsage(authenticated ? currentUser.email : 'guest')])
      .then(([nextConfig, nextUsage]) => { if (active) { setConfig(nextConfig); setUsage(nextUsage); } })
      .catch(() => { if (active) setError('Unable to load grammar limits. Refresh and try again.'); });
    return () => { active = false; };
  }, [authenticated, currentUser?.email]);

  useEffect(() => {
    if (sharedText && sharedText !== text) setText(sharedText);
  }, [sharedText]);

  const updateText = (value: string, record = true) => {
    if (record && value !== text) {
      setUndoStack(stack => [...stack.slice(-49), text]);
      setRedoStack([]);
    }
    setText(value);
    setSharedText?.(value);
    setError('');
    setSaved(false);
  };

  const undo = () => {
    const previous = undoStack.at(-1);
    if (previous === undefined) return;
    setRedoStack(stack => [...stack, text]);
    setUndoStack(stack => stack.slice(0, -1));
    updateText(previous, false);
  };

  const redo = () => {
    const next = redoStack.at(-1);
    if (next === undefined) return;
    setUndoStack(stack => [...stack, text]);
    setRedoStack(stack => stack.slice(0, -1));
    updateText(next, false);
  };

  const parseResponse = (raw: string): { suggestions: Suggestion[]; scores: Scores } => {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    const allowed = advancedEnabled ? [...BASIC_TYPES, ...ADVANCED_TYPES] : BASIC_TYPES;
    const nextSuggestions: Suggestion[] = Array.isArray(parsed.suggestions) ? parsed.suggestions
      .filter((item: any) => allowed.includes(item.type) && item.original && item.correction && item.original !== item.correction)
      .slice(0, 30)
      .map((item: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        type: item.type,
        original: String(item.original),
        correction: String(item.correction),
        explanation: String(item.explanation || 'This change improves correctness and readability.'),
        advanced: ADVANCED_TYPES.includes(item.type)
      })) : [];
    const clamp = (value: unknown) => Math.max(0, Math.min(100, Number(value) || 0));
    return {
      suggestions: nextSuggestions,
      scores: {
        overall: clamp(parsed.scores?.overall), grammar: clamp(parsed.scores?.grammar),
        spelling: clamp(parsed.scores?.spelling), clarity: clamp(parsed.scores?.clarity),
        readability: clamp(parsed.scores?.readability), tone: String(parsed.scores?.tone || 'Neutral')
      }
    };
  };

  const runCheck = async () => {
    if (!canCheck) return;
    setLoading(true); setError(''); setIgnoredIds([]); setSaved(false);
    try {
      const categories = advancedEnabled ? [...BASIC_TYPES, ...ADVANCED_TYPES] : BASIC_TYPES;
      const response = await generateContent({
        systemInstruction: 'You are the production GXA Grammar Checker. Analyze only the supplied text. Never invent source text or return markdown.',
        prompt: `Check the text for these issue types only: ${categories.join(', ')}.
Return one valid JSON object with this exact shape:
{"suggestions":[{"type":"Grammar","original":"exact text from input","correction":"replacement","explanation":"plain-language reason"}],"scores":{"overall":0,"grammar":0,"spelling":0,"clarity":0,"readability":0,"tone":"Neutral"}}
Scores must be integers from 0 to 100. Use exact source substrings in original. Return an empty suggestions array when no issue exists.
Text:\n${text}`
      });
      const result = parseResponse(response);
      setSuggestions(result.suggestions);
      setScores(result.scores);
      setHasChecked(true);
      const nextUsage = await incrementUsage(authenticated ? currentUser.email : 'guest', 'grammar_corrections');
      setUsage(nextUsage);
      if (authenticated) setHistory(items => [{ id: crypto.randomUUID(), timestamp: Date.now(), text, score: result.scores.overall, suggestionCount: result.suggestions.length }, ...items].slice(0, 20));
    } catch (reason: any) {
      setError(reason instanceof SyntaxError ? 'The grammar service returned an invalid response. Your text is unchanged; try again.' : (reason?.message || 'Grammar checking failed. Your text has been preserved.'));
    } finally { setLoading(false); }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const index = text.indexOf(suggestion.original);
    if (index < 0) { setError('That text has changed since the check. Run the check again.'); return; }
    const next = text.slice(0, index) + suggestion.correction + text.slice(index + suggestion.original.length);
    updateText(next);
    setSuggestions(items => items.filter(item => item.id !== suggestion.id));
  };

  const ignoreSuggestion = (id: string) => setIgnoredIds(items => [...items, id]);

  const applyAll = () => {
    let next = text;
    for (const suggestion of activeSuggestions) {
      const index = next.indexOf(suggestion.original);
      if (index >= 0) next = next.slice(0, index) + suggestion.correction + next.slice(index + suggestion.original.length);
    }
    setFixAllSnapshot(text);
    updateText(next);
    setSuggestions([]);
    setConfirmFixAll(false);
  };

  const undoFixAll = () => {
    if (fixAllSnapshot === null) return;
    updateText(fixAllSnapshot);
    setFixAllSnapshot(null);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/\.(txt|md|csv)$/i.test(file.name)) { setError('Upload a TXT, Markdown, or CSV text file.'); return; }
    try { updateText(await file.text()); setSuggestions([]); setScores(DEFAULT_SCORES); }
    catch { setError('The selected file could not be read.'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const requireAuthentication = (action: string) => {
    setError(`Login is required to ${action}. Use Login in the header to continue.`);
  };

  const save = async () => {
    if (!authenticated) { requireAuthentication('save checks and history'); return; }
    try {
      const response = await fetch('/api/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.email}` },
        body: JSON.stringify({ name: 'Grammar Check', pages: 1, size: `${characterCount} characters`, extractedSnippet: text })
      });
      if (!response.ok) throw new Error();
      setSaved(true);
    } catch { setError('This check could not be saved. Your text remains in the editor.'); }
  };

  const exportText = () => {
    if (!authenticated) { requireAuthentication('export corrected text'); return; }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'gxa-grammar-check.txt'; anchor.click(); URL.revokeObjectURL(url);
  };

  const scoreItems = [
    ['Overall', scores.overall], ['Grammar', scores.grammar], ['Spelling', scores.spelling],
    ['Clarity', scores.clarity], ['Readability', scores.readability]
  ];
  const counterClass = overLimit ? 'text-red-600' : nearLimit ? 'text-amber-600' : 'text-slate-400';

  return (
    <section className="max-w-[1500px] mx-auto space-y-4 text-left">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><CheckSquare className="h-5 w-5 text-teal-500" />Grammar Checker</h1><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Find clear, actionable corrections without changing your text automatically.</p></div>
        <p className="text-[11px] text-slate-400">{config ? `${Math.max(0, dailyLimit - usedToday)} free checks remaining today` : 'Loading plan limits…'}</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {scoreItems.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"><span className="text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className="block mt-1 text-lg text-slate-900 dark:text-white">{hasChecked ? value : '—'}</strong></div>)}
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"><span className="text-[10px] font-bold uppercase text-slate-400">Tone</span><strong className="block mt-1 text-sm text-slate-900 dark:text-white truncate">{hasChecked ? scores.tone : '—'}</strong></div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
        {BASIC_TYPES.map(type => <span key={type} className="rounded-full bg-teal-500/10 px-3 py-1.5 text-[10px] font-bold text-teal-700 dark:text-teal-400">{type}</span>)}
        {ADVANCED_TYPES.map(type => <button key={type} onClick={() => !advancedEnabled && setUpgradeOpen(true)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold ${advancedEnabled ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>{type}{!advancedEnabled && <Lock className="h-3 w-3" />}</button>)}
      </div>

      {(error || nearLimit || overLimit || dailyLimitReached) && <div className={`rounded-xl border p-3 flex items-start gap-2 text-xs ${error || overLimit || dailyLimitReached ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900' : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900'}`}><AlertCircle className="h-4 w-4 shrink-0" /><span>{error || (overLimit ? `Limit exceeded by ${wordCount - wordLimit} words. Reduce the input to re-enable checking.` : dailyLimitReached ? 'Daily free check limit reached. Upgrade for additional checks.' : `You are approaching the ${wordLimit}-word limit.`)}</span></div>}

      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.85fr)] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden min-h-[38rem]">
        <article className="flex flex-col min-w-0">
          <div className="min-h-12 border-b border-slate-100 dark:border-zinc-800 px-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-black">Your text</span><div className="flex items-center gap-1"><button onClick={undo} disabled={!undoStack.length} aria-label="Undo" className="p-2 disabled:opacity-30"><Undo2 className="h-4 w-4" /></button><button onClick={redo} disabled={!redoStack.length} aria-label="Redo" className="p-2 disabled:opacity-30"><Redo2 className="h-4 w-4" /></button><button onClick={() => fileInputRef.current?.click()} aria-label="Upload text" className="p-2"><Upload className="h-4 w-4" /></button><button onClick={() => { updateText(''); setSuggestions([]); setScores(DEFAULT_SCORES); setHasChecked(false); }} aria-label="Clear" className="p-2 text-rose-500"><Trash2 className="h-4 w-4" /></button></div></div>
          <textarea value={text} onChange={event => updateText(event.target.value)} placeholder="Type or paste text to check…" className="flex-1 min-h-[26rem] resize-none bg-transparent p-5 text-[15px] leading-8 outline-none" />
          <div className="border-t border-slate-100 dark:border-zinc-800 p-3 flex flex-wrap items-center justify-between gap-3"><span className={`text-[11px] font-bold ${counterClass}`}>{wordCount}/{wordLimit} words · {characterCount} characters</span><div className="flex gap-2">{fixAllSnapshot !== null && <button onClick={undoFixAll} className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold dark:border-zinc-700"><Undo2 className="h-4 w-4" />Undo Fix All</button>}<button onClick={runCheck} disabled={!canCheck} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}{loading ? 'Checking…' : 'Check Text'}</button></div></div>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,text/plain" hidden onChange={event => upload(event.target.files?.[0])} />
        </article>

        <aside className="border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-zinc-800 flex flex-col min-h-[28rem]">
          <div className="min-h-12 border-b border-slate-100 dark:border-zinc-800 px-3 flex flex-wrap items-center justify-between gap-2"><div><span className="text-xs font-black">Suggestions</span><span className="ml-2 text-[10px] text-slate-400">{activeSuggestions.length} open</span></div><div className="flex gap-1"><button onClick={() => activeSuggestions.length && setConfirmFixAll(true)} disabled={!activeSuggestions.length} className="inline-flex items-center gap-1 p-2 text-[11px] font-bold disabled:opacity-30"><CheckCheck className="h-4 w-4" />Fix All</button><button onClick={() => authenticated ? setHistoryOpen(true) : requireAuthentication('view grammar history')} className="inline-flex items-center gap-1 p-2 text-[11px] font-bold"><History className="h-4 w-4" />History</button></div></div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[42rem]">{loading ? <div className="h-full flex flex-col items-center justify-center text-slate-400"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /><p className="mt-3 text-xs">Analyzing your writing…</p></div> : activeSuggestions.length ? activeSuggestions.map(suggestion => <article key={suggestion.id} className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 space-y-3"><div className="flex items-center justify-between"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${suggestion.advanced ? 'bg-indigo-500/10 text-indigo-600' : 'bg-teal-500/10 text-teal-600'}`}>{suggestion.type}</span>{suggestion.advanced && <span className="text-[9px] text-indigo-500 font-bold">Advanced</span>}</div><div className="grid gap-2 text-xs"><div><span className="block text-[9px] font-bold uppercase text-slate-400">Original</span><p className="mt-1 line-through decoration-rose-400 text-slate-600 dark:text-zinc-300">{suggestion.original}</p></div><div><span className="block text-[9px] font-bold uppercase text-slate-400">Correction</span><p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400">{suggestion.correction}</p></div></div><p className="text-[11px] leading-5 text-slate-500 dark:text-zinc-400">{suggestion.explanation}</p><div className="flex gap-2"><button onClick={() => applySuggestion(suggestion)} className="flex-1 rounded-lg bg-teal-500 py-2 text-[11px] font-black text-white">Accept</button><button onClick={() => ignoreSuggestion(suggestion.id)} className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-700 py-2 text-[11px] font-bold">Ignore</button></div></article>) : <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8"><Check className="h-9 w-9" /><p className="mt-3 text-xs font-bold">{text.trim() ? 'Run a check to see suggestions.' : 'Start writing to check your text.'}</p><p className="mt-1 text-[11px]">Your text is never replaced automatically.</p></div>}</div>
          <div className="border-t border-slate-100 dark:border-zinc-800 p-3 flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(text)} disabled={!text} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-30 dark:border-zinc-700"><Copy className="h-3.5 w-3.5" />Copy</button><button onClick={save} disabled={!text} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-30 dark:border-zinc-700"><Save className="h-3.5 w-3.5" />{saved ? 'Saved' : 'Save'}</button><button onClick={exportText} disabled={!text} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-30 dark:border-zinc-700"><Download className="h-3.5 w-3.5" />Export</button></div>
        </aside>
      </div>

      {confirmFixAll && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl"><h2 className="text-lg font-black">Apply all suggestions?</h2><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">This will apply {activeSuggestions.length} available corrections. You can undo the complete change afterward.</p><div className="mt-6 flex gap-2"><button onClick={() => setConfirmFixAll(false)} className="flex-1 rounded-xl border py-2.5 text-xs font-bold dark:border-zinc-700">Cancel</button><button onClick={applyAll} className="flex-1 rounded-xl bg-teal-500 py-2.5 text-xs font-black text-white">Fix All</button></div></div></div>}

      {upgradeOpen && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl"><div className="flex justify-between"><span className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><Lock className="h-5 w-5" /></span><button onClick={() => setUpgradeOpen(false)} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button></div><h2 className="mt-4 text-lg font-black">Unlock advanced writing suggestions</h2><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Clarity, conciseness, passive voice, repeated-word, and sentence-structure suggestions require the {advancedRequiredPlan.replace('_', ' ')} plan.</p><div className="mt-6 flex gap-2"><button onClick={() => setUpgradeOpen(false)} className="flex-1 rounded-xl border py-2.5 text-xs font-bold dark:border-zinc-700">Continue Basic</button><button onClick={() => { setUpgradeOpen(false); onOpenUpgradeModal?.(); }} className="flex-1 rounded-xl bg-teal-500 py-2.5 text-xs font-black text-white">View Pricing</button></div></div></div>}

      {historyOpen && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Grammar history</h2><button onClick={() => setHistoryOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>{history.length ? <div className="mt-4 space-y-2">{history.map(item => <article key={item.id} className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3"><div className="flex justify-between text-[10px] text-slate-400"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(item.timestamp).toLocaleString()}</span><span>Score {item.score} · {item.suggestionCount} suggestions</span></div><p className="mt-2 text-xs line-clamp-3">{item.text}</p></article>)}</div> : <div className="py-14 text-center"><FileText className="h-8 w-8 mx-auto text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-500">No grammar checks in this session.</p></div>}</div></div>}
    </section>
  );
}
