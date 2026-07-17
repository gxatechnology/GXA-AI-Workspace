import React, { useState, useEffect } from 'react';
import { 
  CloudLightning, 
  Database, 
  GitBranch, 
  FolderHeart, 
  Clock, 
  Pin, 
  Trash2, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Plus,
  Compass,
  Zap,
  Layers,
  Search,
  Tag,
  UserCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { WorkspaceId } from '../types';

interface PropertiesPanelProps {
  activeWorkspace: WorkspaceId;
  currentUser?: any;
  onSelectWorkspace: (id: WorkspaceId) => void;
  sharedText: string;
  setSharedText: (text: string) => void;
  onOpenUpgradeModal: () => void;
}

export default function PropertiesPanel({
  activeWorkspace,
  currentUser,
  onSelectWorkspace,
  sharedText,
  setSharedText,
  onOpenUpgradeModal
}: PropertiesPanelProps) {
  const [syncProgress, setSyncProgress] = useState(100);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);
  const [customTag, setCustomTag] = useState('');
  const [userTags, setUserTags] = useState<string[]>(['Marketing', 'Research', 'Academic', 'Drafts']);
  
  // Storage Metrics
  const isGuestUser = !currentUser || currentUser.guest;
  const planType = isGuestUser ? 'Free Plan' : (currentUser?.subscription?.toUpperCase() || 'FREE PLAN');
  const storageLimitGB = currentUser?.subscription === 'pro' ? 100 : 2;
  const storageUsedMB = currentUser?.subscription === 'pro' ? 412 : 780;
  const storagePercentage = (storageUsedMB / (storageLimitGB * 1024)) * 100;

  // System Sync Simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSyncing(true);
      setSyncProgress(25);
      setTimeout(() => setSyncProgress(65), 300);
      setTimeout(() => setSyncProgress(100), 700);
      setTimeout(() => setIsSyncing(false), 900);
    }, 15000); // Sync every 15 seconds
    return () => clearInterval(timer);
  }, []);

  const handleQuickCreate = (type: string) => {
    if (type === 'Document' || type === 'Project') {
      onSelectWorkspace('projects');
    } else if (type === 'Chat') {
      onSelectWorkspace('ai-chat');
    } else if (type === 'PDF') {
      onSelectWorkspace('pdf-intelligence');
    } else if (type === 'Template') {
      onSelectWorkspace('templates');
    } else if (type === 'Image') {
      onSelectWorkspace('images');
    } else {
      onSelectWorkspace('dashboard');
    }
  };

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTag.trim() && !userTags.includes(customTag.trim())) {
      setUserTags([...userTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200/50 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 p-5 overflow-y-auto hidden lg:flex flex-col h-full text-left font-sans select-none space-y-6 scrollbar-thin">
      
      {/* 1. QUICK CREATE FLOATING TRIGGER BAR */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
          <Compass className="h-4 w-4" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest font-mono">Quick Create</span>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Project', icon: <Plus className="h-3 w-3" /> },
            { label: 'Document', icon: <Plus className="h-3 w-3" /> },
            { label: 'Folder', icon: <Plus className="h-3 w-3" /> },
            { label: 'Chat', icon: <Plus className="h-3 w-3" /> },
            { label: 'PDF', icon: <Plus className="h-3 w-3" /> },
            { label: 'Image', icon: <Plus className="h-3 w-3" /> },
            { label: 'Template', icon: <Plus className="h-3 w-3" /> },
            { label: 'Present', icon: <Plus className="h-3 w-3" /> }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickCreate(item.label)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-teal-500/[0.04] dark:hover:bg-teal-500/[0.04] border border-slate-200/60 dark:border-zinc-850 rounded-xl text-[11px] font-black text-slate-700 dark:text-zinc-300 transition duration-150 active:scale-95 text-left"
            >
              <span className="text-teal-500">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. REALTIME ENGINE STATUS */}
      <div className="bg-slate-50/50 dark:bg-zinc-950/30 rounded-2xl border border-slate-200/40 dark:border-zinc-800/60 p-4 space-y-3.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono">Workspace Engine</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[9px] font-extrabold uppercase text-teal-600 dark:text-teal-400 border border-teal-200/30">
            ★ {planType}
          </span>
        </div>

        {/* Sync Controls */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
              <CloudLightning className="h-3.5 w-3.5 text-teal-500" /> Auto Sync
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              {isSyncing ? `Syncing ${syncProgress}%` : 'Synced'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`bg-teal-500 h-full transition-all duration-300 ${isSyncing ? 'animate-pulse' : ''}`}
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>

        {/* Conflict Detection & Offline */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-zinc-850">
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Offline availability</span>
            <button 
              onClick={() => setOfflineMode(!offlineMode)}
              className={`text-[10px] font-black block transition hover:underline ${offlineMode ? 'text-teal-500' : 'text-slate-400'}`}
            >
              {offlineMode ? '● Enabled' : '○ Disabled'}
            </button>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Conflicts</span>
            <span className="text-[10px] font-black text-slate-600 dark:text-zinc-400 block">
              ● Zero Detected
            </span>
          </div>
        </div>
      </div>

      {/* 3. CLOUD STORAGE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Workspace Storage</span>
          <button onClick={onOpenUpgradeModal} className="text-teal-500 hover:underline">Manage</button>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700 dark:text-zinc-300">{storageUsedMB} MB of {storageLimitGB} GB</span>
            <span className="text-slate-400 font-mono text-[10px]">{storagePercentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Largest Files: 12.4 MB</span>
            <span>Cloud Sync: OK</span>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE CONTEXT PROPERTIES */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
          <Layers className="h-3.5 w-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest font-mono">Active context</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-2xl p-4 text-xs font-bold text-slate-600 dark:text-zinc-400 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Current Scope:</span>
            <span className="text-slate-800 dark:text-zinc-200 uppercase text-[10px] tracking-wide font-black">{activeWorkspace.replace('-', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Last Action:</span>
            <span className="text-slate-500 dark:text-zinc-300">Just now</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Collaborators:</span>
            <span className="text-slate-500 dark:text-zinc-300">Local Only</span>
          </div>
          {sharedText && (
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-2.5 flex justify-between items-center">
              <span className="text-slate-400">Composer Text:</span>
              <span className="text-teal-500 font-mono text-[10px]">{sharedText.split(' ').length} words</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. CUSTOM TAGS HUB */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
          <Tag className="h-3.5 w-3.5" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest font-mono font-black">Workspace Tags</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <form onSubmit={addTag} className="flex gap-1.5">
            <input 
              type="text" 
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Add Tag"
              className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 flex-1"
            />
            <button type="submit" className="px-2.5 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-bold transition">
              +
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {userTags.map((tag, i) => (
              <span 
                key={i} 
                className="px-2.5 py-1 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-150/20 text-teal-600 dark:text-teal-400 text-[9px] font-black uppercase tracking-wider"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

    </aside>
  );
}
