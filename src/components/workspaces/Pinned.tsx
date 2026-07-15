import React, { useState } from 'react';
import { Pin, Search, FileText, MessageSquare, BookOpen, Layout, XCircle, ArrowUpRight } from 'lucide-react';
import { WorkspaceId } from '../../types';

interface PinnedItem {
  id: string;
  name: string;
  type: 'document' | 'chat' | 'pdf' | 'template';
  workspaceId: WorkspaceId;
  pinnedAt: string;
  size: string;
}

interface PinnedViewProps {
  onSelectWorkspace: (id: WorkspaceId) => void;
}

export default function PinnedView({ onSelectWorkspace }: PinnedViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<PinnedItem[]>([
    { id: 'pin-1', name: 'competitor_marketing_audit_v2.pdf', type: 'pdf', workspaceId: 'pdf-intelligence', pinnedAt: '2026-07-13 10:11', size: '12.4 MB' },
    { id: 'pin-2', name: 'react_performance_bottlenecks.txt', type: 'document', workspaceId: 'documents', pinnedAt: '2026-07-12 16:45', size: '8 KB' },
    { id: 'pin-3', name: 'Chat co-pilot about NextJS Router Logic', type: 'chat', workspaceId: 'ai-chat', pinnedAt: '2026-07-11 14:02', size: '22 KB' }
  ]);

  const handleUnpin = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Search Header */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input 
            type="text"
            placeholder="Search pinned workspace files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition font-bold"
          />
        </div>
      </div>

      {/* Directory Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 px-1">
          <Pin className="h-4.5 w-4.5 text-teal-500" />
          <span className="text-[10px] font-black uppercase tracking-widest font-mono">Workspace Pinned Grid ({filteredItems.length})</span>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const Icon = item.type === 'document' 
                ? FileText 
                : item.type === 'chat' 
                  ? MessageSquare 
                  : item.type === 'pdf' 
                    ? BookOpen 
                    : Layout;

              return (
                <div 
                  key={item.id}
                  className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/30 hover:bg-teal-500/[0.01] transition duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-9 w-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <button
                        onClick={() => handleUnpin(item.id)}
                        className="text-slate-400 hover:text-rose-500 transition"
                        title="Unpin from workspace"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-zinc-200 block truncate leading-tight">
                        {item.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono uppercase font-bold mt-1 block">
                        {item.type} • {item.size}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-850 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Pinned {item.pinnedAt.split(' ')[0]}</span>
                    <button
                      onClick={() => onSelectWorkspace(item.workspaceId)}
                      className="text-teal-500 font-black flex items-center gap-1 hover:underline"
                    >
                      Open <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <Pin className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">No Pinned Items</h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
              Pin any of your active documents, notes, chats, or images to keep them fixed at the top of your workspace.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
