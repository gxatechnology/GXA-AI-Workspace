import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard,
  Folder,
  ArrowLeftRight,
  CheckSquare,
  ShieldAlert,
  Sparkles,
  Bot,
  BookOpen,
  Languages,
  FileText,
  Zap,
  CreditCard,
  Settings,
  ChevronDown,
  Search,
  Pin,
  Clock,
  Menu
} from 'lucide-react';
import { WorkspaceId } from '../types';

interface ToolItem {
  id: WorkspaceId;
  label: string;
  icon: React.ComponentType<any>;
  category: 'General' | 'Writing' | 'Intelligence' | 'Compliance' | 'Storage' | 'Billing';
}

interface AdaptiveRibbonProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
}

export default function AdaptiveRibbon({ activeWorkspace, onSelectWorkspace }: AdaptiveRibbonProps) {
  const [width, setWidth] = useState(window.innerWidth);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [recentTools, setRecentTools] = useState<WorkspaceId[]>(['dashboard', 'pdf-intelligence']);
  
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allTools: ToolItem[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, category: 'General' },
    { id: 'projects', label: 'My Projects', icon: Folder, category: 'Storage' },
    { id: 'paraphrasing', label: 'Paraphraser', icon: ArrowLeftRight, category: 'Writing' },
    { id: 'grammar', label: 'Grammar', icon: CheckSquare, category: 'Writing' },
    { id: 'ai-detection', label: 'AI Detector', icon: ShieldAlert, category: 'Compliance' },
    { id: 'ai-humanizer', label: 'AI Humanizer', icon: Sparkles, category: 'Writing' },
    { id: 'ai-chat', label: 'AI Chat Co-pilot', icon: Bot, category: 'Writing' },
    { id: 'summarizer', label: 'Summarizer', icon: BookOpen, category: 'Intelligence' },
    { id: 'translation', label: 'Translator', icon: Languages, category: 'Intelligence' },
    { id: 'pdf-intelligence', label: 'PDF Chat Tools', icon: FileText, category: 'Intelligence' },
    { id: 'ocr', label: 'Neural OCR', icon: Zap, category: 'Intelligence' },
    { id: 'prompts', label: 'Prompts Studio', icon: Zap, category: 'General' },
    { id: 'templates', label: 'Templates', icon: BookOpen, category: 'General' },
    { id: 'pricing', label: 'Pricing & Plans', icon: CreditCard, category: 'Billing' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'General' },
  ];

  // Tool Visibility Logic Breakpoints
  let visibleCount = 12;
  if (width > 1400) {
    visibleCount = 12;
  } else if (width > 1200) {
    visibleCount = 8;
  } else if (width > 1000) {
    visibleCount = 6;
  } else if (width > 800) {
    visibleCount = 4;
  } else if (width > 600) {
    visibleCount = 3;
  } else {
    visibleCount = 2;
  }

  const visibleTools = allTools.slice(0, visibleCount);
  const overflowTools = allTools.slice(visibleCount);

  // Filter overflow tools by search & category in "More" menu
  const filteredOverflow = overflowTools.filter(tool => {
    const matchesSearch = tool.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToolClick = (id: WorkspaceId) => {
    onSelectWorkspace(id);
    setIsMoreOpen(false);
    // Update recents
    setRecentTools(prev => {
      const filtered = prev.filter(item => item !== id);
      return [id, ...filtered].slice(0, 3);
    });
  };

  const categories = ['All', 'Writing', 'Intelligence', 'General', 'Storage'];

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-slate-200/50 dark:border-zinc-800 px-6 py-2 shrink-0 flex items-center justify-between text-left select-none relative z-10 transition">
      
      {/* Horizontal Nav Row */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[calc(100%-120px)]">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeWorkspace === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                isActive 
                  ? 'bg-teal-500 text-white shadow-xs font-black' 
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* "More" Trigger Dropdown Button */}
      {overflowTools.length > 0 && (
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 hover:border-teal-500/50 ${
              isMoreOpen ? 'ring-1 ring-teal-500 border-teal-500' : ''
            }`}
          >
            <Menu className="h-4 w-4 text-teal-500 shrink-0" />
            <span>More</span>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition duration-150 ${isMoreOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded Dynamic Dropdown Drawer */}
          {isMoreOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-4 flex flex-col gap-4 text-left z-30 animate-fade-in">
              
              {/* Dropdown Header & Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search and launch tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 font-sans"
                />
              </div>

              {/* Category Quick Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[9px] font-extrabold px-2 py-1 rounded transition uppercase tracking-wide ${
                      selectedCategory === cat 
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/50' 
                        : 'bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-zinc-500 hover:text-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Recents Subsection */}
              {searchQuery === '' && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-3 w-3 text-teal-500/80" /> Recent Tools
                  </span>
                  <div className="flex gap-2">
                    {recentTools.map((id) => {
                      const tool = allTools.find(t => t.id === id);
                      if (!tool) return null;
                      const Icon = tool.icon;
                      return (
                        <button
                          key={id}
                          onClick={() => handleToolClick(id)}
                          className="flex-1 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-50/10 dark:hover:bg-teal-950/10 border border-slate-200/60 dark:border-zinc-800 rounded-lg p-2 text-center text-[10px] font-bold text-slate-700 dark:text-zinc-300 transition"
                        >
                          <Icon className="h-4 w-4 mx-auto mb-1 text-teal-500" />
                          <span className="block truncate">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamically List Filtered Overflow Tools */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                  All Workspace Modules
                </span>
                {filteredOverflow.length === 0 ? (
                  <span className="text-[11px] text-slate-400 block text-center py-4">No tools match your query.</span>
                ) : (
                  <div className="grid gap-1">
                    {filteredOverflow.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeWorkspace === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleToolClick(tool.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold transition text-left ${
                            isActive 
                              ? 'bg-teal-500 text-white font-black' 
                              : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="flex-1 truncate">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
