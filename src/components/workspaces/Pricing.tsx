import React, { useEffect, useState } from 'react';
import { Building2, Check, Sparkles, Users, Zap } from 'lucide-react';
import { fetchSystemConfig, SystemConfig } from '../../utils/limits';

interface PlanCardProps {
  name: string;
  eyebrow: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  action: string;
  onAction: () => void;
  icon?: React.ReactNode;
}

function PlanCard({ name, eyebrow, price, features, highlighted, action, onAction, icon }: PlanCardProps) {
  return (
    <div className={`flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-3xl p-6 relative transition duration-200 ${
      highlighted
        ? 'border-2 border-teal-500 shadow-lg lg:-translate-y-2'
        : 'border border-slate-200/60 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700'
    }`}>
      {highlighted && (
        <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
          Most Popular
        </div>
      )}
      <div className="space-y-4">
        <div>
          <span className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest font-mono">{eyebrow}</span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">{name}{icon}</h3>
        </div>
        <div className="py-2">
          <span className="text-4xl font-black text-slate-900 dark:text-white font-display">{price}</span>
          {!/sales|pricing/i.test(price) && <span className="text-xs font-bold text-slate-400 ml-1">/month</span>}
        </div>
        <ul className="border-t border-slate-100 dark:border-zinc-800/60 pt-4 space-y-2 text-xs">
          {features.map(feature => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-slate-600 dark:text-zinc-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800/60">
        <button onClick={onAction} className={`w-full py-2.5 rounded-xl font-black text-xs transition ${
          highlighted ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md' : 'border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
        }`}>
          {action}
        </button>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSystemConfig()
      .then(setConfig)
      .catch(() => setError('Pricing is temporarily unavailable. Please try again shortly.'));
  }, []);

  if (!config) {
    return <div className="max-w-6xl mx-auto py-16 text-center text-sm text-slate-500">{error || 'Loading current plans…'}</div>;
  }

  const freeFeatures = [
    'Standard Paraphraser', 'Fluency Mode', 'Basic Grammar Checker', 'Limited AI Chat',
    'Limited AI Writer', 'Limited AI Humanizer', 'Limited AI Detector', 'Basic Summarizer',
    'Basic Translator', 'Daily usage limits', 'No payment required'
  ];
  const proFeatures = [
    'Everything in Free', 'Unlimited Standard usage', 'Better Grammar suggestions', 'PDF Chat',
    'Projects', 'History', 'Saved outputs', 'Cloud Sync', 'More daily generations', 'Faster processing'
  ];
  const proPlusFeatures = [
    'Everything in Pro', 'Humanize', 'Formal', 'Academic', 'Professional', 'Business', 'Creative',
    'Expand', 'Shorten', 'Custom', 'OCR', 'Plagiarism Checker', 'Citation Generator',
    'Unlimited AI Humanizer', 'Advanced AI Detector', 'Larger PDF uploads', 'Longer history'
  ];

  const startUpgrade = (plan: string) => window.alert(`${plan} checkout will continue in Billing.`);

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-16 animate-fade-in text-slate-800 dark:text-zinc-100 text-left">
      <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> Flexible GXA Plans
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-slate-900 dark:text-white">Simple, transparent monthly pricing</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">Choose the capabilities your workspace needs. Start free without a payment method.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5 items-stretch">
        <PlanCard name="Free" eyebrow="Start for free" price={config.pricing_free} features={freeFeatures} action="Current Active Plan" onAction={() => window.alert('You are already on the Free plan.')} />
        <PlanCard name="Pro" eyebrow="For individuals" price={config.pricing_pro} features={proFeatures} highlighted action="Upgrade to Pro" onAction={() => startUpgrade('Pro')} icon={<Zap className="h-4 w-4 text-teal-500" />} />
        <PlanCard name="Pro Plus" eyebrow="Premium modes" price={config.pricing_pro_plus} features={proPlusFeatures} action="Upgrade to Pro Plus" onAction={() => startUpgrade('Pro Plus')} icon={<Sparkles className="h-4 w-4 text-indigo-500" />} />
        <PlanCard name="Team" eyebrow="For teams" price={config.pricing_team} features={['Everything in Pro Plus', 'Shared workspace', 'Centralized administration', 'Team support']} action="Contact Sales" onAction={() => window.location.href = 'mailto:sales@gxatechnologies.com'} icon={<Users className="h-4 w-4 text-indigo-500" />} />
        <PlanCard name="Enterprise" eyebrow="For organizations" price={config.pricing_enterprise} features={['Custom workspace configuration', 'Enterprise security', 'Custom integrations', 'Dedicated support']} action="Contact Sales" onAction={() => window.location.href = 'mailto:sales@gxatechnologies.com'} icon={<Building2 className="h-4 w-4 text-purple-500" />} />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 p-6 text-center">
        <p className="text-sm font-bold text-slate-800 dark:text-white">All prices are configured centrally by GXA Technologies.</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{config.upgrade_message}</p>
      </div>
    </div>
  );
}
