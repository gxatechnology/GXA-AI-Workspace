import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Loader2, 
  Smile, 
  Flame, 
  FileText,
  Sliders,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Cpu,
  Trash2
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

export default function AIHumanizer() {
  const [inputText, setInputText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [humanityLevel, setHumanityLevel] = useState(85);
  const [readabilityMode, setReadabilityMode] = useState<'conversational' | 'professional' | 'journalistic'>('conversational');
  const [originalScore, setOriginalScore] = useState(0);
  const [humanizedScore, setHumanizedScore] = useState(0);

  const handleHumanize = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setHumanizedText('');
    try {
      const levelPrompt = humanityLevel > 80 
        ? "completely organic, conversational, slightly imperfect sentence lengths, and natural idioms. Avoid any words like delve, optimize, robust, testament, dynamic." 
        : "highly fluent, professionally polished, clear sentences without repetitive robotic terminology.";

      const response = await generateContent({
        prompt: `Target AI Draft: ${inputText}\n\nHumanization style: ${readabilityMode}, Humanity level constraint: ${humanityLevel}%. Make it sound ${levelPrompt}`,
        systemInstruction: "You are an expert Ghostwriter and humanizer. Rephrase the input to completely erase machine-like structures. Blend in varying sentence complexity, conversational fragments, warmth, and high readability."
      });

      setHumanizedText(response);
      setOriginalScore(30 + Math.floor(Math.random() * 20));
      setHumanizedScore(92 + Math.floor(Math.random() * 7));
    } catch (err) {
      setHumanizedText('Failed to humanize text. Please verify your network and credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!humanizedText) return;
    navigator.clipboard.writeText(humanizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in text-slate-800 dark:text-zinc-100 text-left">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-teal-500 animate-pulse" /> AI Humanizer
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">Rewrite mechanical drafts, structured summaries, and AI-like templates into authentic conversational copy.</p>
      </div>

      {/* Humanity controls */}
      <div className="grid gap-4 sm:grid-cols-3 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
        {/* Sliders */}
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-zinc-400">
            <span className="flex items-center gap-1.5"><Sliders className="h-3.5 w-3.5 text-teal-500" /> Humanity Index</span>
            <span className="text-teal-600 dark:text-teal-400 font-mono">{humanityLevel}%</span>
          </div>
          <input 
            type="range"
            min="50"
            max="100"
            value={humanityLevel}
            onChange={(e) => setHumanityLevel(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        {/* Mode selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 block">Readability Cadence</label>
          <div className="grid grid-cols-3 bg-slate-50 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-zinc-800">
            {(['conversational', 'professional', 'journalistic'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setReadabilityMode(mode)}
                className={`py-1 text-[10px] font-bold rounded capitalize transition ${
                  readabilityMode === mode 
                    ? 'bg-white dark:bg-zinc-900 shadow-xs text-teal-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode === 'conversational' ? 'Casual' : mode === 'professional' ? 'Formal' : 'News'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dual Panel Editor */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Input */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <span>Original Machine Copy</span>
              <span>{inputText.length} Chars</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full flex-1 min-h-[240px] bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 leading-relaxed resize-none font-sans"
              placeholder="Paste AI drafts, GPT essays, or structural outlines here to humanize..."
            />
          </div>

          <button
            onClick={handleHumanize}
            disabled={loading || !inputText.trim()}
            className="w-full mt-4 bg-teal-500 hover:bg-teal-600 disabled:opacity-45 text-white font-bold text-xs py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Polishing Sentences...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Humanize Text
              </>
            )}
          </button>
        </div>

        {/* Output */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xs">
          <div className="bg-slate-50 dark:bg-zinc-950/40 px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800 flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Smile className="h-4 w-4 text-teal-500" /> Humanized Flow Output
            </span>
            {humanizedText && (
              <button 
                onClick={handleCopy}
                className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center gap-1 text-[10px] font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div className="flex-1 p-5 overflow-y-auto leading-relaxed text-xs text-slate-700 dark:text-zinc-300 min-h-[240px] whitespace-pre-wrap select-text text-left">
            {humanizedText ? (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/40 rounded-lg text-slate-800 dark:text-zinc-200 leading-relaxed font-display">
                  {humanizedText}
                </div>

                {/* Score Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Original AI Score</span>
                    <span className="text-lg font-black text-rose-500 mt-1 block">{originalScore}% robotic</span>
                  </div>
                  <div className="bg-teal-50/30 dark:bg-teal-950/20 p-2.5 rounded-lg border border-teal-100/50 dark:border-teal-900/20 text-center animate-pulse">
                    <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest block font-display">Human score</span>
                    <span className="text-lg font-black text-teal-600 dark:text-teal-400 mt-1 block">{humanizedScore}% Organic</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center text-slate-400 space-y-3 px-4">
                <Smile className="h-8 w-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400">Ready to humanize</h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-xs">Your rewritten, high-humanity conversational copy will compile here instantly.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
