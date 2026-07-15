import React, { useState } from 'react';
import { 
  Heart, 
  Search, 
  Folder, 
  FileText, 
  MessageSquare, 
  Layout, 
  ExternalLink,
  Star,
  CheckCircle,
  Clock
} from 'lucide-react';
import { WorkspaceId } from '../../types';

interface FavItem {
  id: string;
  name: string;
  type: 'project' | 'document' | 'chat' | 'template';
  workspaceId: WorkspaceId;
  savedAt: string;
  tags: string[];
}

interface FavoritesViewProps {
  onSelectWorkspace: (id: WorkspaceId) => void;
}

export default function FavoritesView({ onSelectWorkspace }: FavoritesViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'project' | 'document' | 'chat' | 'template'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<FavItem[]>([
    { id: 'fav-1', name: 'Q3 Product Marketing Launch Strategy', type: 'project', workspaceId: 'projects', savedAt: '2026-07-13 15:40', tags: ['Marketing', 'Launch'] },
    { id: 'fav-2', name: 'annual_sales_proposal.md', type: 'document', workspaceId: 'documents', savedAt: '2026-07-12 11:22', tags: ['Drafts', 'Sales'] },
    { id: 'fav-3', name: 'Brainstorming session on SaaS scaling loops', type: 'chat', workspaceId: 'ai-chat', savedAt: '2026-07-10 09:12', tags: ['Research', 'SaaS'] },
    { id: 'fav-4', name: 'E-commerce Cold Outreach Sequence', type: 'template', workspaceId: 'templates', savedAt: '2026-07-08 14:15', tags: ['Outreach', 'Templates'] }
  ]);

  const handleRemove = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const filteredFavs = favorites.filter(fav => {
    const matchesSearch = fav.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          fav.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || fav.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Search and Filters Hub */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text"
              placeholder="Search favorites or tag keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition font-bold"
            />
          </div>

          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {[
              { id: 'all', label: 'All Favorites' },
              { id: 'project', label: 'Projects' },
              { id: 'document', label: 'Documents' },
              { id: 'chat', label: 'Chats' },
              { id: 'template', label: 'Templates' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  filterType === tab.id 
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Directory Content */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-mono">
            Starred Items List ({filteredFavs.length})
          </span>
        </div>

        {filteredFavs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredFavs.map((fav) => {
              const Icon = fav.type === 'project' 
                ? Folder 
                : fav.type === 'document' 
                  ? FileText 
                  : fav.type === 'chat' 
                    ? MessageSquare 
                    : Layout;

              return (
                <div 
                  key={fav.id}
                  className="bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-200/45 dark:border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/40 hover:bg-teal-500/[0.01] transition duration-200"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-zinc-150 block truncate max-w-[180px]">
                            {fav.name}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono font-bold block">
                            {fav.type}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleRemove(fav.id)}
                        className="text-amber-500 hover:text-slate-400 transition"
                        title="Remove from Favorites"
                      >
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {fav.tags.map((tag, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white dark:bg-zinc-900 border border-slate-200/30 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 tracking-wider"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between border-t border-slate-200/30 dark:border-zinc-800/50 pt-3 mt-3">
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Starred {fav.savedAt.split(' ')[0]}
                    </span>

                    <button
                      onClick={() => onSelectWorkspace(fav.workspaceId)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-500 hover:underline hover:text-teal-600"
                    >
                      Open {fav.type === 'chat' ? 'Chat' : fav.type === 'project' ? 'Project' : 'File'} <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <Heart className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">No Favorites Found</h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
              Star your core projects, files, documents or prompt templates to show them in this central hub.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
