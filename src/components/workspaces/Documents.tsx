import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  Search, 
  Star, 
  History, 
  Trash2, 
  Plus, 
  GitCompare, 
  ChevronRight, 
  FolderPlus, 
  Check, 
  Edit3, 
  Archive,
  StarOff,
  CornerDownRight
} from 'lucide-react';

interface CloudDoc {
  id: string;
  name: string;
  folder: string;
  updatedAt: string;
  size: string;
  favorite: boolean;
  content: string;
  versions: Array<{ id: string; label: string; date: string; content: string }>;
}

export default function Documents() {
  const [folders, setFolders] = useState<string[]>(['AI Drafts', 'Marketing Assets', 'Client Proposals', 'Unsorted']);
  const [activeFolder, setActiveFolder] = useState<string>('AI Drafts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [documents, setDocuments] = useState<CloudDoc[]>([
    {
      id: 'doc-1',
      name: 'annual_sales_proposal.md',
      folder: 'Client Proposals',
      updatedAt: '2026-07-13 14:23',
      size: '12 KB',
      favorite: true,
      content: 'We propose integrating GXA AI Workspace to accelerate B2B outreach pipeline pipelines by 312%. The total package includes enterprise SLA hosting behind an Express container gateway with port 3000 local mapping clusters.',
      versions: [
        { id: 'v3', label: 'Version 3 (Latest)', date: '2026-07-13 14:23', content: 'We propose integrating GXA AI Workspace to accelerate B2B outreach pipeline pipelines by 312%. The total package includes enterprise SLA hosting behind an Express container gateway with port 3000 local mapping clusters.' },
        { id: 'v2', label: 'Version 2 (AI Rewrite)', date: '2026-07-12 11:15', content: 'We propose incorporating GXA AI SaaS to boost sales pipeline efficiency. Full stack container setup includes direct secure gateway API endpoints.' },
        { id: 'v1', label: 'Version 1 (Initial Draft)', date: '2026-07-10 09:30', content: 'We want to sell them our workspace to speed up sales stuff.' }
      ]
    },
    {
      id: 'doc-2',
      name: 'react_performance_bottlenecks.txt',
      folder: 'AI Drafts',
      updatedAt: '2026-07-13 10:11',
      size: '8 KB',
      favorite: false,
      content: 'React 19 optimizes server action states automatically. However, deep nested dependency loops inside useEffect triggers remain key sources of thread blocking.',
      versions: [
        { id: 'v2', label: 'Version 2 (Final)', date: '2026-07-13 10:11', content: 'React 19 optimizes server action states automatically. However, deep nested dependency loops inside useEffect triggers remain key sources of thread blocking.' },
        { id: 'v1', label: 'Version 1 (Rough Draft)', date: '2026-07-13 10:00', content: 'React rendering is too slow because people make mistakes with dependencies.' }
      ]
    },
    {
      id: 'doc-3',
      name: 'lead_outreach_campaign.md',
      folder: 'Marketing Assets',
      updatedAt: '2026-07-12 16:45',
      size: '15 KB',
      favorite: true,
      content: 'Subject: Unlock 312% Higher Developer Output\nHi Team,\nTraditional workspace environments leak credentials and slow down devops pipeline runs. Incorporating GXA AI Workspace solves this via local-first containers mapping natively on secure ports.',
      versions: [
        { id: 'v1', label: 'Version 1 (Core)', date: '2026-07-12 16:45', content: 'Subject: Unlock 312% Higher Developer Output\nHi Team,\nTraditional workspace environments leak credentials and slow down devops pipeline runs. Incorporating GXA AI Workspace solves this via local-first containers mapping natively on secure ports.' }
      ]
    }
  ]);

  const [activeDocId, setActiveDocId] = useState<string>('doc-2');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [diffBaseId, setDiffBaseId] = useState<string>('v1');
  const [diffCompareId, setDiffCompareId] = useState<string>('v2');

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || folders.includes(newFolderName)) return;
    setFolders(prev => [...prev, newFolderName]);
    setNewFolderName('');
    setShowFolderModal(false);
  };

  const handleToggleFavorite = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, favorite: !d.favorite } : d));
  };

  const handleCreateDoc = () => {
    const name = `untitled_draft_${documents.length + 1}.txt`;
    const newDoc: CloudDoc = {
      id: `doc-${documents.length + 1}`,
      name,
      folder: activeFolder,
      updatedAt: 'Just Now',
      size: '1 KB',
      favorite: false,
      content: 'Start typing high-fidelity enterprise notes...',
      versions: [
        { id: 'v1', label: 'Version 1 (Initial Draft)', date: 'Just Now', content: 'Start typing high-fidelity enterprise notes...' }
      ]
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  };

  const handleContentChange = (val: string) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === activeDocId) {
        const updatedVersions = [...d.versions];
        if (updatedVersions[0]?.id === 'v-draft') {
          updatedVersions[0].content = val;
        } else {
          updatedVersions.unshift({
            id: 'v-draft',
            label: 'Unsaved Local Draft',
            date: 'Just Now',
            content: val
          });
        }
        return { ...d, content: val, versions: updatedVersions };
      }
      return d;
    }));
  };

  const filteredDocs = documents.filter(d => 
    d.folder === activeFolder && 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Folder sidebar */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
            Folder Navigation
          </span>
          <button 
            onClick={() => setShowFolderModal(true)}
            className="text-zinc-500 hover:text-white transition"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Folder Creator */}
        {showFolderModal && (
          <div className="bg-black/60 border border-zinc-800 rounded-lg p-2.5 mb-3 space-y-2">
            <input 
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder Name"
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setShowFolderModal(false)} className="text-[9px] font-bold px-2 py-1 bg-zinc-800 text-zinc-400 rounded">Cancel</button>
              <button onClick={handleCreateFolder} className="text-[9px] font-bold px-2 py-1 bg-indigo-600 text-white rounded">Add</button>
            </div>
          </div>
        )}

        <div className="space-y-1 overflow-y-auto flex-1 pr-1">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between group ${
                activeFolder === f ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
              }`}
            >
              <span className="truncate flex items-center gap-2">
                <Folder className="h-4 w-4 shrink-0" />
                {f}
              </span>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
            </button>
          ))}
        </div>
      </div>

      {/* Cloud documents list panel */}
      <div className="lg:col-span-3 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)] min-h-0">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
            Document Explorer
          </span>
          <button 
            onClick={handleCreateDoc}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative mb-3">
          <span className="absolute left-3 top-2.5 text-zinc-500">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 placeholder-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => {
                setActiveDocId(doc.id);
                setShowDiff(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition border cursor-pointer ${
                activeDocId === doc.id 
                  ? 'bg-zinc-900 border-zinc-800 text-white' 
                  : 'bg-transparent border-transparent text-neutral-400 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold truncate max-w-[130px] block">{doc.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(doc.id);
                  }}
                  className="text-zinc-500 hover:text-amber-400 transition"
                >
                  {doc.favorite ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <Star className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="text-[9px] text-zinc-500 block mt-1 font-mono">{doc.updatedAt} • {doc.size}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor or diff workspace panel */}
      <div className="lg:col-span-6 bg-black border border-zinc-800/80 rounded-xl flex flex-col h-[calc(100vh-12rem)] min-h-0 relative shadow-2xl overflow-hidden">
        {/* Document Editor Header */}
        <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-800/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-neutral-300">{activeDoc.name}</span>
          </div>

          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition ${
              showDiff 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <GitCompare className="h-3.5 w-3.5" />
            {showDiff ? 'Close Diff' : 'Compare Versions'}
          </button>
        </div>

        {/* Diff Side-by-Side screen */}
        {showDiff ? (
          <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-4">
            <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-2 mb-3 shrink-0">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Base Version</label>
                <select 
                  value={diffBaseId}
                  onChange={(e) => setDiffBaseId(e.target.value)}
                  className="bg-black border border-zinc-800 rounded p-1 text-[10px] text-neutral-300 focus:outline-none"
                >
                  {activeDoc.versions.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Compare Version</label>
                <select 
                  value={diffCompareId}
                  onChange={(e) => setDiffCompareId(e.target.value)}
                  className="bg-black border border-zinc-800 rounded p-1 text-[10px] text-neutral-300 focus:outline-none"
                >
                  {activeDoc.versions.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto leading-relaxed text-[11px] font-mono whitespace-pre-wrap text-left">
              <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-red-200">
                <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1 rounded mb-2 inline-block">Old State</span>
                <div>
                  {activeDoc.versions.find(v => v.id === diffBaseId)?.content}
                </div>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg text-emerald-200">
                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1 rounded mb-2 inline-block">New State</span>
                <div>
                  {activeDoc.versions.find(v => v.id === diffCompareId)?.content}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Standard Edit Canvas */}
            <textarea
              value={activeDoc.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 bg-transparent p-6 text-xs text-neutral-200 leading-relaxed focus:outline-none resize-none font-sans"
              placeholder="Type your notes here..."
            />

            {/* Version timeline column sidebar */}
            <div className="w-52 border-l border-zinc-800/80 bg-zinc-950 p-4 flex flex-col shrink-0">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block mb-3 font-mono flex items-center gap-1.5">
                <History className="h-3 w-3 text-indigo-400" /> Version Timeline
              </span>
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {activeDoc.versions.map((ver) => (
                  <button
                    key={ver.id}
                    onClick={() => {
                      // Instantly restore that specific version
                      setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, content: ver.content } : d));
                    }}
                    className="w-full text-left p-2 rounded border border-zinc-800 hover:border-indigo-500 bg-zinc-900/30 hover:bg-zinc-900/80 transition flex flex-col gap-1.5"
                  >
                    <span className="text-[10px] font-bold text-neutral-300 block leading-none">{ver.label}</span>
                    <span className="text-[8px] text-zinc-500 block leading-none">{ver.date}</span>
                    <span className="text-[9px] text-indigo-400 block font-semibold hover:underline">Restore version</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
