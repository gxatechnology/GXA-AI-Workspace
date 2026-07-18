import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Send, 
  Check, 
  Copy, 
  Loader2, 
  Search, 
  ArrowLeftRight, 
  Briefcase, 
  GraduationCap, 
  Mail, 
  Megaphone, 
  Globe, 
  Download,
  Info
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

interface DocTemplate {
  id: string;
  name: string;
  category: 'Business' | 'Academic' | 'Social Media' | 'Marketing';
  desc: string;
  fields: Array<{ key: string; label: string; placeholder: string; isTextArea?: boolean }>;
  systemInstruction: string;
}

export default function Templates() {
  const [templates] = useState<DocTemplate[]>([
    {
      id: 'proposal',
      name: 'Business Proposal',
      category: 'Business',
      desc: 'Formulate highly professional B2B proposals and outlines.',
      fields: [
        { key: 'client', label: 'Client Organization', placeholder: 'e.g. Google Cloud Operations' },
        { key: 'problem', label: 'Business Problem', placeholder: 'e.g. API credential leaks and slow devops pipelines' },
        { key: 'solution', label: 'Proposed Solution', placeholder: 'e.g. Deploy GXA AI Workspace local-first servers' },
        { key: 'budget', label: 'Budget Outline', placeholder: 'e.g. INR 14,200 annual subscription plus setup support' }
      ],
      systemInstruction: 'You are an elite enterprise B2B sales strategist. Draft a formal business proposal matching the client details. Structure with headings: Executive Summary, Problem Definition, Proposed Solution, and Financial Model.'
    },
    {
      id: 'sop',
      name: 'Statement of Purpose (SOP)',
      category: 'Academic',
      desc: 'Formulate persuasive academic personal statements.',
      fields: [
        { key: 'university', label: 'Target University & Program', placeholder: 'e.g. Stanford University, MS in Computer Science' },
        { key: 'research', label: 'Research Interests', placeholder: 'e.g. Scalable local web runtimes and AI orchestration' },
        { key: 'background', label: 'Academic Background', placeholder: 'e.g. BS in Software Engineering, 3.9 GPA, local cache systems publications' }
      ],
      systemInstruction: 'You are an academic advisor. Draft a compelling, intellectual, and deeply authentic Statement of Purpose (SOP) based on the inputs.'
    },
    {
      id: 'biz-letter',
      name: 'Business Letter',
      category: 'Business',
      desc: 'Formal corporate letters with standardized letterheads.',
      fields: [
        { key: 'sender', label: 'Sender details', placeholder: 'e.g. John Doe, COO of GXA Technologies' },
        { key: 'recipient', label: 'Recipient details', placeholder: 'e.g. Recipient name, role and organization' },
        { key: 'subject', label: 'Subject Line', placeholder: 'e.g. Formalizing Service Level Agreement exemption parameters' },
        { key: 'points', label: 'Core Message Details', placeholder: 'We are requesting an audit extension regarding the port 3000 mapping layers.' }
      ],
      systemInstruction: 'You are a formal corporate legal assistant. Draft a standardized, exceptionally polite and objective business letter following standard US corporate letter formatting.'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Thought Leadership',
      category: 'Social Media',
      desc: 'Draft viral executive updates optimizing spacing and CTA.',
      fields: [
        { key: 'topic', label: 'Thought Leadership Topic', placeholder: 'e.g. What launching 13 full stack workspaces taught me about humility' },
        { key: 'hook', label: 'Opening Hook Statement', placeholder: 'e.g. Most SaaS platforms are oversimplified. Here is why.' }
      ],
      systemInstruction: 'You are a social media influencer for tech executives. Generate a compelling, high-growth LinkedIn post with optimized spacing, structured emoji bullet lists, and an interactive discussion prompt.'
    },
    {
      id: 'assignment',
      name: 'Academic Assignment Cover',
      category: 'Academic',
      desc: 'Format unified, publication-grade academic submissions.',
      fields: [
        { key: 'course', label: 'Course & Subject', placeholder: 'e.g. CS224N: Natural Language Processing with Deep Learning' },
        { key: 'title', label: 'Assignment Title', placeholder: 'e.g. Empirical Evaluation of Local-first Vector Kernels' },
        { key: 'author', label: 'Student / Researcher', placeholder: 'e.g. Alex Mercer, Student ID: 981223' }
      ],
      systemInstruction: 'Create a formally styled, MLA/APA formatted cover page and outline structure based on the provided inputs.'
    },
    {
      id: 'seo-blog',
      name: 'SEO Blog Draft',
      category: 'Marketing',
      desc: 'Generate articles optimized for search indices and readability indices.',
      fields: [
        { key: 'keywords', label: 'Primary Keywords', placeholder: 'e.g. React 19 server, local-first container, port 3000 reverse proxy' },
        { key: 'audience', label: 'Target Audience', placeholder: 'e.g. Intermediate TypeScript developers' },
        { key: 'goal', label: 'Article Thesis', placeholder: 'e.g. Explain how to securely lock api credentials behind local backend endpoints' }
      ],
      systemInstruction: 'You are a lead technical content specialist. Draft an SEO blog post. Focus on structural headings (H1, H2), high readability indexes, and logical synonym keyword integrations.'
    }
  ]);

  const [activeTempId, setActiveTempId] = useState<string>('proposal');
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});
  const [draftedContent, setDraftedContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeTemp = templates.find(t => t.id === activeTempId) || templates[0];

  const handleInputChange = (key: string, val: string) => {
    setFormInputs(prev => ({ ...prev, [key]: val }));
  };

  const handleDraft = async () => {
    setLoading(true);
    setDraftedContent('');
    try {
      let inputsString = '';
      activeTemp.fields.forEach(field => {
        inputsString += `${field.label}: ${formInputs[field.key] || ''}\n`;
      });

      const prompt = `Form Details:\n${inputsString}\n\nDraft the complete document based on these form fields. Deliver ONLY the final document draft.`;

      const response = await generateContent({
        prompt,
        systemInstruction: activeTemp.systemInstruction
      });

      setDraftedContent(response);
    } catch (err) {
      setDraftedContent('Generation failed. Check your API configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Template Deck Sidebar */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)]">
        <div className="relative mb-3">
          <span className="absolute left-3 top-2.5 text-zinc-500">
            <Search className="h-4 w-4" />
          </span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 19 templates..."
            className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-300 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {['Business', 'Academic', 'Social Media', 'Marketing'].map((cat) => {
            const catTemplates = filteredTemplates.filter(t => t.category === cat);
            if (catTemplates.length === 0) return null;
            return (
              <div key={cat} className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2.5 block font-mono">
                  {cat}
                </span>
                {catTemplates.map((temp) => (
                  <button
                    key={temp.id}
                    onClick={() => {
                      setActiveTempId(temp.id);
                      setFormInputs({});
                      setDraftedContent('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between group ${
                      activeTempId === temp.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {cat === 'Business' && <Briefcase className="h-3.5 w-3.5 shrink-0" />}
                      {cat === 'Academic' && <GraduationCap className="h-3.5 w-3.5 shrink-0" />}
                      {cat === 'Social Media' && <Mail className="h-3.5 w-3.5 shrink-0" />}
                      {cat === 'Marketing' && <Megaphone className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{temp.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Form Column */}
      <div className="lg:col-span-9 flex flex-col gap-6 h-[calc(100vh-12rem)] min-h-0">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shrink-0 shadow-lg">
          <div className="space-y-0.5">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-indigo-400" /> {activeTemp.name} Template
            </h3>
            <p className="text-xs text-neutral-400">{activeTemp.desc}</p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-400 font-mono font-bold uppercase tracking-wider">
            Ready to Draft
          </span>
        </div>

        {/* Form and Preview Panels */}
        <div className="flex-1 grid gap-6 md:grid-cols-2 min-h-0">
          {/* Inputs Column */}
          <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between min-h-0">
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {activeTemp.fields.map((field) => (
                <div key={field.key} className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">{field.label}</label>
                  <input 
                    type="text"
                    value={formInputs[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleDraft}
              disabled={loading}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting Academic Structure...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Compile Template Draft
                </>
              )}
            </button>
          </div>

          {/* Letterhead Preview Column */}
          <div className="bg-white text-zinc-900 border border-zinc-200 rounded-xl flex flex-col overflow-hidden min-h-0 shadow-2xl relative">
            <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                Letterhead Preview Canvas
              </span>
              {draftedContent && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopy}
                    className="text-zinc-500 hover:text-zinc-800 transition p-1 hover:bg-zinc-200 rounded flex items-center gap-1 text-[9px] font-bold"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* Simulated physical printed letterhead page structure */}
            <div className="flex-1 p-8 overflow-y-auto leading-relaxed text-xs text-zinc-800 text-left font-serif whitespace-pre-wrap select-text">
              {draftedContent ? (
                draftedContent
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 space-y-3 px-4 font-sans">
                  <FileText className="h-8 w-8 text-zinc-300 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-600">Letterhead Draft Empty</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5 max-w-xs">Fill out the variable attributes inside the input form. Clicking draft compiles formal typography outputs here instantly.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
