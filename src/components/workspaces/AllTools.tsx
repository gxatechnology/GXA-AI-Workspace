import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  ArrowLeftRight, 
  ShieldAlert, 
  Languages, 
  Folder, 
  Terminal, 
  Bookmark, 
  Users, 
  CreditCard, 
  Shield, 
  Settings,
  Scan,
  Zap,
  Image,
  Eye,
  Trash,
  HelpCircle
} from 'lucide-react';
import { WorkspaceId } from '../../types';

interface ToolItem {
  id: string;
  name: string;
  desc: string;
  category: string;
  isPro: boolean;
  workspaceId: WorkspaceId;
  icon: any;
}

interface AllToolsProps {
  onSelectWorkspace: (id: WorkspaceId) => void;
  onOpenUpgradeModal: () => void;
}

export default function AllTools({ onSelectWorkspace, onOpenUpgradeModal }: AllToolsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = [
    'All',
    'Writing',
    'Grammar',
    'Paraphrasing',
    'Originality',
    'PDF & Documents',
    'Media',
    'Translation',
    'Enterprise'
  ];

  const tools: ToolItem[] = [
    // Writing
    { id: 'ai-writer', name: 'AI Writer', desc: 'Generate high-quality essays, articles, and content in seconds.', category: 'Writing', isPro: false, workspaceId: 'ai-writing', icon: FileText },
    { id: 'blog-writer', name: 'Blog Writer', desc: 'Craft engaging, SEO-optimized blog posts and outlines.', category: 'Writing', isPro: true, workspaceId: 'ai-writing', icon: FileText },
    { id: 'email-writer', name: 'Email Writer', desc: 'Write high-conversion professional business emails.', category: 'Writing', isPro: false, workspaceId: 'ai-writing', icon: FileText },
    { id: 'resume-builder', name: 'Resume Builder', desc: 'Build structured resumes and review ATS guidance.', category: 'Writing', isPro: false, workspaceId: 'career', icon: Bookmark },
    { id: 'cover-letter', name: 'Cover Letter Writer', desc: 'Create tailored cover letters for your job applications.', category: 'Writing', isPro: false, workspaceId: 'ai-writing', icon: FileText },
    { id: 'social-media', name: 'Social Post Writer', desc: 'Draft viral captions and threads for LinkedIn, X, and Instagram.', category: 'Writing', isPro: false, workspaceId: 'ai-writing', icon: Zap },

    // Grammar
    { id: 'grammar-checker', name: 'Grammar Checker', desc: 'Identify complex grammatical errors and run stylistic checks.', category: 'Grammar', isPro: false, workspaceId: 'grammar', icon: CheckSquare },
    { id: 'spell-checker', name: 'Spell Checker', desc: 'Find orthographic spelling slips instantly.', category: 'Grammar', isPro: false, workspaceId: 'grammar', icon: CheckSquare },
    { id: 'punctuation', name: 'Punctuation Checker', desc: 'Perfect your commas, colons, and semi-colons.', category: 'Grammar', isPro: false, workspaceId: 'grammar', icon: CheckSquare },
    { id: 'tone-rewriter', name: 'Tone Rewriter', desc: 'Adjust your writing to sound polite, formal, or persuasive.', category: 'Grammar', isPro: true, workspaceId: 'grammar', icon: Sparkles },
    { id: 'readability', name: 'Readability Optimizer', desc: 'Evaluate and simplify prose complexity for better flow.', category: 'Grammar', isPro: false, workspaceId: 'grammar', icon: CheckSquare },

    // Paraphrasing
    { id: 'paraphraser-std', name: 'Standard Paraphraser', desc: 'Rephrase text to change structures while keeping meaning.', category: 'Paraphrasing', isPro: false, workspaceId: 'paraphrasing', icon: ArrowLeftRight },
    { id: 'paraphraser-flu', name: 'Fluency Tuner', desc: 'Make text sound natural, elegant, and grammatically perfect.', category: 'Paraphrasing', isPro: false, workspaceId: 'paraphrasing', icon: ArrowLeftRight },
    { id: 'paraphraser-form', name: 'Formalizer', desc: 'Elevate casual sentences into polished corporate-ready prose.', category: 'Paraphrasing', isPro: true, workspaceId: 'paraphrasing', icon: ArrowLeftRight },
    { id: 'paraphraser-acad', name: 'Academic Writer', desc: 'Tailor text for peer-reviewed journal standards.', category: 'Paraphrasing', isPro: true, workspaceId: 'paraphrasing', icon: ArrowLeftRight },
    { id: 'ai-humanizer', name: 'AI Humanizer', desc: 'Rewrite robotic text to sound highly organic and conversational.', category: 'Paraphrasing', isPro: true, workspaceId: 'ai-humanizer', icon: Sparkles },

    // Originality
    { id: 'ai-detector', name: 'AI Detector', desc: 'Scan files or pasted text to identify potential machine generation.', category: 'Originality', isPro: false, workspaceId: 'ai-detection', icon: ShieldAlert },
    { id: 'plagiarism-checker', name: 'Internal Similarity', desc: 'Compare two provided texts without claiming an external plagiarism scan.', category: 'Originality', isPro: true, workspaceId: 'ai-detection', icon: ShieldAlert },
    { id: 'citation-gen', name: 'Citation Generator', desc: 'Create APA, MLA, and Chicago bibliography references.', category: 'Originality', isPro: false, workspaceId: 'templates', icon: Bookmark },

    // PDF & Documents
    { id: 'pdf-chat', name: 'PDF Chat', desc: 'Have an interactive conversation with your uploaded PDF files.', category: 'PDF & Documents', isPro: true, workspaceId: 'pdf-intelligence', icon: Sparkles },
    { id: 'pdf-summarizer', name: 'PDF Summarizer', desc: 'Generate bulleted reports and executive briefs from long PDFs.', category: 'PDF & Documents', isPro: false, workspaceId: 'pdf-intelligence', icon: Folder },
    { id: 'ocr-scanner', name: 'Neural OCR', desc: 'Extract clean editable text from images, scans, and receipts.', category: 'PDF & Documents', isPro: true, workspaceId: 'ocr', icon: Scan },
    { id: 'doc-comparison', name: 'Document Compare', desc: 'Compare two text versions side-by-side to highlight changes.', category: 'PDF & Documents', isPro: false, workspaceId: 'documents', icon: Folder },

    // Translation
    { id: 'translator-pro', name: 'Translation Studio', desc: 'Translate and review content using backend-configured languages.', category: 'Translation', isPro: false, workspaceId: 'translation', icon: Languages },

    // Media
    { id: 'img-gen', name: 'AI Image Generator', desc: 'Generate vivid illustrations, logos, and stock imagery.', category: 'Media', isPro: true, workspaceId: 'templates', icon: Image },

    // Enterprise Ops
    { id: 'collaboration', name: 'Team Collaboration', desc: 'Share documents, notes, and templates with team members.', category: 'Enterprise', isPro: true, workspaceId: 'collaboration', icon: Users },
    { id: 'billing', name: 'Billing & Token Usage', desc: 'Manage your enterprise seats, invoices, and API limits.', category: 'Enterprise', isPro: false, workspaceId: 'billing', icon: CreditCard },
    { id: 'admin', name: 'SuperAdmin Dashboard', desc: 'Audit system parameters, workspace logs, and platform stats.', category: 'Enterprise', isPro: true, workspaceId: 'administration', icon: Shield }
  ];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in text-slate-800 dark:text-zinc-100">
      {/* Page Title Header */}
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">All Tools Directory</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">Discover and launch writing assistants, editing panels, and document tools built by GXA Technologies.</p>
      </div>

      {/* Search & Category Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input 
            type="text"
            placeholder="Search 100+ creative tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                activeCategory === cat 
                  ? 'bg-teal-500 text-white shadow-xs' 
                  : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-300 dark:text-zinc-700 animate-pulse" />
          <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-zinc-300">No matching tools found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Try adjusting your search query or choosing another category.</p>
          <button 
            onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Tools Grid Layout */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div 
                key={tool.id}
                className="group relative flex flex-col justify-between bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition duration-200 text-left"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    {tool.isPro ? (
                      <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        PRO
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700/60 text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                        FREE
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/60 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{tool.category}</span>
                  <button
                    onClick={() => {
                      if (tool.isPro) {
                        onOpenUpgradeModal();
                      } else {
                        onSelectWorkspace(tool.workspaceId);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 group-hover:translate-x-1 transition duration-200"
                  >
                    Open Tool <Zap className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
