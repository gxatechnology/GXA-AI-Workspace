import React, { useState } from 'react';
import { Share2, Search, FileText, Folder, User, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { WorkspaceId } from '../../types';

interface SharedItem {
  id: string;
  name: string;
  type: 'folder' | 'document';
  owner: string;
  role: 'Editor' | 'Viewer';
  dateShared: string;
  workspaceId: WorkspaceId;
}

interface SharedViewProps {
  onSelectWorkspace: (id: WorkspaceId) => void;
}

export default function SharedView({ onSelectWorkspace }: SharedViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<SharedItem[]>([
    { id: 'sh-1', name: 'Q3 Enterprise Product Design Specs', type: 'folder', owner: 'Clara Oswald', role: 'Editor', dateShared: '2026-07-12', workspaceId: 'projects' },
    { id: 'sh-2', name: 'competitor_marketing_audit_v2.pdf', type: 'document', owner: 'Amelia Pond', role: 'Viewer', dateShared: '2026-07-10', workspaceId: 'pdf-intelligence' },
    { id: 'sh-3', name: 'lead_outreach_campaign.md', type: 'document', owner: 'Rory Williams', role: 'Editor', dateShared: '2026-07-08', workspaceId: 'documents' }
  ]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Search Header */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input 
            type="text"
            placeholder="Search shared items or owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition font-bold"
          />
        </div>
      </div>

      {/* Shared Directory */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 px-1">
          <Share2 className="h-4.5 w-4.5 text-teal-500" />
          <span className="text-[10px] font-black uppercase tracking-widest font-mono">Shared Directory ({filteredItems.length})</span>
        </div>

        {filteredItems.length > 0 ? (
          <div className="border border-slate-100 dark:border-zinc-850 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-850 text-xs font-bold text-slate-700 dark:text-zinc-300">
            {filteredItems.map((item) => {
              const Icon = item.type === 'folder' ? Folder : FileText;
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/40 dark:bg-zinc-900/40 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5 text-slate-400 dark:text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-900 dark:text-zinc-100 font-bold block truncate max-w-xs sm:max-w-md">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2.5 text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> Shared by {item.owner}
                        </span>
                        <span>•</span>
                        <span>{item.dateShared}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Badge */}
                  <div className="flex items-center gap-3.5 self-end sm:self-auto shrink-0 font-mono text-[10px]">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                      item.role === 'Editor'
                        ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-200/40 text-teal-600 dark:text-teal-400'
                        : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/50 text-slate-500 dark:text-zinc-400'
                    }`}>
                      <ShieldCheck className="h-3 w-3" /> {item.role}
                    </span>

                    <button
                      onClick={() => onSelectWorkspace(item.workspaceId)}
                      className="inline-flex items-center gap-1.5 text-teal-500 hover:underline font-bold text-xs"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <Share2 className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">No Shared Content</h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
              You will see files, folders, or assets shared with your account here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
