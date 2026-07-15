import React, { useState } from 'react';
import { 
  Settings, 
  Shield, 
  CheckCircle2, 
  Database, 
  Activity, 
  Server, 
  Zap, 
  Key, 
  Mail, 
  CreditCard 
} from 'lucide-react';

export default function SettingsView() {
  const [integrations] = useState([
    { name: 'Gemini 3.5 API Proxy', status: 'Healthy', type: 'AI Gateway', latency: '42ms' },
    { name: 'Vite Development Middleware', status: 'Healthy', type: 'Asset Bundler', latency: '2ms' },
    { name: 'Express Server Container', status: 'Healthy', type: 'Backend Gateway', latency: '12ms' },
    { name: 'Enterprise Secret Vault', status: 'Healthy', type: 'Credential Vault', latency: '1ms' },
  ]);

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">System Settings</h2>
        <p className="text-neutral-400 text-sm mt-1">Configure profile details, audit licensing pools, and review service connection latency</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-indigo-400" /> Identity Profile
            </h3>
            
            <div className="flex items-center gap-4 border-b border-zinc-800/60 pb-5">
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 font-black text-white flex items-center justify-center text-lg shadow-lg">
                TA
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Tauqeer Ashraf</h4>
                <span className="text-xs text-neutral-500">Enterprise Operator</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" /> Contact Email
                </span>
                <span className="text-white font-mono font-medium">tauqeerashraf250@gmail.com</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-semibold flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-zinc-500" /> Billing Pool
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                  Enterprise Plus
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-semibold flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-zinc-500" /> API Access Keys
                </span>
                <span className="text-emerald-400 font-mono font-bold">Active Secrets</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health Check Integrations */}
        <div className="lg:col-span-8 rounded-xl bg-zinc-900/40 border border-zinc-800 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-indigo-400" /> Infrastructure Integrations status
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
              ● ALL SERVICES COMPILING
            </span>
          </div>

          <div className="space-y-4">
            {integrations.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-black/40 border border-zinc-800 p-4 rounded-lg gap-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                    {idx === 0 && <Zap className="h-4 w-4" />}
                    {idx === 1 && <Server className="h-4 w-4" />}
                    {idx === 2 && <Database className="h-4 w-4" />}
                    {idx === 3 && <Shield className="h-4 w-4" />}
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">{item.name}</h5>
                    <span className="text-[10px] text-zinc-500 font-mono">{item.type}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs">
                  <div className="text-left sm:text-right">
                    <span className="text-[9px] text-zinc-500 block">LATENCY</span>
                    <span className="text-white font-mono font-bold">{item.latency}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded font-bold">
                    <CheckCircle2 className="h-3 w-3" /> {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
