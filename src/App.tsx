import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, Menu, Moon, Search, Sun, UserCircle, X, Zap } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import ToolExplorer from './components/ToolExplorer';
import UpgradeModal from './components/UpgradeModal';
import WorkspaceContent from './components/WorkspaceContent';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { getTool, isAuthenticatedRoute, toolRegistry } from './toolRegistry';
import { WorkspaceId } from './types';
import { authHeaders, storedUser } from './utils/auth';

const guestUser = { id: 'guest', subscription: 'free', guest: true };
const workspaceIds = new Set<WorkspaceId>(['home', 'dashboard', ...toolRegistry.map(tool => tool.route)] as WorkspaceId[]);

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(guestUser);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sharedText, setSharedText] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [pendingWorkspace, setPendingWorkspace] = useState<WorkspaceId | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<'PRO' | 'PRO PLUS'>('PRO');
  const [upgradeFeature, setUpgradeFeature] = useState('this premium feature');

  useEffect(() => {
    const restoredUser = storedUser();
    if (restoredUser) {
      fetch('/api/auth/profile', { headers: authHeaders(restoredUser) })
        .then(async response => { if (!response.ok) throw new Error('Session expired.'); return response.json(); })
        .then(body => { const next = { ...body.user, sessionToken: restoredUser.sessionToken }; setCurrentUser(next); localStorage.setItem('gxa_user', JSON.stringify(next)); if (window.location.pathname.startsWith('/admin') && (next.role === 'SuperAdmin' || next.adminRole)) setActiveWorkspace('administration'); })
        .catch(() => { localStorage.removeItem('gxa_user'); setCurrentUser(guestUser); if (window.location.pathname.startsWith('/admin')) setAuthMode('login'); });
    }
    const hash = window.location.hash.replace('#/', '') as WorkspaceId;
    if (workspaceIds.has(hash)) setActiveWorkspace(hash);
    if (window.location.pathname.startsWith('/admin')) {
      setPendingWorkspace('administration');
      if (restoredUser?.role === 'SuperAdmin' || restoredUser?.adminRole) setActiveWorkspace('administration');
      else setAuthMode('login');
    }
  }, []);

  const isAuthenticated = Boolean(currentUser && !currentUser.guest);
  const isAdmin = isAuthenticated && (currentUser.role === 'SuperAdmin' || Boolean(currentUser.adminRole));
  const activeTool = useMemo(() => getTool(activeWorkspace), [activeWorkspace]);

  const selectWorkspace = (route: WorkspaceId) => {
    if (route === 'administration' && !isAdmin) { setPendingWorkspace(route); setAuthMode('login'); return; }
    if (isAuthenticatedRoute(route) && !isAuthenticated) { setPendingWorkspace(route); setAuthMode('login'); return; }
    setActiveWorkspace(route); setSidebarOpen(false); setToolsOpen(false);
    if (route === 'administration') window.history.pushState({}, '', '/admin');
    else { if (window.location.pathname !== '/') window.history.pushState({}, '', '/'); window.history.replaceState({}, '', `/#/${route}`); }
  };

  const beginAuth = (mode: 'login' | 'register', returnTo: WorkspaceId = activeWorkspace) => { setPendingWorkspace(returnTo); setAuthMode(mode); };
  const loginSuccess = (user: any) => { if (user?.guest) { localStorage.removeItem('gxa_user'); setCurrentUser(guestUser); setAuthMode(null); setPendingWorkspace(null); selectAfterAuth('home'); return; } setCurrentUser(user); localStorage.setItem('gxa_user', JSON.stringify(user)); const destination = (pendingWorkspace && pendingWorkspace !== 'administration') || user.role === 'SuperAdmin' || user.adminRole ? pendingWorkspace : 'home'; setAuthMode(null); setPendingWorkspace(null); selectAfterAuth(destination || 'home'); };
  const selectAfterAuth = (route: WorkspaceId) => { setActiveWorkspace(route); window.history.replaceState({}, '', route === 'administration' ? '/admin' : `/#/${route}`); };
  const logout = async () => { try { await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders(currentUser) }); } finally { localStorage.removeItem('gxa_user'); setCurrentUser(guestUser); setActiveWorkspace('home'); window.history.replaceState({}, '', '/'); } };
  const showUpgrade = (featureName = activeTool?.name || 'this premium feature', plan: 'PRO' | 'PRO PLUS' = 'PRO') => { setUpgradeFeature(featureName); setUpgradePlan(plan); setUpgradeOpen(true); };

  if (authMode) return <LandingPage onLoginSuccess={loginSuccess} theme={theme} onToggleTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')} initialAuthMode={authMode} />;

  return <div className={`${theme === 'dark' ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'} flex h-screen overflow-hidden font-sans`}>
    {sidebarOpen && <div className="fixed inset-0 z-50 flex bg-slate-950/55 md:hidden"><Sidebar activeWorkspace={activeWorkspace} onSelectWorkspace={selectWorkspace} theme={theme} onToggleTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')} isAuthenticated={isAuthenticated} onOpenTools={() => setToolsOpen(true)} /><button onClick={() => setSidebarOpen(false)} aria-label="Close navigation" className="m-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900"><X className="h-5 w-5" /></button></div>}
    <div className="hidden h-screen md:block"><Sidebar activeWorkspace={activeWorkspace} onSelectWorkspace={selectWorkspace} theme={theme} onToggleTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')} collapsed={sidebarCollapsed} isAuthenticated={isAuthenticated} onOpenTools={() => setToolsOpen(true)} onCollapse={() => setSidebarCollapsed(value => !value)} /></div>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-900"><Menu className="h-5 w-5" /></button><button onClick={() => selectWorkspace('home')} className="flex items-center gap-2 md:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-[10px] font-black text-white">GX</span><strong className="hidden text-sm sm:block">GXA AI Workspace</strong></button><div className="hidden min-w-0 md:block"><strong className="block truncate text-sm">{activeWorkspace === 'home' ? 'Home Workspace' : activeTool?.name || 'GXA AI Workspace'}</strong><span className="block truncate text-[10px] text-slate-400">{activeWorkspace === 'home' ? 'Create, write and work smarter with AI' : activeTool?.description}</span></div></div>
        {!isAuthenticated ? <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2"><button onClick={() => selectWorkspace('pricing')} className="rounded-lg px-2 py-2 text-xs font-bold text-slate-600 hover:text-teal-600 sm:px-3 dark:text-zinc-300">Pricing</button><button onClick={() => beginAuth('login')} className="rounded-lg px-2 py-2 text-xs font-bold sm:px-3">Login</button><button onClick={() => beginAuth('register')} className="rounded-xl bg-teal-500 px-3 py-2 text-xs font-black text-white sm:px-4">Register</button></nav> : <div className="flex min-w-0 items-center gap-1 sm:gap-2"><WorkspaceSwitcher currentUser={currentUser} onOpenPlatform={() => selectWorkspace('platform')} /><button onClick={() => setToolsOpen(true)} aria-label="Search tools" className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:block dark:hover:bg-zinc-900"><Search className="h-4 w-4" /></button><span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-600 xl:block dark:bg-zinc-900 dark:text-zinc-300">{currentUser.subscription || 'Free'} plan</span><button onClick={() => currentUser.subscription === 'free' ? selectWorkspace('pricing') : selectWorkspace('billing')} className="hidden items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-2 text-xs font-black text-white md:flex"><Zap className="h-3.5 w-3.5" />{currentUser.subscription === 'free' ? 'Upgrade' : 'Manage Plan'}</button><button onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')} aria-label="Toggle theme" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900">{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button><UserCircle className="hidden h-7 w-7 text-teal-600 sm:block" aria-label="Profile" /><button onClick={logout} aria-label="Log out" className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" /></button></div>}
      </header>
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-3 dark:bg-zinc-950 sm:p-5 lg:p-7"><WorkspaceContent activeWorkspace={activeWorkspace} onSelectWorkspace={selectWorkspace} onOpenUpgradeModal={() => showUpgrade()} onOpenTools={() => setToolsOpen(true)} onRequireAuth={beginAuth} sharedText={sharedText} setSharedText={setSharedText} currentUser={currentUser} isAuthenticated={isAuthenticated} /></main>
    </div>
    <ToolExplorer open={toolsOpen} onClose={() => setToolsOpen(false)} onSelect={selectWorkspace} isAuthenticated={isAuthenticated} />
    <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} requiredPlan={upgradePlan} featureName={upgradeFeature} onGoToPricing={() => { setUpgradeOpen(false); selectWorkspace('pricing'); }} />
  </div>;
}
