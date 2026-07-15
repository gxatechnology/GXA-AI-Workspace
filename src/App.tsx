import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WorkspaceContent from './components/WorkspaceContent';
import PropertiesPanel from './components/PropertiesPanel';
import LandingPage from './components/LandingPage';
import AdaptiveRibbon from './components/AdaptiveRibbon';
import UpgradeModal from './components/UpgradeModal';
import { WorkspaceId } from './types';
import { Sparkles, ArrowUpRight, Zap, Bell, CheckCircle, LogOut, Settings as SettingsIcon, Menu, X, PanelLeftClose, PanelLeft } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>({ id: 'guest', name: 'Guest User', email: 'guest@gxa-workspace.local', subscription: 'free', guest: true });
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('paraphrasing');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeRequiredPlan, setUpgradeRequiredPlan] = useState<'PRO' | 'PRO PLUS'>('PRO');
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('this Premium feature');
  const [sharedText, setSharedText] = useState('');
  const [initialLandingAuth, setInitialLandingAuth] = useState<'view' | 'login' | 'register'>('view');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const triggerPremiumLock = (featureName: string, requiredPlan: 'PRO' | 'PRO PLUS') => {
    setUpgradeRequiredPlan(requiredPlan);
    setUpgradeFeatureName(featureName);
    setIsUpgradeModalOpen(true);
  };

  // Check for persistent session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('gxa_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('gxa_user');
      }
    }
  }, []);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    if (!user.guest) {
      localStorage.setItem('gxa_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gxa_user'); // guest shouldn't persist across browser reloads
    }
    setActiveWorkspace(sessionStorage.getItem('gxa_pending_plan') ? 'pricing' : 'dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gxa_user');
  };

  // Human-readable titles mapping for header
  const workspaceTitles: Record<WorkspaceId, { title: string; subtitle: string }> = {
    'dashboard': { 
      title: 'Home / Dashboard', 
      subtitle: currentUser?.guest 
        ? 'Welcome to your Guest Session! Explore workspaces under free daily limits.'
        : `Welcome back, ${currentUser?.name || 'Partner'}! Choose a tool or upload a PDF to get started.` 
    },
    'projects': { title: 'My Projects', subtitle: 'Organize, draft, and manage your custom database files.' },
    'paraphrasing': { title: 'Paraphraser', subtitle: 'Rephrase your text cleanly across multiple writing models.' },
    'grammar': { title: 'Grammar Checker', subtitle: 'Identify punctuation, spelling, and grammar mistakes.' },
    'ai-detection': { title: 'AI Detector', subtitle: 'Identify potential machine-generated text segments.' },
    'ai-humanizer': { title: 'AI Humanizer', subtitle: 'Rewrite robotic text to sound conversational and organic.' },
    'ai-chat': { title: 'AI Writing Assistant', subtitle: 'Collaborate with your GXA writing co-pilot.' },
    'summarizer': { title: 'Summarizer', subtitle: 'Condense dense documents into bulleted reports.' },
    'translation': { title: 'Translator', subtitle: 'Translate your paragraphs between 30+ languages.' },
    'pdf-intelligence': { title: 'PDF Intelligence', subtitle: 'Have a conversation with your uploaded files.' },
    'all-tools': { title: 'All Tools', subtitle: 'Discover and launch creative assistants.' },
    'settings': { title: 'Settings', subtitle: 'Configure system defaults and API secrets.' },
    'ai-writing': { title: 'AI Writer', subtitle: 'Generate papers, emails, and articles.' },
    'ocr': { title: 'Neural OCR', subtitle: 'Extract editable text from images and scans.' },
    'documents': { title: 'Cloud Documents', subtitle: 'Access your secure storage folders.' },
    'prompts': { title: 'Prompts Studio', subtitle: 'Design custom prompt templates.' },
    'templates': { title: 'Document Templates', subtitle: 'Explore pre-written structures.' },
    'collaboration': { title: 'Team Space', subtitle: 'Collaborate with workspace team seats.' },
    'billing': { title: 'Billing', subtitle: 'Manage subscription limits and Stripe invoices.' },
    'administration': { title: 'SuperAdmin Panel', subtitle: 'Audit workspace logs and server metrics.' },
    'pricing': { title: 'Plans & Pricing', subtitle: 'Upgrade your workspace, customize team seats, or apply partner coupons.' },
    'images': { title: 'Neural Image Studio', subtitle: 'Generate, edit, and run OCR on images.' },
    'history': { title: 'Activity History', subtitle: 'Browse history timeline of your chats, documents, and assets.' },
    'favorites': { title: 'Favorites Hub', subtitle: 'Your starred documents, chats, projects, and templates.' },
    'pinned': { title: 'Pinned Items', subtitle: 'Quickly access files you have pinned for this workspace session.' },
    'shared': { title: 'Shared Space', subtitle: 'Documents, folders, and resources shared with your account.' },
    'trash': { title: 'Trash Bin', subtitle: 'Deleted items remain here for 30 days. Recover or delete permanently.' },
    'storage': { title: 'Storage & Health', subtitle: 'Manage active storage quotas, download exports, and check syncer logs.' },
    'collections': { title: 'Smart Collections', subtitle: 'Segment your work into Marketing, College, Research, Invoices, Clients, etc.' }
  };

  const headerMeta = workspaceTitles[activeWorkspace] || { title: 'AI Suite', subtitle: 'GXA AI Workspace' };

  // Render Landing Page if guest user is not logged in
  if (!currentUser) {
    return (
      <LandingPage 
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setInitialLandingAuth('view');
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        initialAuthMode={initialLandingAuth}
      />
    );
  }

  // Get user initials for profile avatar
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`${theme === 'dark' ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'} flex h-screen overflow-hidden font-sans transition duration-200`}>
      
      {/* Mobile Drawer Navigation Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden flex">
          <div className="relative h-full animate-slide-right">
            <Sidebar 
              activeWorkspace={activeWorkspace}
              onSelectWorkspace={(id) => {
                setActiveWorkspace(id);
                setIsMobileSidebarOpen(false);
              }}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onOpenUpgradeModal={() => {
                setActiveWorkspace('pricing');
                setIsMobileSidebarOpen(false);
              }}
              isGuest={currentUser?.guest}
            />
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 -right-12 p-2 rounded-xl bg-zinc-950 text-white hover:text-rose-400 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Desktop & Tablet Collapsible Left Sidebar */}
      <div className="hidden md:block shrink-0 h-screen transition-all duration-300">
        <Sidebar 
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenUpgradeModal={() => setActiveWorkspace('pricing')}
          collapsed={isSidebarCollapsed}
          isGuest={currentUser?.guest}
        />
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b flex items-center justify-between px-8 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-slate-200/50 dark:border-zinc-800/80 z-15 transition">
          {/* Header left */}
          <div className="flex items-center gap-3.5 text-left">
            {/* Mobile Hamburger Menu Button */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg md:hidden transition shrink-0"
              title="Open Navigation"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            {/* Desktop / Tablet Sidebar Collapse Trigger */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:block p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition shrink-0 animate-fade-in"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeft className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </button>

            <div>
              <h1 className="text-sm font-black font-display text-slate-900 dark:text-white leading-none">
                {headerMeta.title}
              </h1>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block mt-1">
                {headerMeta.subtitle}
              </span>
            </div>
          </div>

          {/* Header right buttons */}
          <div className="flex items-center gap-4">
            {currentUser?.guest ? (
              <>
                <button 
                  onClick={() => {
                    handleLogout();
                    setInitialLandingAuth('login');
                  }}
                  className="text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer"
                >
                  Login
                </button>
                <button 
                  onClick={() => {
                    handleLogout();
                    setInitialLandingAuth('register');
                  }}
                  className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Register
                </button>
                <button 
                  onClick={() => setActiveWorkspace('pricing')}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition tracking-wide uppercase font-mono ${
                    activeWorkspace === 'pricing' 
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  Pricing
                </button>
              </>
            ) : (
              <>
                {/* Quick alert notifications */}
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white transition rounded-lg">
                  <Bell className="h-4.5 w-4.5" />
                </button>

                {/* Premium Upgrade callout (Only visible if Free User) */}
                {currentUser?.subscription === 'free' ? (
                  <button 
                    onClick={() => setActiveWorkspace('pricing')}
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition duration-150 shadow-xs cursor-pointer"
                  >
                    Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button onClick={() => setActiveWorkspace('billing')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-[10px] font-extrabold uppercase tracking-wide border border-teal-200/40">
                    Manage Plan
                  </button>
                )}

                {/* Workspace switcher shortcut */}
                <button 
                  onClick={() => setActiveWorkspace('settings')}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition rounded-lg"
                  title="Workspace Switcher & Settings"
                >
                  <SettingsIcon className="h-4.5 w-4.5" />
                </button>

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800" />

                {/* Small Profile icon with sign-out option */}
                <div className="flex items-center gap-3">
                  <div 
                    className="h-8 w-8 rounded-full bg-teal-500/10 border border-teal-500/20 font-black text-teal-600 dark:text-teal-400 text-xs flex items-center justify-center cursor-default"
                    title={`${currentUser?.name} (${currentUser?.email})`}
                  >
                    {getInitials(currentUser?.name)}
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-lg transition"
                    title="Log Out Session"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Adaptive Ribbon Navigation Bar (QuillBot style dynamic collapsing tools) */}
        <AdaptiveRibbon 
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
        />

        {/* Core Workspace Hub Layout (Center Content + Right Properties Panel) */}
        <div className="flex-1 flex overflow-hidden">
          {/* CENTER: Workspace Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100/55 dark:bg-zinc-950 h-full scrollbar-thin">
            <WorkspaceContent 
              activeWorkspace={activeWorkspace}
              onSelectWorkspace={setActiveWorkspace}
              onOpenUpgradeModal={() => setActiveWorkspace('pricing')}
              sharedText={sharedText}
              setSharedText={setSharedText}
              currentUser={currentUser}
              onAuthRequired={(mode) => { sessionStorage.setItem('gxa_return_workspace', 'pricing'); handleLogout(); setInitialLandingAuth(mode); }}
              onSubscriptionActivated={(user) => { setCurrentUser(user); localStorage.setItem('gxa_user', JSON.stringify(user)); }}
              triggerPremiumLock={triggerPremiumLock}
            />
          </div>

          {/* RIGHT: Properties Panel (Desktop only) */}
          <PropertiesPanel 
            activeWorkspace={activeWorkspace}
            currentUser={currentUser}
            onSelectWorkspace={setActiveWorkspace}
            sharedText={sharedText}
            setSharedText={setSharedText}
            onOpenUpgradeModal={() => setActiveWorkspace('pricing')}
            triggerPremiumLock={triggerPremiumLock}
          />
        </div>

      </div>

      {/* Pricing Upgrade Modal */}
      <UpgradeModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        requiredPlan={upgradeRequiredPlan}
        featureName={upgradeFeatureName}
        onGoToPricing={() => setActiveWorkspace('pricing')}
      />

    </div>
  );
}
