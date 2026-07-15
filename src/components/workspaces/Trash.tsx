import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Trash, 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  Image, 
  Search,
  CheckCircle,
  Clock
} from 'lucide-react';

interface TrashItem {
  id: string;
  name: string;
  type: 'document' | 'chat' | 'image';
  deletedAt: string;
  daysRemaining: number;
  size: string;
}

export default function TrashView() {
  const [items, setItems] = useState<TrashItem[]>([
    { id: 't-1', name: 'draft_seo_campaign_ideas.txt', type: 'document', deletedAt: '2026-07-13 18:30', daysRemaining: 29, size: '4 KB' },
    { id: 't-2', name: 'Chat with GXA assistant about API Keys', type: 'chat', deletedAt: '2026-07-11 10:14', daysRemaining: 27, size: '15 KB' },
    { id: 't-3', name: 'gxa_logo_brutalist_mockup.png', type: 'image', deletedAt: '2026-07-09 15:40', daysRemaining: 25, size: '1.2 MB' },
    { id: 't-4', name: 'competitor_marketing_audit_v1.md', type: 'document', deletedAt: '2026-07-04 09:12', daysRemaining: 20, size: '28 KB' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRestore = (id: string, name: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showNotification(`Successfully restored "${name}" back to your active workspace.`);
  };

  const handleDeletePermanently = (id: string, name: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showNotification(`Permanently purged "${name}" from server storage.`);
  };

  const handleEmptyTrash = () => {
    if (items.length === 0) return;
    setItems([]);
    showNotification("All items permanently deleted from cloud database.");
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Retention Banner */}
      <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3.5 items-start">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">Storage Retention Policy</h4>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-semibold">
            Deleted projects, folders, documents, chats, and images are stored securely in our cold cloud trash for up to <strong className="text-amber-500 font-bold">30 days</strong>. After this grace period, they are automatically and permanently overwritten for compliance and security.
          </p>
        </div>
      </div>

      {/* Floating alert */}
      {notification && (
        <div className="bg-teal-500 text-white rounded-xl py-3 px-5 text-xs font-black flex items-center gap-2.5 shadow-lg shadow-teal-500/20 max-w-md animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main container */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl overflow-hidden p-5 space-y-4">
        
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text"
              placeholder="Search deleted files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition font-bold"
            />
          </div>

          <button
            onClick={handleEmptyTrash}
            disabled={items.length === 0}
            className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-500 hover:text-white border border-rose-200/60 dark:border-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black transition flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            <span>Empty Trash Bin</span>
          </button>
        </div>

        {/* List of items */}
        {filteredItems.length > 0 ? (
          <div className="border border-slate-100 dark:border-zinc-850 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-850">
            {filteredItems.map((item) => {
              const Icon = item.type === 'document' ? FileText : item.type === 'chat' ? MessageSquare : Image;
              const typeLabel = item.type.toUpperCase();
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/40 dark:bg-zinc-900/40 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition gap-4 text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-slate-900 dark:text-zinc-100 text-xs font-bold truncate max-w-sm sm:max-w-md block">
                          {item.name}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 font-black uppercase rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
                          {typeLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                        <span>Deleted: {item.deletedAt}</span>
                        <span>•</span>
                        <span>Size: {item.size}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right tools */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[10px] text-amber-500 font-black mr-2 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.daysRemaining} days left
                    </span>
                    <button
                      onClick={() => handleRestore(item.id, item.name)}
                      className="p-2 bg-slate-50 hover:bg-teal-50 dark:bg-zinc-800 dark:hover:bg-teal-950/40 border border-slate-200/50 dark:border-zinc-700/50 hover:border-teal-300 text-slate-600 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg transition"
                      title="Restore Item"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePermanently(item.id, item.name)}
                      className="p-2 bg-slate-50 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 border border-slate-200/50 dark:border-zinc-700/50 hover:border-rose-300 text-slate-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                      title="Delete Permanently"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <Trash2 className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">Trash Bin is Empty</h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
              Any items you delete inside your Projects, Documents, or AI Chats will reside here for 30 days.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
