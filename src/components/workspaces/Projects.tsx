import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  Search, 
  Grid, 
  List, 
  Plus, 
  Eye, 
  Download, 
  Trash2, 
  Clock, 
  Image, 
  HelpCircle,
  Loader2,
  Bookmark,
  Share2
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  type: 'Document' | 'Presentation' | 'Image' | 'Saved Output';
  toolUsed: string;
  updatedAt: string;
  size: string;
  status: 'Draft' | 'Published' | 'Shared';
  previewText?: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real database projects
  const fetchProjects = async () => {
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      const res = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${user.sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createBlankDraft = async () => {
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.sessionToken}`
        },
        body: JSON.stringify({
          name: 'Untitled Blank Draft',
          type: 'Document',
          toolUsed: 'AI Writer',
          previewText: 'Write or paste your creative draft here. Click save draft to commit changes to the workspace repository.',
          size: '1.5 KB',
          status: 'Draft'
        })
      });
      if (res.ok) {
        await fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProject = async (id: string) => {
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.sessionToken}`
        }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute dynamic folders
  const draftsCount = projects.filter(p => p.status === 'Draft').length;
  const publishedCount = projects.filter(p => p.status === 'Published').length;
  const sharedCount = projects.filter(p => p.status === 'Shared').length;
  const totalCount = projects.length;

  const folders = [
    { name: 'Active Drafts', count: draftsCount },
    { name: 'Published Work', count: publishedCount },
    { name: 'Shared Documents', count: sharedCount },
    { name: 'All Workspace Outputs', count: totalCount }
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (project.previewText && project.previewText.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Support loose type matches for backward compatibility with db entries
    const projType = project.type || 'Document';
    const matchesFilter = filterType === 'All' || projType.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in text-slate-800 dark:text-zinc-100">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="space-y-1">
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">My Projects</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Organize, draft, and manage your AI-assisted writings, summaries, and assets.</p>
        </div>
        <button 
          onClick={createBlankDraft}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white px-4 py-2.5 text-xs font-bold shadow-md transition shrink-0"
        >
          <Plus className="h-4 w-4" /> Create Draft
        </button>
      </div>

      {/* Folders Section */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 text-left">
        {folders.map((folder, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-xs hover:border-teal-500/40 dark:hover:border-teal-500/40 transition group cursor-pointer">
            <div className="flex items-center justify-between">
              <Folder className="h-8 w-8 text-teal-500/80 group-hover:scale-105 transition" />
              <span className="text-[10px] font-bold bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-zinc-400">{folder.count} items</span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-3">{folder.name}</h4>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Updated just now</p>
          </div>
        ))}
      </div>

      {/* Grid Filters Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <input 
            type="text"
            placeholder="Search projects by text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        {/* Filters and View mode */}
        <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
          <div className="flex gap-1 overflow-x-auto pr-1">
            {['All', 'Document', 'Presentation', 'Image', 'Saved Output'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  filterType === type 
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200/50' 
                    : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border border-transparent hover:bg-slate-100 dark:hover:bg-zinc-850'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

          {/* View Toggle */}
          <div className="flex bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-900 shadow-xs text-teal-600' : 'text-slate-400'}`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-zinc-900 shadow-xs text-teal-600' : 'text-slate-400'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List View */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800 space-y-2">
          <Loader2 className="mx-auto h-8 w-8 text-teal-500 animate-spin" />
          <span className="text-xs text-slate-400 font-bold block">Synchronizing your document vault...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Dynamic High Fidelity Empty State */
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800 space-y-4">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-300 dark:text-zinc-700 animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-700 dark:text-zinc-300">Your projects dashboard is empty</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Create a Blank Draft above or launch our suite of AI writing tools to begin populating your personal document repository.
            </p>
          </div>
          <button 
            onClick={createBlankDraft}
            className="inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
          >
            Create Blank Draft <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const projType = project.type || 'Document';
            const projStatus = project.status || 'Draft';
            return (
              <div 
                key={project.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 p-5 flex flex-col justify-between hover:shadow-md transition text-left relative overflow-hidden group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {projType === 'Document' && <FileText className="h-4.5 w-4.5 text-blue-500" />}
                      {projType === 'Image' && <Image className="h-4.5 w-4.5 text-emerald-500" />}
                      {projType === 'Saved Output' && <Clock className="h-4.5 w-4.5 text-purple-500" />}
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{projType}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      projStatus === 'Draft' ? 'bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400' :
                      projStatus === 'Published' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                      'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
                    }`}>
                      {projStatus}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition leading-snug">
                      {project.name}
                    </h4>
                    {project.previewText && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                        "{project.previewText}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-5 border-t border-slate-100 dark:border-zinc-800/60 flex justify-between items-center text-[11px] text-slate-400 dark:text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{project.toolUsed || 'AI Writer'}</span>
                    <span>•</span>
                    <span>{project.updatedAt || 'Just now'}</span>
                  </div>

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
                    <button 
                      onClick={() => deleteProject(project.id)}
                      className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded text-rose-500 transition" 
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-xs text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200/60 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="p-4">Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Tool Used</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                {filteredProjects.map((project) => {
                  const projType = project.type || 'Document';
                  const projStatus = project.status || 'Draft';
                  return (
                    <tr key={project.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/25 transition">
                      <td className="p-4 font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{project.name}</td>
                      <td className="p-4">{projType}</td>
                      <td className="p-4 font-semibold text-slate-500 dark:text-zinc-400">{project.toolUsed || 'AI Writer'}</td>
                      <td className="p-4">{project.updatedAt || 'Just now'}</td>
                      <td className="p-4 font-mono text-[10px] text-slate-400">{project.size || '1.0 KB'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          projStatus === 'Draft' ? 'bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400' :
                          projStatus === 'Published' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                          'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
                        }`}>
                          {projStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => deleteProject(project.id)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-rose-500 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
