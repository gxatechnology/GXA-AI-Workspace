import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';

interface SavedOutput {
  id: string;
  name?: string;
  title?: string;
  updatedAt?: string;
  size?: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<SavedOutput[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('gxa_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    if (!user?.email) { setLoading(false); return; }
    fetch('/api/documents', { headers: { Authorization: `Bearer ${user.email}` } })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setDocuments(data.documents || []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => documents.filter(document =>
    (document.name || document.title || '').toLowerCase().includes(search.toLowerCase())
  ), [documents, search]);

  return (
    <section className="max-w-5xl mx-auto space-y-5 text-left">
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Saved Outputs</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Outputs saved by your authenticated account appear here.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search saved outputs" className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500" />
      </div>
      {loading ? <p className="text-sm text-slate-400 py-12 text-center">Loading saved outputs…</p> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-16 text-center">
          <FileText className="h-9 w-9 mx-auto text-slate-300 dark:text-zinc-700" />
          <h2 className="mt-3 text-sm font-black text-slate-700 dark:text-zinc-300">No saved outputs yet</h2>
          <p className="mt-1 text-xs text-slate-400">Save an output from a writing tool to see it here.</p>
        </div>
      ) : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{filtered.map(document => <article key={document.id} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><FileText className="h-5 w-5 text-teal-500" /><h2 className="mt-3 text-sm font-bold truncate">{document.name || document.title || 'Untitled output'}</h2><p className="mt-1 text-[10px] text-slate-400">{document.updatedAt || document.size || 'Saved output'}</p></article>)}</div>}
    </section>
  );
}
