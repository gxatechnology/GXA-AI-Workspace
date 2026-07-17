import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  FileText, 
  MessageSquare, 
  Image, 
  Plus, 
  Database, 
  Filter, 
  Trash2, 
  CheckCircle,
  FolderHeart
} from 'lucide-react';

interface HistoryItem {
  id: string;
  time: string;
  date: string;
  action: string;
  item: string;
  category: 'document' | 'chat' | 'image' | 'system';
}

export default function HistoryView() {
  const [filter, setFilter] = useState<'all' | 'document' | 'chat' | 'image' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const timeline: HistoryItem[] = [
    { id: 'h-1', time: '14:52', date: 'Today', action: 'Synchronized workspace with local database index', item: 'db.json', category: 'system' },
    { id: 'h-2', time: '14:23', date: 'Today', action: 'Saved and committed document version revision', item: 'annual_sales_proposal.md', category: 'document' },
    { id: 'h-3', time: '11:15', date: 'Today', action: 'Generated brutalist graphic illustration asset', item: 'gxa_logo_brutalist_mockup.png', category: 'image' },
    { id: 'h-4', time: '10:14', date: 'Yesterday', action: 'Created new AI chat co-pilot session', item: 'Chat about local Express port proxy', category: 'chat' },
    { id: 'h-5', time: '18:30', date: '2026-07-11', action: 'Moved draft_seo_campaign_ideas.txt to Trash', item: 'Trash Bin', category: 'system' },
    { id: 'h-6', time: '14:15', date: '2026-07-10', action: 'Starred outreach campaign structure template', item: 'E-commerce Cold Outreach Sequence', category: 'document' }
  ];

  const filteredTimeline = timeline.filter(item => {
    const matchesSearch = item.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.item.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filter === 'all' || item.category === filter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Search and Filters */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text"
              placeholder="Search activity records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition font-bold"
            />
          </div>

          {/* Activity Category Filters */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {[
              { id: 'all', label: 'All Activities' },
              { id: 'document', label: 'Documents' },
              { id: 'chat', label: 'Chats' },
              { id: 'image', label: 'Graphics' },
              { id: 'system', label: 'System Logs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  filter === tab.id 
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

      {/* Timeline Layout */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 px-1">
          <Clock className="h-4.5 w-4.5 text-teal-500" />
          <span className="text-[10px] font-black uppercase tracking-widest font-mono">Continuous Activity Timeline</span>
        </div>

        {filteredTimeline.length > 0 ? (
          <div className="relative border-l border-slate-100 dark:border-zinc-850 ml-3.5 pl-6 space-y-6">
            {filteredTimeline.map((item) => {
              const Icon = item.category === 'document' 
                ? FileText 
                : item.category === 'chat' 
                  ? MessageSquare 
                  : item.category === 'image' 
                    ? Image 
                    : Database;

              return (
                <div key={item.id} className="relative text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-zinc-950 border-2 border-teal-500 flex items-center justify-center shadow-xs">
                    <div className="h-1 w-1 bg-teal-500 rounded-full" />
                  </div>

                  <div className="space-y-1.5 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 rounded-2xl p-4 max-w-2xl hover:border-teal-500/25 transition">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.date} at {item.time}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200/30 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-mono shrink-0">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-800 dark:text-zinc-200 font-semibold leading-relaxed">
                          {item.action}
                        </p>
                        <span className="text-[10px] text-teal-500 font-mono font-black mt-1 block">
                          → {item.item}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <Clock className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">No Activity Records</h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
              Choose other filter parameters or search expressions.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
