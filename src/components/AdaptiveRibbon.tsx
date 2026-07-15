import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Bot, CheckSquare, ChevronDown, Clock, FilePlus2, FileText, Folder, Languages, Menu, Moon, Search, ShieldAlert, Sparkles, Sun, X } from 'lucide-react';
import { WorkspaceId } from '../types';

interface NavItem {
  id: WorkspaceId;
  label: string;
  category: 'Create' | 'Writing' | 'Intelligence' | 'Workspace';
  icon: React.ComponentType<any>;
  authenticatedOnly?: boolean;
}

interface AdaptiveRibbonProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const primaryItems: NavItem[] = [
  { id: 'ai-writing', label: 'New', category: 'Create', icon: FilePlus2 },
  { id: 'paraphrasing', label: 'Paraphraser', category: 'Writing', icon: ArrowLeftRight },
  { id: 'grammar', label: 'Grammar Checker', category: 'Writing', icon: CheckSquare },
  { id: 'ai-detection', label: 'AI Detector', category: 'Intelligence', icon: ShieldAlert },
  { id: 'ai-humanizer', label: 'AI Humanizer', category: 'Writing', icon: Sparkles },
  { id: 'ai-chat', label: 'AI Chat', category: 'Intelligence', icon: Bot },
  { id: 'summarizer', label: 'Summarizer', category: 'Writing', icon: FileText },
  { id: 'translation', label: 'Translator', category: 'Writing', icon: Languages },
  { id: 'pdf-intelligence', label: 'PDF Tools', category: 'Intelligence', icon: FileText }
];

const moreItems: NavItem[] = [
  { id: 'templates', label: 'Templates', category: 'Create', icon: FileText },
  { id: 'prompts', label: 'Prompt Studio', category: 'Create', icon: Sparkles },
  { id: 'projects', label: 'Projects', category: 'Workspace', icon: Folder, authenticatedOnly: true },
  { id: 'history', label: 'History', category: 'Workspace', icon: Clock, authenticatedOnly: true },
  { id: 'documents', label: 'Saved Outputs', category: 'Workspace', icon: FileText, authenticatedOnly: true }
];

export default function AdaptiveRibbon({ activeWorkspace, onSelectWorkspace, isAuthenticated, theme, onToggleTheme }: AdaptiveRibbonProps) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const availableMore = useMemo(() => moreItems.filter(item => !item.authenticatedOnly || isAuthenticated), [isAuthenticated]);
  const filtered = availableMore.filter(item =>
    (category === 'All' || item.category === category) && item.label.toLowerCase().includes(query.toLowerCase())
  );
  const categories = ['All', ...Array.from(new Set(availableMore.map(item => item.category)))];
  const select = (id: WorkspaceId) => { onSelectWorkspace(id); setOpen(false); setMobileOpen(false); };

  return (
    <nav className="sticky top-16 z-30 border-b border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900" aria-label="Primary navigation">
      <div className="h-14 px-3 sm:px-5 lg:px-8 flex items-center gap-1">
        <button onClick={() => setMobileOpen(value => !value)} className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-zinc-300" aria-label="Open tools menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="hidden lg:flex items-center gap-1 min-w-0 flex-1">
          {primaryItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => select(item.id)} className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-lg whitespace-nowrap text-[11px] xl:text-xs font-bold transition ${activeWorkspace === item.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}><Icon className="h-3.5 w-3.5" />{item.label}</button>;
          })}
        </div>
        <div className="relative ml-auto" ref={menuRef}>
          <button onClick={() => setOpen(value => !value)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800">More <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} /></button>
          {open && (
            <div className="absolute right-0 top-12 w-[min(92vw,28rem)] rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-4">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools" className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
              <div className="flex gap-1 overflow-x-auto py-3">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${category === item ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>{item}</button>)}</div>
              <div className="grid sm:grid-cols-2 gap-1 max-h-72 overflow-y-auto">{filtered.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => select(item.id)} className="flex items-center gap-2.5 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800"><Icon className="h-4 w-4 text-teal-500" /><span><span className="block text-xs font-bold">{item.label}</span><span className="block text-[10px] text-slate-400">{item.category}</span></span></button>; })}{filtered.length === 0 && <p className="sm:col-span-2 py-8 text-center text-xs text-slate-400">No matching tools.</p>}</div>
              <button onClick={onToggleTheme} className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300">{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{theme === 'light' ? 'Dark theme' : 'Light theme'}</button>
            </div>
          )}
        </div>
      </div>
      {mobileOpen && <div className="lg:hidden border-t border-slate-100 dark:border-zinc-800 p-3 grid grid-cols-2 sm:grid-cols-3 gap-1 bg-white dark:bg-zinc-900">{primaryItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => select(item.id)} className={`flex items-center gap-2 rounded-lg p-2.5 text-xs font-bold ${activeWorkspace === item.id ? 'bg-teal-500/10 text-teal-600' : 'text-slate-600 dark:text-zinc-300'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div>}
    </nav>
  );
}
