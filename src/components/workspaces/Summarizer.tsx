import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Smile, 
  ArrowRight,
  Sliders,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

export default function Summarizer({ initialText = '' }: { initialText?: string }) {
  const [inputText, setInputText] = useState(initialText);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [summaryFormat, setSummaryFormat] = useState<'bullets' | 'paragraph' | 'executive'>('bullets');

  const handleSummarize = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setSummary('');

    try {
      const lengthPrompt = summaryLength === 'short' ? 'about 1-2 sentences' : summaryLength === 'medium' ? 'a medium detailed summary' : 'a deep comprehensive overview';
      const formatPrompt = summaryFormat === 'bullets' ? 'concise bulleted key takeaways' : summaryFormat === 'paragraph' ? 'a single cohesive structured paragraph' : 'a professional executive summary with main brief, challenges, and outcomes';

      const response = await generateContent({
        prompt: `Text to summarize: ${inputText}\n\nTarget length: ${lengthPrompt}, Format style: ${formatPrompt}`,
        systemInstruction: "You are GXA Intelligent Summarizer. Condense dense publications, articles, contracts, or engineering reports down to their core, high-impact messages. Be objective, accurate, and completely avoid secondary AI filler language."
      });

      setSummary(response);
    } catch (err) {
      setSummary('Failed to compile summary. Check your settings and API network credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in text-slate-800 dark:text-zinc-100 text-left">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-teal-500" /> AI Text Summarizer
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">Instantly condense articles, professional briefs, academic texts, or logs into key takeaways.</p>
      </div>

      {/* Settings Panel */}
      <div className="grid gap-4 sm:grid-cols-2 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
        {/* Length toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 block flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-teal-500" /> Summary Length
          </label>
          <div className="grid grid-cols-3 bg-slate-50 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-800">
            {(['short', 'medium', 'long'] as const).map((length) => (
              <button
                key={length}
                onClick={() => setSummaryLength(length)}
                className={`py-1.5 text-[10px] font-bold rounded capitalize transition ${
                  summaryLength === length 
                    ? 'bg-white dark:bg-zinc-900 shadow-xs text-teal-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {length === 'short' ? 'Short brief' : length === 'medium' ? 'Standard' : 'In-depth'}
              </button>
            ))}
          </div>
        </div>

        {/* Format selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 block">Format Output</label>
          <div className="grid grid-cols-3 bg-slate-50 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-800">
            {(['bullets', 'paragraph', 'executive'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSummaryFormat(fmt)}
                className={`py-1.5 text-[10px] font-bold rounded capitalize transition ${
                  summaryFormat === fmt 
                    ? 'bg-white dark:bg-zinc-900 shadow-xs text-teal-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {fmt === 'bullets' ? 'Key Points' : fmt === 'paragraph' ? 'Paragraph' : 'Executive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Split Pane */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Text Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <span>Original Text / Document</span>
              <span>{inputText.split(/\s+/).filter(Boolean).length} Words</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full flex-1 min-h-[250px] bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 leading-relaxed resize-none font-sans"
              placeholder="Paste long articles, transcripts, or notes here..."
            />
          </div>

          <button
            onClick={handleSummarize}
            disabled={loading || !inputText.trim()}
            className="w-full mt-4 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Condensing document...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Summarize Document
              </>
            )}
          </button>
        </div>

        {/* Output Summary Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xs">
          <div className="bg-slate-50 dark:bg-zinc-950/40 px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-teal-500" /> Compiled Summary Takeaways
            </span>
            {summary && (
              <button 
                onClick={handleCopy}
                className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-1 text-[10px] font-bold"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div className="flex-1 p-5 overflow-y-auto leading-relaxed text-xs text-slate-700 dark:text-zinc-300 min-h-[250px] whitespace-pre-wrap select-text text-left">
            {summary ? (
              <div className="p-4 bg-teal-50/45 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/30 rounded-lg text-slate-800 dark:text-zinc-200 leading-relaxed font-sans">
                {summary}
              </div>
            ) : (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center text-slate-400 space-y-3 px-4">
                <Smile className="h-8 w-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400">Summarizer Standby</h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-xs">Run a summary trigger. Condensed, highly high-fidelity briefs and key points will compile here instantly.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
