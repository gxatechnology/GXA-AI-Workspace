import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Shield, Zap, Star } from 'lucide-react';
import { fetchSystemConfig, SystemConfig } from '../utils/limits';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  benefitExplanation: string;
  onUpgrade: () => void;
  onContinueFree: () => void;
}

export default function PremiumModal({
  isOpen,
  onClose,
  featureName,
  benefitExplanation,
  onUpgrade,
  onContinueFree
}: PremiumModalProps) {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSystemConfig().then(setConfig);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const freePrice = config?.pricing_free;
  const proPrice = config?.pricing_pro;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-left animate-fade-in select-none">
      <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-800 dark:text-zinc-100">
        
        {/* Glow decorative vector */}
        <div className="absolute -top-32 -right-32 h-64 w-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition duration-150"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-[10px] font-black text-teal-600 dark:text-teal-400 border border-teal-500/20 tracking-wider uppercase">
              <Sparkles className="h-3 w-3" /> Premium Feature Locked
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              Unlock {featureName} Mode
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {benefitExplanation || "Upgrade your workspace seat to access deeper AI-powered precision capabilities."}
            </p>
          </div>

          {/* Plan Comparison Grid */}
          <div className="grid gap-6 md:grid-cols-2 mt-4">
            {/* Free Plan Card */}
            <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-850 p-5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Free Basic / Guest</span>
                <div className="flex items-baseline">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                    {freePrice || 'Loading…'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ forever</span>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-850">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                    <Check className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Basic Paraphrasing only</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                    <Check className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Basic Grammar checks</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                    <Check className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Strict daily usage quotas</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onContinueFree}
                className="w-full mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-xs py-2 rounded-xl transition"
              >
                Continue with Free
              </button>
            </div>

            {/* Pro Plan Card */}
            <div className="bg-teal-500/5 dark:bg-teal-950/10 border-2 border-teal-500 p-5 rounded-2xl flex flex-col justify-between relative shadow-md">
              <div className="absolute top-3 right-4 px-2 py-0.5 bg-teal-500 text-white text-[8px] font-black rounded uppercase tracking-wider">Recommended</div>
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-widest block font-mono">GXA PRO SUITE</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                    {proPrice}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ mo</span>
                </div>
                <p className="text-[9px] text-teal-600 font-bold">Backend-configured monthly pricing</p>
                <div className="space-y-2 pt-2 border-t border-teal-500/20">
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                    <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span className="font-semibold">Unlimited Premium Modes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                    <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span>Full Neural PDF Intel & OCR</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                    <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                    <span>Unlimited chat & documents</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onUpgrade}
                className="w-full mt-6 bg-teal-500 hover:bg-teal-600 text-white font-black text-xs py-2 rounded-xl transition shadow-md"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-400 dark:text-zinc-500 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
            {config?.upgrade_message || "Join thousands of technical writers, marketers, and SaaS teams executing with GXA Technologies."}
          </div>

        </div>
      </div>
    </div>
  );
}
