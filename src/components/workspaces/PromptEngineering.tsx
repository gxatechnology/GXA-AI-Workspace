import React, { useState } from 'react';
import { 
  Terminal, 
  ChevronRight, 
  Copy, 
  Check, 
  BookOpen, 
  Plus, 
  Search, 
  ShieldAlert, 
  Share2, 
  HelpCircle,
  Lightbulb,
  Sparkles,
  Award,
  Zap
} from 'lucide-react';

interface LibraryPrompt {
  id: string;
  title: string;
  role: string;
  category: 'Coding' | 'Marketing' | 'Forensics' | 'Academic';
  description: string;
  template: string;
  rating: number;
}

export default function PromptEngineering() {
  const [libraryPrompts] = useState<LibraryPrompt[]>([
    {
      id: 'p-1',
      title: 'Full-Stack Technical Refactor Core',
      role: 'Principal Software Architect',
      category: 'Coding',
      description: 'Optimize typescript structures to support lazy initialization layers.',
      template: 'You are an elite Principal Software Architect. Act as an automated code supervisor. Refactor the following TypeScript file to utilize lazy-loaded classes, strong error checking, and named ESM variables. \nTarget File:\n{INPUT}',
      rating: 4.9
    },
    {
      id: 'p-2',
      title: 'Conversion-driven Sales Copy Catalyst',
      role: 'Enterprise SaaS Copywriter',
      category: 'Marketing',
      description: 'Optimize landing pages and ads with quantitative metric hooks.',
      template: 'You are an award-winning Enterprise SaaS Copywriter. Rephrase the following product value proposition. Break it down into quantitative metric statements focusing on reducing operational bottlenecks and maximizing LTV.\nPropositions:\n{INPUT}',
      rating: 4.8
    },
    {
      id: 'p-3',
      title: 'Forensics Linguistic Scan',
      role: 'Linguistic Forensic Analyst',
      category: 'Forensics',
      description: 'Determine structural probability of robotic language origin.',
      template: 'You are a Linguistic Forensic Analyst. Evaluate the perplexity and sentence burstiness of this document. Outline highlighted indicators of generative AI origin.\nTarget Text:\n{INPUT}',
      rating: 4.7
    }
  ]);

  const [activeTab, setActiveTab] = useState<'builder' | 'library' | 'marketplace'>('builder');
  const [activePromptId, setActivePromptId] = useState<string>('p-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Builder States
  const [role, setRole] = useState<string>('Senior React Consultant');
  const [context, setContext] = useState<string>('Designing high-performance state hooks');
  const [constraints, setConstraints] = useState<string>('Never include infinite dependency arrays; enforce named imports.');
  const [outputStyle, setOutputStyle] = useState<string>('Step-by-step modular markdown codeblocks with inline descriptions');
  const [compiledPrompt, setCompiledPrompt] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const activePrompt = libraryPrompts.find(p => p.id === activePromptId) || libraryPrompts[0];

  const handleCompilePrompt = () => {
    const compiled = `# SYSTEM ROLE\nYou are a ${role}.\n\n# OPERATING CONTEXT\nWe are currently focusing on: ${context}.\n\n# HARD BOUNDARY CONSTRAINTS\nWhen generating code or documentation, you must adhere strictly to these constraints:\n- ${constraints}\n\n# REQUIRED OUTPUT FORMAT\nDeliver your response matching the following formatting details:\n- ${outputStyle}\n\n# TARGET INPUT\n[Insert your text or code content here]`;
    setCompiledPrompt(compiled);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Category selector */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)]">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 block font-mono mb-3">
          Engineering Panel
        </span>
        
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('builder')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'builder' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Prompt Builder</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Build structured system blocks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'library' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Prompt Library</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Browse 120+ team templates</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('marketplace')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'marketplace' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <Award className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Marketplace</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Explore community catalogs</span>
            </div>
          </button>
        </div>

        <div className="mt-auto border-t border-zinc-800/80 pt-4 px-2.5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 text-xs">
            <Lightbulb className="h-4 w-4 shrink-0 animate-bounce" />
            <span className="font-bold">PromptTip</span>
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-500">
            Specify rigid formatting rules and high perplexity limits inside constraints to force structured outputs from Gemini.
          </p>
        </div>
      </div>

      {/* Main Builder Console */}
      <div className="lg:col-span-9 flex flex-col gap-6 h-[calc(100vh-12rem)] min-h-0">
        {activeTab === 'builder' ? (
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            {/* Header */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shrink-0 shadow-lg">
              <div className="space-y-0.5">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Terminal className="h-4.5 w-4.5 text-indigo-400" /> Visual Prompt Engineering Console
                </h3>
                <p className="text-xs text-neutral-400">Synthesize structured prompt trees based on custom parameters.</p>
              </div>
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded text-indigo-400 font-mono font-bold uppercase tracking-wider">
                System Builder
              </span>
            </div>

            {/* Builder grids */}
            <div className="flex-1 grid gap-6 md:grid-cols-2 min-h-0">
              {/* Form panel */}
              <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between min-h-0">
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">AI Persona / Role</label>
                    <input 
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Context / Task Details</label>
                    <input 
                      type="text"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Operating Constraints</label>
                    <textarea 
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      rows={3}
                      className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Target Output Style</label>
                    <input 
                      type="text"
                      value={outputStyle}
                      onChange={(e) => setOutputStyle(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCompilePrompt}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  <Zap className="h-3.5 w-3.5" /> Compile Engineering Blueprint
                </button>
              </div>

              {/* Output Panel */}
              <div className="bg-black border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden min-h-0 shadow-2xl">
                <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-800/80 flex justify-between items-center shrink-0">
                  <span className="text-xs font-mono font-bold text-neutral-400 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" /> High-Performance System Block
                  </span>
                  {compiledPrompt && (
                    <button 
                      onClick={() => handleCopy(compiledPrompt)}
                      className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-zinc-800 rounded flex items-center gap-1 text-[10px] font-semibold"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                <div className="flex-1 p-5 overflow-y-auto leading-relaxed text-xs text-neutral-300 text-left font-mono whitespace-pre-wrap select-text">
                  {compiledPrompt ? (
                    compiledPrompt
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-3 px-4">
                      <Sparkles className="h-8 w-8 text-zinc-600 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-zinc-400">Prompt Console Empty</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 max-w-xs">Define your persona attributes, context parameters, and outputs on the left. Run compile to output high-fidelity prompt structures.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid gap-6 md:grid-cols-2 min-h-0">
            {/* Library list */}
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-4 flex flex-col min-h-0">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono mb-3 px-1">
                {activeTab === 'library' ? 'Saved Collections' : 'Enterprise Marketplace'}
              </span>
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {libraryPrompts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePromptId(p.id)}
                    className={`w-full text-left p-3.5 rounded-lg border text-xs transition ${
                      activePromptId === p.id 
                        ? 'bg-zinc-900 border-zinc-800 text-white' 
                        : 'bg-transparent border-zinc-900 text-neutral-400 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded tracking-wide font-mono">
                        {p.category}
                      </span>
                      <span className="text-[9px] font-mono text-amber-400 font-bold">★ {p.rating}</span>
                    </div>
                    <span className="font-bold block mt-2">{p.title}</span>
                    <span className="text-[10px] text-zinc-500 block mt-1 leading-normal">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template inspector */}
            <div className="bg-black border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden min-h-0 shadow-2xl">
              <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-800/80 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono font-bold text-neutral-400">
                  Template: {activePrompt.title}
                </span>
                <button 
                  onClick={() => handleCopy(activePrompt.template)}
                  className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-zinc-800 rounded flex items-center gap-1 text-[10px] font-semibold"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Template
                </button>
              </div>

              <div className="flex-1 p-5 overflow-y-auto leading-relaxed text-xs text-neutral-300 text-left font-mono whitespace-pre-wrap select-text">
                {activePrompt.template}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
