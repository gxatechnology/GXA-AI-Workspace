import React from 'react';
import { 
  LayoutDashboard,
  FileText,
  Folder,
  Settings,
  MessageSquare,
  BookOpen,
  Layout,
  Image,
  History,
  Heart,
  Pin,
  Share2,
  Trash2,
  HardDrive,
  Moon,
  Sun,
  ChevronRight,
  MoreHorizontal,
  CreditCard,
  Sparkles,
  Languages
} from 'lucide-react';
import { WorkspaceId } from '../types';

interface SidebarProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenUpgradeModal: () => void;
  collapsed?: boolean;
  isGuest?: boolean;
}

export default function Sidebar({ 
  activeWorkspace, 
  onSelectWorkspace, 
  theme,
  onToggleTheme,
  onOpenUpgradeModal,
  collapsed = false,
  isGuest = false
}: SidebarProps) {

  // Left Sidebar categories as specified in prompt
  const baseSections = [
    {
      title: 'Workspace Tools',
      items: [
        { id: 'paraphrasing', label: 'Paraphraser', icon: Layout },
        { id: 'grammar', label: 'Grammar Checker', icon: FileText },
        { id: 'ai-detection', label: 'AI Detector', icon: FileText },
        { id: 'ai-humanizer', label: 'AI Humanizer', icon: Sparkles },
        { id: 'ai-chat', label: 'AI Chats', icon: MessageSquare },
        { id: 'ai-writing', label: 'AI Writer', icon: FileText },
        { id: 'summarizer', label: 'Summarizer', icon: BookOpen },
        { id: 'translation', label: 'Translator', icon: Languages || BookOpen },
        { id: 'pdf-intelligence', label: 'PDF Library', icon: BookOpen },
      ]
    },
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Workspace Home', icon: LayoutDashboard },
        { id: 'projects', label: 'Projects', icon: Folder },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'templates', label: 'Templates', icon: Layout },
        { id: 'images', label: 'Images', icon: Image },
      ]
    },
    {
      title: 'Personal Hub',
      items: [
        { id: 'history', label: 'History', icon: History },
        { id: 'favorites', label: 'Favorites', icon: Heart },
        { id: 'pinned', label: 'Pinned Items', icon: Pin },
        { id: 'shared', label: 'Shared with Me', icon: Share2 },
        { id: 'trash', label: 'Trash Bin', icon: Trash2 },
        { id: 'storage', label: 'Storage Usage', icon: HardDrive },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'all-tools', label: 'All AI Tools', icon: MoreHorizontal },
        { id: 'pricing', label: 'Pricing & Plans', icon: CreditCard },
      ]
    }
  ];

  // Filter sections for guest users
  const navigationSections = isGuest
    ? [
        {
          title: 'Guest Workspace Tools',
          items: [
            { id: 'paraphrasing', label: 'Paraphraser', icon: Layout },
            { id: 'grammar', label: 'Grammar Checker', icon: FileText },
            { id: 'ai-detection', label: 'AI Detector', icon: FileText },
            { id: 'ai-humanizer', label: 'AI Humanizer', icon: Sparkles },
            { id: 'ai-chat', label: 'AI Chats', icon: MessageSquare },
            { id: 'ai-writing', label: 'AI Writer', icon: FileText },
            { id: 'summarizer', label: 'Summarizer', icon: BookOpen },
            { id: 'translation', label: 'Translator', icon: Languages || BookOpen },
            { id: 'pdf-intelligence', label: 'PDF Library', icon: BookOpen },
          ]
        },
        {
          title: 'System',
          items: [
            { id: 'all-tools', label: 'All AI Tools', icon: MoreHorizontal },
            { id: 'pricing', label: 'Pricing & Plans', icon: CreditCard },
          ]
        }
      ]
    : baseSections;

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} shrink-0 border-r flex flex-col justify-between h-screen sticky top-0 font-sans z-20 bg-slate-50/80 dark:bg-zinc-950 border-slate-200/75 dark:border-zinc-800 transition-all duration-300`}>
      
      {/* Brand & Navigation */}
      <div className="flex-1 flex flex-col min-h-0 text-left">
        
        {/* Brand Header */}
        <div className={`p-5 border-b border-slate-200/50 dark:border-zinc-800/60 text-left bg-white/40 dark:bg-zinc-950/40 ${collapsed ? 'flex justify-center' : 'space-y-1'}`}>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-teal-500 flex items-center justify-center font-black text-white shadow-md shadow-teal-500/10">
              GX
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  GXA AI Workspace
                </h1>
                <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mt-0.5">
                  GXA Technologies
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <p className="text-[8px] font-semibold text-slate-400 dark:text-zinc-500 tracking-wide pt-1">
              Technology • Marketing • Automation • Growth
            </p>
          )}
        </div>

        {/* Primary Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 select-none scrollbar-none">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed ? (
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-1.5 block">
                  {section.title}
                </span>
              ) : (
                <div className="h-px bg-slate-200/50 dark:bg-zinc-800/50 my-3 mx-2" />
              )}
              
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeWorkspace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectWorkspace(item.id as WorkspaceId)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-bold transition duration-205 group ${
                      isActive 
                        ? 'bg-teal-50 dark:bg-teal-950/35 text-teal-600 dark:text-teal-400 border-l-3 border-teal-500 font-black shadow-xs' 
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 transition ${
                        isActive ? 'text-teal-500' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
                      }`} />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {isActive && !collapsed && <ChevronRight className="h-3 w-3 text-teal-500/80" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Slim footer actions inside sidebar */}
      <div className={`p-4 border-t border-slate-200/50 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-950/40 flex ${collapsed ? 'flex-col gap-3 items-center justify-center' : 'items-center justify-between'}`}>
        <button 
          onClick={() => onSelectWorkspace('settings')}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition flex items-center gap-2 font-bold text-[11px]"
          title="Workspace Settings"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          {!collapsed && <span>Settings</span>}
        </button>

        <button 
          onClick={onToggleTheme}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition"
          title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
