import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  BarChart3, 
  Zap, 
  Check, 
  Download, 
  Percent, 
  Award, 
  FileText, 
  Sparkles, 
  ShieldCheck,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { fetchSystemConfig, SystemConfig } from '../../utils/limits';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Processing';
  tokens: string;
}

export default function Billing() {
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponSuccess, setCouponSuccess] = useState<string>('');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'licensing'>('overview');

  useEffect(() => { fetchSystemConfig().then(setConfig).catch(() => setConfig(null)); }, []);

  const invoices: Invoice[] = [
    { id: 'INV-2026-001', date: '2026-07-01', amount: config?.pricing_pro_plus || 'Pending', status: 'Paid', tokens: '1,420,000' },
    { id: 'INV-2026-002', date: '2026-06-01', amount: config?.pricing_pro_plus || 'Pending', status: 'Paid', tokens: '1,120,000' },
    { id: 'INV-2026-003', date: '2026-05-01', amount: config?.pricing_pro_plus || 'Pending', status: 'Paid', tokens: '980,000' }
  ];

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'GXA90') {
      setCouponSuccess('Success! Code "GXA90" applied. Subscription reduced by 90% globally.');
    } else if (couponCode.trim() !== '') {
      setCouponSuccess('Invalid code. Try "GXA90" for standard partner testing discount.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Plan Card Left Column */}
      <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between h-[calc(100vh-12rem)]">
        <div className="space-y-5">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
              SaaS Subscription
            </span>
            <h3 className="text-lg font-black text-white mt-1">GXA Pro Plus</h3>
          </div>

          <div className="bg-black/60 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
            <span className="text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded tracking-wide font-mono absolute top-4 right-4">
              ACTIVE PLAN
            </span>
            <div className="text-3xl font-black text-white">{config?.pricing_pro_plus || 'Loading…'}<span className="text-xs font-bold text-zinc-500"> /mo</span></div>
            <p className="text-[10px] text-zinc-400 mt-2">Billed monthly across 50 team seats. Includes isolated HTTPS proxy layers on exclusive port 3000.</p>
          </div>

          {/* Metered usage indicators */}
          <div className="space-y-3">
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
              AI Token Consumption pool
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Core Gemini Tokens</span>
                <span className="font-mono text-white">1.42M / 5.0M</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '28.4%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Neural OCR Engine Runs</span>
                <span className="font-mono text-white">124 / 500</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '24.8%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code Fields */}
        <div className="border-t border-zinc-800/80 pt-4 space-y-3 shrink-0">
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Apply Partner Coupon</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. GXA90"
                className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button 
                onClick={handleApplyCoupon}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 rounded-lg transition"
              >
                Apply
              </button>
            </div>
          </div>
          {couponSuccess && (
            <span className="text-[10px] text-indigo-400 font-bold block mt-1 leading-snug">
              {couponSuccess}
            </span>
          )}
        </div>
      </div>

      {/* Usage Analytics & Invoices Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-12rem)] min-h-0">
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 shrink-0 flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Usage Metering
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'invoices' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" /> Invoice Records
          </button>
          <button
            onClick={() => setActiveTab('licensing')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'licensing' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" /> License Manager
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="flex-1 bg-black border border-zinc-800/80 rounded-xl p-5 flex flex-col min-h-0 justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
                Monthly Usage Trends (Tokens in thousands)
              </span>

              {/* Custom Bar Graphs styled purely inside Tailwind CSS */}
              <div className="h-44 flex items-end gap-3 border-b border-zinc-800 pb-2">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-indigo-500/10 hover:bg-indigo-500/30 transition rounded-t-md border-t border-indigo-500/40" style={{ height: '50px' }} />
                  <span className="text-[9px] font-mono text-zinc-500">May 2026</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-indigo-500/10 hover:bg-indigo-500/30 transition rounded-t-md border-t border-indigo-500/40" style={{ height: '90px' }} />
                  <span className="text-[9px] font-mono text-zinc-500">Jun 2026</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-indigo-600 rounded-t-md border-t border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]" style={{ height: '140px' }} />
                  <span className="text-[9px] font-mono text-white font-bold">Jul 2026 (Active)</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-zinc-900/30 border border-zinc-800/80 p-4 rounded-xl mt-4">
              <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">Enterprise Credit Active</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Your organization has active rollover partner grants. Next auto-billing draft is scheduled on August 1st.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto min-h-0">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono mb-4">
              Billing Ledger History
            </span>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-[9px] uppercase">
                  <th className="pb-2 text-left font-bold">Invoice ID</th>
                  <th className="pb-2 text-left font-bold">Billing Date</th>
                  <th className="pb-2 text-left font-bold">Token Volume</th>
                  <th className="pb-2 text-left font-bold">Amount Paid</th>
                  <th className="pb-2 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-mono font-bold text-white">{inv.id}</td>
                    <td className="py-3 text-zinc-400">{inv.date}</td>
                    <td className="py-3 text-zinc-400 font-mono">{inv.tokens}</td>
                    <td className="py-3 text-white font-bold">{inv.amount}</td>
                    <td className="py-3 text-right">
                      <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'licensing' && (
          <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto space-y-4">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
              Seat License Allocation
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Assigned Seats</span>
                <span className="text-xl font-black text-white mt-1 block">42 / 50</span>
              </div>
              <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Active Licenses</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">100% compliant</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
