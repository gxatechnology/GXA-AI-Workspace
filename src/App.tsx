import React, { useEffect, useState } from 'react';
import { Bell, LogOut, Moon, Sun, UserCircle, Zap } from 'lucide-react';
import AdaptiveRibbon from './components/AdaptiveRibbon';
import LandingPage from './components/LandingPage';
import UpgradeModal from './components/UpgradeModal';
import WorkspaceContent from './components/WorkspaceContent';
import { WorkspaceId } from './types';

type AuthRoute = '/login' | '/register' | null;

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('paraphrasing');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sharedText, setSharedText] = useState('');
  const [authRoute, setAuthRoute] = useState<AuthRoute>(null);
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.pathname === '/admin');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<'PRO' | 'PRO PLUS'>('PRO');
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('this Premium feature');

  useEffect(() => {
    const savedUser = localStorage.getItem('gxa_user');
    if (savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); }
      catch { localStorage.removeItem('gxa_user'); }
    }
    const syncRoute = () => {
      const path = window.location.pathname;
      setAuthRoute(path === '/login' || path === '/register' ? path : null);
      setIsAdminRoute(path === '/admin');
    };
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setAuthRoute(path === '/login' || path === '/register' ? path : null);
    setIsAdminRoute(path === '/admin');
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('gxa_user', JSON.stringify(user));
    navigate('/');
    setActiveWorkspace(sessionStorage.getItem('gxa_pending_plan') ? 'pricing' : 'paraphrasing');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gxa_user');
    navigate('/');
    setActiveWorkspace('paraphrasing');
  };

  const selectWorkspace = (workspace: WorkspaceId) => {
    if (workspace === 'administration') {
      navigate('/admin');
      return;
    }
    if (window.location.pathname !== '/') navigate('/');
    setActiveWorkspace(workspace);
  };

  const triggerPremiumLock = (featureName: string, requiredPlan: 'PRO' | 'PRO PLUS') => {
    setUpgradeFeatureName(featureName);
    setUpgradeRequiredPlan(requiredPlan);
    setIsUpgradeModalOpen(true);
  };

  if (authRoute) {
    return (
      <LandingPage
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')}
        initialAuthMode={authRoute === '/register' ? 'register' : 'login'}
      />
    );
  }

  const isAuthenticated = Boolean(currentUser && !currentUser.guest);
  const isAdmin = isAuthenticated && currentUser.role === 'SuperAdmin';
  const visibleWorkspace = isAdminRoute && isAdmin ? 'administration' : activeWorkspace;

  return (
    <div className={`${theme === 'dark' ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'} min-h-screen font-sans transition-colors`}>
      <header className="h-16 sticky top-0 z-40 border-b border-slate-200/70 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <button onClick={() => { navigate('/'); setActiveWorkspace('paraphrasing'); }} className="flex items-center gap-2.5 text-left shrink-0">
          <span className="h-9 w-9 rounded-xl bg-teal-500 flex items-center justify-center font-black text-white shadow-sm">GX</span>
          <span className="text-sm font-black text-slate-900 dark:text-white hidden xs:block sm:block">GXA AI Workspace</span>
        </button>

        {!isAuthenticated ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => selectWorkspace('pricing')} className="px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-teal-600">Pricing</button>
            <button onClick={() => navigate('/login')} className="px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200">Login</button>
            <button onClick={() => navigate('/register')} className="px-3 sm:px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-black">Register</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => selectWorkspace(currentUser.subscription === 'free' ? 'pricing' : 'billing')} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500 text-white text-xs font-black">
              <Zap className="h-3.5 w-3.5" /> {currentUser.subscription === 'free' ? 'Upgrade' : 'Manage Plan'}
            </button>
            <button aria-label="Notifications" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"><Bell className="h-4 w-4" /></button>
            <button aria-label="Toggle theme" onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800">{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-zinc-700 pl-2">
              <UserCircle className="h-7 w-7 text-teal-600" aria-label="Profile" />
              <button onClick={handleLogout} aria-label="Log out" className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </header>

      <AdaptiveRibbon activeWorkspace={visibleWorkspace} onSelectWorkspace={selectWorkspace} isAuthenticated={isAuthenticated} theme={theme} onToggleTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')} />

      <main className="min-h-[calc(100vh-7.5rem)] bg-slate-100/60 dark:bg-zinc-950 p-3 sm:p-5 lg:p-7 overflow-x-hidden">
        {isAdminRoute && !isAdmin ? (
          <section className="max-w-xl mx-auto mt-16 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Protected administration route</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">A signed-in SuperAdmin account is required to access this page.</p>
            {!isAuthenticated && <button onClick={() => navigate('/login')} className="mt-6 px-5 py-2.5 rounded-xl bg-teal-500 text-white text-xs font-black">Login</button>}
          </section>
        ) : (
          <WorkspaceContent
            activeWorkspace={visibleWorkspace}
            onSelectWorkspace={selectWorkspace}
            onOpenUpgradeModal={() => selectWorkspace('pricing')}
            sharedText={sharedText}
            setSharedText={setSharedText}
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            onAuthRequired={(mode) => navigate(mode === 'register' ? '/register' : '/login')}
            onSubscriptionActivated={(user) => {
              setCurrentUser(user);
              localStorage.setItem('gxa_user', JSON.stringify(user));
            }}
            triggerPremiumLock={triggerPremiumLock}
          />
        )}
      </main>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} requiredPlan={upgradeRequiredPlan} featureName={upgradeFeatureName} onGoToPricing={() => selectWorkspace('pricing')} />
    </div>
  );
}
