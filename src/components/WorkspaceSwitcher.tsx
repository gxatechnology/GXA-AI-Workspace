import React, { useEffect, useState } from 'react';
import { Building2, ChevronDown, Loader2, UserRound } from 'lucide-react';
import { authHeaders } from '../utils/auth';

interface Props { currentUser: any; onOpenPlatform: () => void }

export default function WorkspaceSwitcher({ currentUser, onOpenPlatform }: Props) {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/platform/context', { headers: authHeaders(currentUser) })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Workspace context unavailable.'); return body; })
      .then(body => { setWorkspaces(body.workspaces || []); setActiveId(body.context?.workspace?.id || ''); })
      .catch(cause => setError(cause.message))
      .finally(() => setLoading(false));
  }, [currentUser?.sessionToken]);

  const activate = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeId) return;
    setLoading(true); setError('');
    const response = await fetch('/api/platform/context/activate', { method: 'POST', headers: { ...authHeaders(currentUser), 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || 'Could not switch workspace.'); setLoading(false); return; }
    localStorage.removeItem('gxa_recent_tools');
    window.location.reload();
  };

  if (loading && !workspaces.length) return <span className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /><span className="hidden lg:inline">Workspace</span></span>;
  return <div className="relative flex min-w-0 items-center gap-1 lg:gap-2">
    <label className="sr-only" htmlFor="workspace-switcher">Active workspace</label>
    <span className="pointer-events-none absolute left-2.5 z-10">{workspaces.find(item => item.id === activeId)?.tenantType === 'organization' ? <Building2 className="h-3.5 w-3.5 text-teal-600" /> : <UserRound className="h-3.5 w-3.5 text-teal-600" />}</span>
    <select id="workspace-switcher" value={activeId} onChange={event => activate(event.target.value)} className="hidden max-w-52 appearance-none truncate rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500 sm:block dark:border-zinc-800 dark:bg-zinc-900">
      {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}{workspace.role && workspace.tenantType === 'organization' ? ` · ${workspace.role}` : ''}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute right-[4.2rem] hidden h-3.5 w-3.5 text-slate-400 sm:block lg:right-[4.7rem]" />
    <button onClick={onOpenPlatform} aria-label="Manage workspaces and organization" className="rounded-lg px-2 py-2 text-[10px] font-bold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950"><Building2 className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Manage</span></button>
    {error && <span role="status" className="sr-only">{error}</span>}
  </div>;
}
