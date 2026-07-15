import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  User as UserIcon, 
  Key, 
  ArrowLeftRight, 
  CheckSquare, 
  FileText, 
  Bot, 
  Folder
} from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess: (user: any) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  initialAuthMode?: 'view' | 'login' | 'register';
}

export default function LandingPage({ onLoginSuccess, theme, onToggleTheme, initialAuthMode }: LandingPageProps) {
  // Always default to 'login' or 'register' instead of 'view' (marketing)
  const initialMode = initialAuthMode === 'register' ? 'register' : 'login';
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password. Use tauqeerashraf250@gmail.com with password123 to log in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Choose another email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterAsGuest = () => {
    onLoginSuccess({
      id: 'guest',
      name: 'Guest User',
      email: 'guest@gxa-workspace.local',
      subscription: 'free',
      guest: true
    });
  };

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'} transition duration-200 flex flex-col justify-between text-left relative overflow-hidden`}>
      
      {/* Decorative gradient glowing spots */}
      <div className="absolute top-[-20%] left-[-10%] h-[50rem] w-[50rem] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[50rem] w-[50rem] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="h-16 shrink-0 border-b flex items-center justify-between px-6 md:px-12 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-slate-200/50 dark:border-zinc-800/80 z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center font-black text-white shadow-md">
            GX
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none">
              GXA AI Workspace
            </h1>
            <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mt-0.5">
              Secure authentication
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleEnterAsGuest}
            className="text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Go back to Guest Mode
          </button>
        </div>
      </header>

      {/* Main Auth Form Container */}
      <main className="flex-1 flex items-center justify-center py-12 px-6 z-10">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/85 dark:border-zinc-800 p-8 rounded-3xl shadow-xl space-y-6 text-left relative">
          
          <button 
            onClick={handleEnterAsGuest}
            className="absolute top-5 right-5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition"
          >
            Cancel
          </button>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {authMode === 'login' ? 'Welcome Back' : 'Create your Account'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              {authMode === 'login' 
                ? 'Sign in to access your secure professional documents and settings.' 
                : 'Get started and upgrade anytime to premium modes.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/50 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Security Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Processing...' : authMode === 'login' ? 'Secure Log In' : 'Sign Up Instantly'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs">
            <span className="text-slate-400 dark:text-zinc-500">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => { setError(''); setAuthMode(authMode === 'login' ? 'register' : 'login'); }}
              className="font-bold text-teal-500 hover:underline cursor-pointer"
            >
              {authMode === 'login' ? 'Sign up free' : 'Log in here'}
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-zinc-800/60 pt-4 text-[10px] text-slate-400 dark:text-zinc-500 leading-normal text-center space-y-1.5">
            <p>💡 <strong>Default Sandbox Login credentials:</strong></p>
            <p>Email: <span className="font-mono text-[9px] bg-slate-100 dark:bg-zinc-950 px-1 rounded select-all">tauqeerashraf250@gmail.com</span></p>
            <p>Password: <span className="font-mono text-[9px] bg-slate-100 dark:bg-zinc-950 px-1 rounded select-all">password123</span></p>
          </div>
        </div>
      </main>

      {/* Simplified Footer */}
      <footer className="h-12 border-t border-slate-200/50 dark:border-zinc-800/60 flex items-center justify-between px-6 md:px-12 bg-white/30 dark:bg-zinc-950/30 text-[10px] text-slate-400 dark:text-zinc-500">
        <span>© 2026 GXA Technologies. All Rights Reserved.</span>
        <div className="flex gap-4">
          <button onClick={onToggleTheme} className="hover:text-slate-600 dark:hover:text-white">
            Toggle Theme
          </button>
        </div>
      </footer>

    </div>
  );
}
