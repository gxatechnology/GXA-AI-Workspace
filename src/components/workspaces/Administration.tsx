import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Activity, 
  Settings, 
  Loader2, 
  Check, 
  ToggleLeft, 
  ToggleRight, 
  Sliders, 
  FileText, 
  HelpCircle, 
  Sparkles, 
  AlertTriangle,
  Send,
  Plus
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Member' | 'Reviewer';
  status: 'Active' | 'Suspended';
}

interface FeatureFlag {
  key: string;
  name: string;
  desc: string;
  enabled: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  severity: 'INFO' | 'WARN' | 'CRIT';
}

interface SupportTicket {
  id: string;
  client: string;
  subject: string;
  urgency: 'High' | 'Medium';
  status: 'Open' | 'Resolved';
}

export default function Administration() {
  const [activeTab, setActiveTab] = useState<'users' | 'flags' | 'limits' | 'logs' | 'tickets'>('users');
  
  const [members, setMembers] = useState<TeamMember[]>([
    { id: 'm-1', name: 'John Doe', email: 'john@gxa.io', role: 'SuperAdmin', status: 'Active' },
    { id: 'm-2', name: 'Jane Smith', email: 'jane@gxa.io', role: 'Member', status: 'Active' },
    { id: 'm-3', name: 'David Chen', email: 'david@gxa.io', role: 'Reviewer', status: 'Active' }
  ]);

  const [flags, setFlags] = useState<FeatureFlag[]>([
    { key: 'gemini-pro', name: 'Paid Gemini 3.1 Pro Engine', desc: 'Allows access to deep reasoning and search grounded models.', enabled: true },
    { key: 'pdf-ocr', name: 'Local PDF OCR Scan Grid', desc: 'Uses advanced spatial positioning models inside PDF viewports.', enabled: true },
    { key: 'multi-lang', name: 'Bilingual Translation Exemption Layer', desc: 'Enables automatic source syntax detection on translate queries.', enabled: false }
  ]);

  const [logs] = useState<AuditLog[]>([
    { id: 'l-1', timestamp: '16:23:44', actor: 'John Doe', event: 'Modified feature flags config block', severity: 'WARN' },
    { id: 'l-2', timestamp: '15:10:12', actor: 'Jane Smith', event: 'Authorized OAuth credentials pool', severity: 'INFO' },
    { id: 'l-3', timestamp: '14:02:55', actor: 'System (Port 3000)', event: 'NGINX ingress reverse proxy remapped', severity: 'INFO' }
  ]);

  const [tickets, setTickets] = useState<SupportTicket[]>([
    { id: 't-1', client: 'Acme Corp', subject: 'Port 3000 container ingress routing mismatch', urgency: 'High', status: 'Open' },
    { id: 't-2', client: 'HedgeFund Ltd', subject: 'Invoices missing SLA partner credit exemptions', urgency: 'Medium', status: 'Open' }
  ]);

  // Dynamic SaaS Configuration Limits state
  const [config, setConfig] = useState<any>({
    paraphrases_limit: 10,
    paraphrase_word_limit: 125,
    ai_chats_limit: 5,
    pdf_uploads_limit: 3,
    ocr_pages_limit: 2,
    grammar_corrections_limit: 5,
    pricing_free: "",
    pricing_pro: "",
    pricing_pro_plus: "",
    pricing_team: "",
    pricing_enterprise: "",
    pricing_currency: "INR",
    feature_locks: {
      academic: true,
      creative: true,
      professional: true,
      custom: true
    },
    coupons: [{ code: "GXA40", discount: "40%" }],
    trial_days: 14,
    upgrade_message: "Join thousands of technical writers, marketers, and SaaS teams executing with GXA Technologies."
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setConfig(data.config);
        }
      })
      .catch(err => console.error("Error loading config:", err));
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlag = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const handleToggleStatus = (id: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, status: m.status === 'Active' ? 'Suspended' : 'Active' };
      }
      return m;
    }));
  };

  const handleResolveTicket = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Open' ? 'Resolved' : 'Open' } : t));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Category selector */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)]">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2.5 block font-mono mb-3">
          SuperAdmin Panel
        </span>

        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <div className="flex flex-col">
              <span>User Management</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Seat roles & active toggles</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('flags')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'flags' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <Settings className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Feature Flags</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Toggle systems features live</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('limits')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'limits' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <div className="flex flex-col">
              <span>SaaS Limit Settings</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Manage quotas, pricing, locks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Secure Audit Logs</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Track system activity events</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2.5 ${
              activeTab === 'tickets' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Support Tickets</span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5">Solve incoming SLA queries</span>
            </div>
          </button>
        </div>

        <div className="mt-auto border-t border-zinc-800/80 pt-4 px-2.5 space-y-3">
          <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold font-mono">
            <Shield className="h-4 w-4 shrink-0" />
            <span>ROOT_PRIVILEGE</span>
          </div>
          <p className="text-[9px] leading-relaxed text-zinc-500 font-mono">
            Active session: John Doe (Primary Owner). Operations log natively mapped via secure Express ports.
          </p>
        </div>
      </div>

      {/* Primary Admin Tab Canvas */}
      <div className="lg:col-span-9 flex flex-col gap-6 h-[calc(100vh-12rem)] min-h-0">
        
        {activeTab === 'limits' && (
          <form onSubmit={handleSaveConfig} className="flex-1 bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto min-h-0 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
                  SaaS Limit, Pricing & Feature Lock Settings
                </span>
                <span className="text-[11px] text-zinc-400">Configure real-time quotas, feature blocks, and payment plans. No hardcoding.</span>
              </div>
              <button 
                type="submit" 
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save SaaS Settings</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg animate-fade-in">
                ✓ SaaS configuration updated successfully! All workspace limits are now synchronized live.
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Quotas Section */}
              <div className="space-y-4 bg-zinc-900/25 border border-zinc-850 p-4 rounded-xl text-left">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" /> Client Quotas (Daily)
                </h4>
                
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 block">Max words per Paraphrase request</label>
                    <input 
                      type="number" 
                      value={config.paraphrase_word_limit}
                      onChange={(e) => setConfig({ ...config, paraphrase_word_limit: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 block">Max Paraphrases per day (Free limit)</label>
                    <input 
                      type="number" 
                      value={config.paraphrases_limit}
                      onChange={(e) => setConfig({ ...config, paraphrases_limit: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 block">Max AI Chats per day</label>
                    <input 
                      type="number" 
                      value={config.ai_chats_limit}
                      onChange={(e) => setConfig({ ...config, ai_chats_limit: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 block">Max PDF Uploads per day</label>
                    <input 
                      type="number" 
                      value={config.pdf_uploads_limit}
                      onChange={(e) => setConfig({ ...config, pdf_uploads_limit: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 block">Max OCR Pages per day</label>
                    <input 
                      type="number" 
                      value={config.ocr_pages_limit}
                      onChange={(e) => setConfig({ ...config, ocr_pages_limit: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 block">Max Grammar Corrections per day</label>
                    <input 
                      type="number" 
                      value={config.grammar_corrections_limit}
                      onChange={(e) => setConfig({ ...config, grammar_corrections_limit: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Pricing & Localization */}
                <div className="space-y-4 bg-zinc-900/25 border border-zinc-850 p-4 rounded-xl text-left">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Pricing Tiers & Localization
                  </h4>
                  
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 block">Free Price Monthly</label>
                        <input 
                          type="text" 
                          value={config.pricing_free}
                          onChange={(e) => setConfig({ ...config, pricing_free: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 block">Pro Price Monthly</label>
                        <input 
                          type="text" 
                          value={config.pricing_pro}
                          onChange={(e) => setConfig({ ...config, pricing_pro: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 block">Pro Plus Price Monthly</label>
                        <input 
                          type="text" 
                          value={config.pricing_pro_plus}
                          onChange={(e) => setConfig({ ...config, pricing_pro_plus: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400 block">Team Price Label</label>
                        <input 
                          type="text" 
                          value={config.pricing_team}
                          onChange={(e) => setConfig({ ...config, pricing_team: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block">Enterprise Price Label</label>
                      <input
                        type="text"
                        value={config.pricing_enterprise}
                        onChange={(e) => setConfig({ ...config, pricing_enterprise: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400 block">Trial Period (Days)</label>
                      <input 
                        type="number" 
                        value={config.trial_days}
                        onChange={(e) => setConfig({ ...config, trial_days: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Premium Feature Locks */}
                <div className="space-y-4 bg-zinc-900/25 border border-zinc-850 p-4 rounded-xl text-left">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Paraphraser Premium Lock Rules
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-850 cursor-pointer">
                      <span className="text-[11px] font-bold text-zinc-300">Lock Academic Mode</span>
                      <input 
                        type="checkbox" 
                        checked={config.feature_locks?.academic || false}
                        onChange={(e) => setConfig({
                          ...config,
                          feature_locks: { ...config.feature_locks, academic: e.target.checked }
                        })}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-850 cursor-pointer">
                      <span className="text-[11px] font-bold text-zinc-300">Lock Creative Mode</span>
                      <input 
                        type="checkbox" 
                        checked={config.feature_locks?.creative || false}
                        onChange={(e) => setConfig({
                          ...config,
                          feature_locks: { ...config.feature_locks, creative: e.target.checked }
                        })}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-850 cursor-pointer">
                      <span className="text-[11px] font-bold text-zinc-300">Lock Professional Mode</span>
                      <input 
                        type="checkbox" 
                        checked={config.feature_locks?.professional || false}
                        onChange={(e) => setConfig({
                          ...config,
                          feature_locks: { ...config.feature_locks, professional: e.target.checked }
                        })}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-zinc-950 rounded border border-zinc-850 cursor-pointer">
                      <span className="text-[11px] font-bold text-zinc-300">Lock Custom Tone Mode</span>
                      <input 
                        type="checkbox" 
                        checked={config.feature_locks?.custom || false}
                        onChange={(e) => setConfig({
                          ...config,
                          feature_locks: { ...config.feature_locks, custom: e.target.checked }
                        })}
                        className="accent-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Coupons Section */}
            <div className="space-y-4 bg-zinc-900/25 border border-zinc-850 p-4 rounded-xl text-left">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Discount Coupons Editor
              </h4>
              <div className="flex gap-4 items-center">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-zinc-400 block font-bold">Active Coupon Code</label>
                  <input 
                    type="text" 
                    value={config.coupons?.[0]?.code || ''}
                    onChange={(e) => {
                      const newCoupons = [...(config.coupons || [])];
                      if (newCoupons[0]) {
                        newCoupons[0].code = e.target.value.toUpperCase();
                      } else {
                        newCoupons.push({ code: e.target.value.toUpperCase(), discount: '30%' });
                      }
                      setConfig({ ...config, coupons: newCoupons });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-zinc-400 block font-bold">Discount Value (e.g. 40%)</label>
                  <input 
                    type="text" 
                    value={config.coupons?.[0]?.discount || ''}
                    onChange={(e) => {
                      const newCoupons = [...(config.coupons || [])];
                      if (newCoupons[0]) {
                        newCoupons[0].discount = e.target.value;
                      } else {
                        newCoupons.push({ code: 'GXACODE', discount: e.target.value });
                      }
                      setConfig({ ...config, coupons: newCoupons });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Upgrade banner editor */}
            <div className="space-y-2 bg-zinc-900/25 border border-zinc-850 p-4 rounded-xl text-left">
              <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Upgrade CTA Slogan / Prompt Message</label>
              <textarea 
                rows={2}
                value={config.upgrade_message}
                onChange={(e) => setConfig({ ...config, upgrade_message: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
              />
            </div>
          </form>
        )}

        {activeTab === 'users' && (
          <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto min-h-0">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
                Team Allocation & Licenses
              </span>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Invite Member
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-[9px] uppercase">
                  <th className="pb-2 font-bold">User Name</th>
                  <th className="pb-2 font-bold">Email Domain</th>
                  <th className="pb-2 font-bold">Permission Role</th>
                  <th className="pb-2 font-bold">Account Status</th>
                  <th className="pb-2 text-right font-bold">Action Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3.5 font-bold text-white">{m.name}</td>
                    <td className="py-3.5 text-zinc-400">{m.email}</td>
                    <td className="py-3.5 font-mono text-[10px] text-indigo-400">{m.role}</td>
                    <td className="py-3.5">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button 
                        onClick={() => handleToggleStatus(m.id)}
                        className="text-[10px] font-extrabold text-neutral-400 hover:text-white border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 px-2 py-1 rounded transition"
                      >
                        {m.status === 'Active' ? 'Suspend Seat' : 'Unsuspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'flags' && (
          <div className="flex-1 bg-black border border-zinc-800/80 rounded-xl p-5 overflow-y-auto min-h-0 space-y-4">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
              Beta System Feature Flags
            </span>

            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.key} className="flex justify-between items-center bg-zinc-900/20 border border-zinc-800 p-4 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs block">{f.name}</span>
                    <span className="text-[10px] text-zinc-400 block">{f.desc}</span>
                  </div>
                  <button onClick={() => handleToggleFlag(f.key)} className="text-zinc-500 hover:text-white transition">
                    {f.enabled ? (
                      <ToggleRight className="h-7 w-7 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-zinc-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto min-h-0 space-y-4">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
              Immutable Security Event Feed
            </span>

            <div className="space-y-2 font-mono text-[10px]">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 bg-black/40 border border-zinc-800/60 p-3 rounded-lg text-left">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${log.severity === 'WARN' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    {log.severity}
                  </span>
                  <div className="min-w-0">
                    <span className="text-zinc-500 block">{log.timestamp} • Actor: {log.actor}</span>
                    <span className="text-neutral-300 block mt-1">{log.event}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto min-h-0 space-y-4">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
              Urgent Support Queries
            </span>

            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="flex justify-between items-center bg-black/40 border border-zinc-800/60 p-4 rounded-xl text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{t.client}</span>
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${t.urgency === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {t.urgency} Priority
                      </span>
                    </div>
                    <span className="text-zinc-400 block">{t.subject}</span>
                  </div>

                  <button 
                    onClick={() => handleResolveTicket(t.id)}
                    className={`font-mono text-[9px] font-bold px-3 py-1.5 rounded transition ${
                      t.status === 'Resolved' 
                        ? 'bg-zinc-800 text-zinc-500' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {t.status === 'Resolved' ? 'RESOLVED' : 'RESOLVE SLA'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
