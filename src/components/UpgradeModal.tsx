import React, { useEffect, useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { fetchSystemConfig, SystemConfig } from '../utils/limits';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan?: 'PRO' | 'PRO PLUS';
  featureName?: string;
  onGoToPricing?: () => void;
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  requiredPlan = 'PRO', 
  featureName = 'this Premium feature',
  onGoToPricing
}: UpgradeModalProps) {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    if (isOpen) fetchSystemConfig().then(setConfig).catch(() => setConfig(null));
  }, [isOpen]);

  if (!isOpen) return null;

  const benefits = [
    'Unlimited words paraphrasing in all 10+ modes',
    'Advanced multi-clause Grammar Checking & styles',
    'AI Detector & high-authenticity AI Humanizer',
    'Unlimited interactive PDF Chat & summaries',
    'Full translation support across 30+ global languages',
    'Enterprise-grade team project collaboration',
    'Ultra priority CPU/GPU server allocation (No waiting)',
    '24/7 Premium technology engineer support'
  ];

  const handleUpgradeClick = () => {
    onClose();
    if (onGoToPricing) {
      onGoToPricing();
    }
  };

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
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/20 tracking-wider uppercase">
              <Sparkles className="h-3 w-3 animate-pulse" /> {requiredPlan} Feature Locked
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              Unlock {featureName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              This feature requires a <span className="font-bold text-teal-600 dark:text-teal-400">{requiredPlan}</span> plan. Upgrade your session to experience professional multi-clause styling, deep context, and unlimited word capacity.
            </p>
          </div>

          {/* Two Columns benefits + Actions */}
          <div className="grid gap-6 md:grid-cols-2 pt-2">
            
            {/* List of features */}
            <div className="space-y-3 pr-2 border-r border-slate-100 dark:border-zinc-800/60 text-left">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Included Premium Features</h4>
              <div className="space-y-2">
                {benefits.slice(0, 5).map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Check className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt to Pricing Card */}
            <div className="bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-850 p-6 rounded-2xl flex flex-col justify-between items-center text-center">
              <div className="space-y-2 w-full">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">GXA WORKSPACE</span>
                <p className="text-sm font-bold text-slate-950 dark:text-white leading-snug">
                  Experience professional AI without word restrictions
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Plans start from <span className="font-extrabold text-teal-500">{config?.pricing_pro || 'current backend pricing'}/month</span>
                </p>
              </div>

              <div className="w-full space-y-3 pt-4">
                <button 
                  onClick={handleUpgradeClick}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black text-xs py-2.5 rounded-xl transition duration-150 shadow-md cursor-pointer"
                >
                  Upgrade Now
                </button>
                <span className="text-[9px] text-slate-400 dark:text-zinc-500 block">30-day money-back guarantee. Secure Stripe payment.</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
