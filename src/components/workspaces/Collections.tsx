import React, { useState } from 'react';
import { 
  FolderHeart, 
  Search, 
  Plus, 
  FileText, 
  MessageSquare, 
  BookOpen, 
  ChevronRight, 
  Wand2, 
  CheckCircle,
  Tag
} from 'lucide-react';
import { WorkspaceId } from '../../types';

interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  docCount: number;
  chatCount: number;
  pdfCount: number;
}

interface CollectionsViewProps {
  onSelectWorkspace: (id: WorkspaceId) => void;
}

export default function CollectionsView({ onSelectWorkspace }: CollectionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('bg-purple-500');
  
  const [collections, setCollections] = useState<Collection[]>([
    { id: 'c-1', name: 'Marketing & SEO Campaigns', description: 'B2B lead sequences, outreach copies, and landing page assets.', color: 'bg-indigo-500', docCount: 8, chatCount: 14, pdfCount: 3 },
    { id: 'c-2', name: 'College Academic Research', description: 'Thesis drafts, research notes, and compiled source pdfs.', color: 'bg-emerald-500', docCount: 12, chatCount: 4, pdfCount: 9 },
    { id: 'c-3', name: 'Invoices & Client Billing', description: 'Corporate invoices, consulting timesheets, and estimates.', color: 'bg-amber-500', docCount: 5, chatCount: 2, pdfCount: 1 },
    { id: 'c-4', name: 'Software Product Dev', description: 'API references, design layouts, and technical schema drafts.', color: 'bg-rose-500', docCount: 15, chatCount: 20, pdfCount: 4 },
    { id: 'c-5', name: 'Personal Organizers', description: 'Vacation plans, fitness trackers, and daily gratitude logs.', color: 'bg-teal-500', docCount: 3, chatCount: 1, pdfCount: 0 }
  ]);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newColl: Collection = {
      id: `c-${Date.now()}`,
      name: newName,
      description: newDesc || 'No description provided.',
      color: newColor,
      docCount: 0,
      chatCount: 0,
      pdfCount: 0
    };

    setCollections(prev => [...prev, newColl]);
    setNewName('');
    setNewDesc('');
    setShowModal(false);
  };

  const filtered = collections.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Search Header and Quick create trigger */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input 
            type="text"
            placeholder="Search custom collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition font-bold"
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 px-1">
          <FolderHeart className="h-4.5 w-4.5 text-teal-500" />
          <span className="text-[10px] font-black uppercase tracking-widest font-mono">Your Smart Collections</span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div 
                key={c.id} 
                className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/25 transition duration-150 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-3 w-3 rounded-full ${c.color} shrink-0`} />
                    <span className="text-xs font-black text-slate-900 dark:text-zinc-150 block truncate max-w-[200px]">
                      {c.name}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>
                </div>

                {/* Counter Stats & Link */}
                <div className="border-t border-slate-100 dark:border-zinc-850 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                  <div className="flex gap-2.5">
                    <span className="flex items-center gap-1" title="Documents count">
                      <FileText className="h-3.5 w-3.5 text-slate-400" /> {c.docCount}
                    </span>
                    <span className="flex items-center gap-1" title="Chats count">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> {c.chatCount}
                    </span>
                    <span className="flex items-center gap-1" title="PDF Library count">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" /> {c.pdfCount}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectWorkspace('documents')}
                    className="text-teal-500 font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            <FolderHeart className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">No Collections Match</h4>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-fade-in text-left shadow-2xl">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">New Smart Collection</h3>
            
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Collection Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Invoices, Clients, Marketing, College..."
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Description</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe what lives in this smart grouping..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 resize-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Accent Tag Color</label>
                <div className="flex gap-2">
                  {[
                    'bg-indigo-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-teal-500',
                    'bg-pink-500'
                  ].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewColor(col)}
                      className={`h-6 w-6 rounded-full ${col} border-2 transition ${
                        newColor === col ? 'border-teal-500 scale-110 shadow-sm' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-black rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-black rounded-xl transition shadow-md"
                >
                  Create Grouping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
