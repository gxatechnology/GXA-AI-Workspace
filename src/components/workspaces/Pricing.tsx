import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Minus, 
  Sparkles, 
  Users, 
  Building2, 
  CreditCard, 
  ArrowRight, 
  Lock, 
  HelpCircle, 
  Percent, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  UserPlus 
} from 'lucide-react';
import { fetchSystemConfig } from '../../utils/limits';

// Pricing configuration and details
interface PlanFeature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  team: string | boolean;
  enterprise: string | boolean;
}

interface FeatureCategory {
  category: string;
  items: PlanFeature[];
}

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  
  // Dynamic Team Seats Calculator
  const [teamSeats, setTeamSeats] = useState(15);
  
  // Checkout Simulation State
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'success'>('details');
  const [paymentName, setPaymentName] = useState('Tauqeer Ashraf');
  const [paymentCard, setPaymentCard] = useState('4111 •••• •••• 1234');
  
  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Dynamic server-side prices & currencies configuration state
  const [proMonthly, setProMonthly] = useState(999);
  const [proYearly, setProYearly] = useState(599);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [couponsList, setCouponsList] = useState<Array<{ code: string; discount: string }>>([]);

  const parsePriceStr = (val: any, fallback: number): number => {
    if (!val) return fallback;
    const cleaned = String(val).replace(/[^0-9]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? fallback : num;
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await fetchSystemConfig();
        const pm = parsePriceStr(config.pricing_pro_monthly, 999);
        const py = parsePriceStr(config.pricing_pro_yearly, 599);
        setProMonthly(pm);
        setProYearly(py);
        
        let symbol = '₹';
        const cur = String(config.pricing_currency || 'INR').toUpperCase();
        if (cur === 'USD') symbol = '$';
        else if (cur === 'EUR') symbol = '€';
        else if (cur === 'GBP') symbol = '£';
        else if (cur === 'INR') symbol = '₹';
        else symbol = cur;
        
        setCurrencySymbol(symbol);
        setCurrencyCode(cur);
        if (config.coupons) {
          setCouponsList(config.coupons);
        }
      } catch (err) {
        console.error('Failed to load system config in pricing page:', err);
      }
    }
    loadConfig();
  }, []);

  // Base Prices (Monthly / Billed annually equivalent per month)
  const basePrices = {
    free: { monthly: 0, yearly: 0 },
    pro: { monthly: proMonthly, yearly: proYearly }, // ₹999/mo vs ₹599/mo (annual)
    team: { monthly: Math.round(proMonthly * 2.5), yearly: Math.round(proYearly * 2.5) }, // ₹2499/mo vs ₹1499/mo
    enterprise: { monthly: Math.round(proMonthly * 10), yearly: Math.round(proYearly * 10) } // ₹9999/mo vs ₹5999/mo
  };

  // Adjust team plan price dynamically based on seat adjustments above 5 seats
  // Base team plan covers 5 seats, each extra seat is discounted
  const calculateTeamPrice = (seats: number, period: 'monthly' | 'yearly') => {
    const basePrice = basePrices.team[period];
    const baseIncludedSeats = 5;
    if (seats <= baseIncludedSeats) return basePrice;
    const extraSeats = seats - baseIncludedSeats;
    const pricePerExtraSeat = period === 'monthly' ? Math.round(proMonthly * 0.25) : Math.round(proYearly * 0.25);
    return basePrice + (extraSeats * pricePerExtraSeat);
  };

  const getDiscountedPrice = (originalPrice: number) => {
    if (discountPercent === 0) return originalPrice;
    return Math.round(originalPrice * (1 - discountPercent / 100));
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    
    const inputCode = couponCode.trim().toUpperCase();
    if (!inputCode) return;

    if (inputCode === 'GXA90') {
      setDiscountPercent(90);
      setCouponSuccess('Partner coupon applied! 90% discount applied instantly across all paid plans.');
      return;
    } else if (inputCode === 'TEAMFAST') {
      setDiscountPercent(25);
      setCouponSuccess('Success! 25% early-adopter team discount applied.');
      return;
    }

    const match = couponsList.find(c => c.code.trim().toUpperCase() === inputCode);
    if (match) {
      const discountVal = parsePriceStr(match.discount, 0);
      if (discountVal > 0) {
        setDiscountPercent(discountVal);
        setCouponSuccess(`Success! "${match.code}" coupon applied: ${discountVal}% discount applied.`);
      } else {
        setCouponError('This coupon is currently inactive or invalid.');
      }
    } else {
      setCouponError('Invalid coupon code. Try entering "GXA90" or the promo code from the admin config.');
    }
  };

  const handleToggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Feature Comparison Data
  const featureCategories: FeatureCategory[] = [
    {
      category: 'Text & AI Capability',
      items: [
        { name: 'Monthly Word Limit', free: '5,000 words', pro: 'Unlimited', team: 'Unlimited Pool', enterprise: 'Unlimited Custom' },
        { name: 'Paraphrasing Modes', free: '3 Modes', pro: 'All 10+ Modes', team: 'All 10+ Modes', enterprise: 'All 10+ Custom Modes' },
        { name: 'Grammar checking engine', free: 'Standard', pro: 'Advanced Multi-Clause', team: 'Advanced Multi-Clause', enterprise: 'State-of-the-art Custom' },
        { name: 'AI Writing Assistant', free: 'Basic (Gemini Flash)', pro: 'Full Chat Copilot', team: 'Full Chat Copilot', enterprise: 'Fine-tuned Brand Voice' },
        { name: 'AI Humanizer Tone Tuning', free: false, pro: true, team: true, enterprise: true },
        { name: 'AI Detection Scan Volume', free: '3 runs / month', pro: 'Unlimited', team: 'Unlimited', enterprise: 'Unlimited API' }
      ]
    },
    {
      category: 'Documents & Intelligence',
      items: [
        { name: 'PDF Chat Interactive uploads', free: '2 uploads (5MB max)', pro: 'Unlimited (50MB max)', team: 'Unlimited (100MB max)', enterprise: 'Unlimited (500MB max)' },
        { name: 'Neural OCR Text Extraction', free: false, pro: '20 scans / month', team: '100 scans / month', enterprise: 'Unlimited / Custom' },
        { name: 'History Retention', free: '7 days', pro: 'Unlimited', team: 'Unlimited', enterprise: 'Unlimited + Backups' },
        { name: 'Export Formats', free: 'TXT, PDF', pro: 'TXT, PDF, DOCX, Markdown', team: 'All Formats + Batch Export', enterprise: 'Custom Integrations' }
      ]
    },
    {
      category: 'Team & Collaboration',
      items: [
        { name: 'User Seats Included', free: '1 user', pro: '1 user', team: '5 - 50 dynamic seats', enterprise: 'Unlimited' },
        { name: 'Shared Templates Library', free: false, pro: false, team: true, enterprise: true },
        { name: 'Document Collaborator Roles', free: false, pro: false, team: 'Viewer, Writer, Admin', enterprise: 'Custom RBAC Permissions' },
        { name: 'Central Admin Billing Panel', free: false, pro: false, team: true, enterprise: true }
      ]
    },
    {
      category: 'Security, Speed & Service',
      items: [
        { name: 'Server Allocation Mode', free: 'Standard Shared', pro: 'Priority GPU/CPU Pool', team: 'Ultra Priority GPU Pool', enterprise: 'Dedicated Private Nodes' },
        { name: 'SAML / SSO Login', free: false, pro: false, team: 'Google Workspace Single Sign-On', enterprise: 'SAML SSO (Okta, Azure, Ping)' },
        { name: 'Technical Support Level', free: 'Self-help Community', pro: 'Standard Email support', team: 'Priority 1-hour Support', enterprise: '24/7 Slack & Phone Support' },
        { name: 'Custom SLAs & Legal contracts', free: false, pro: false, team: false, enterprise: '99.99% Uptime + Enterprise SLA' }
      ]
    }
  ];

  const faqs = [
    {
      q: "Can I upgrade, downgrade, or cancel my subscription at any time?",
      a: "Absolutely! You can upgrade, downgrade, or cancel your subscription plan at any time through the Billing section of your Workspace. If you cancel, your premium benefits will remain active until the end of your current billing period."
    },
    {
      q: "How does the Team plan seat pricing work?",
      a: "Our Team plan includes 5 user seats with the base price. If your team grows, you can dynamically scale up to 50 seats. Each additional seat is billed at ₹250/month on the monthly plan, and is discounted to only ₹150/month on the yearly cycle."
    },
    {
      q: "What makes the Enterprise tier unique?",
      a: "The Enterprise plan offers dedicated computing resources (private server node allocations), tailored AI model fine-tuning with your company's brand voice, unlimited word limits, direct API endpoints, secure SAML/SSO integrations, and a dedicated GXA Technologies support team."
    },
    {
      q: "Are there any hidden fees or API charges?",
      a: "No hidden fees at all. All API token costs, storage, and server cycles are completely bundled into the plan's cost. You will never receive unexpected charges."
    },
    {
      q: "Do you offer discounts for educational institutions or non-profits?",
      a: "Yes! GXA Technologies offers special discount tiers for academic institutions and certified non-profits. Please contact our support team with your organization's details, or use early-access partner coupons if you have one."
    }
  ];

  const handleOpenCheckout = (planName: string, basePrice: number, features: string[]) => {
    setSelectedPlanForCheckout({
      name: planName,
      basePrice,
      features
    });
    setCheckoutStep('details');
  };

  const executeCheckoutSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('success');
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-16 animate-fade-in text-slate-800 dark:text-zinc-100 select-none text-left">
      
      {/* 1. Header & Dynamic Toggle */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto" id="pricing-header-section">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> FLEXIBLE ENTERPRISE PLANS
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-slate-900 dark:text-white">
          Simple, Transparent Plans Built for Scale
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Empower your developers, marketers, and technical writers with GXA AI Suite. 
          Save up to <span className="text-teal-600 dark:text-teal-400 font-bold">40% with our annual plans</span>.
        </p>

        {/* Monthly/Yearly Toggle Controls */}
        <div className="flex items-center gap-3 pt-4" id="billing-period-toggle">
          <span className={`text-xs font-bold transition ${billingPeriod === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Billed Monthly
          </span>
          <button 
            id="toggle-billing-period"
            onClick={() => setBillingPeriod(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 bg-teal-500 rounded-full p-1 transition duration-300 focus:outline-none relative shadow-inner"
            title="Toggle billing interval"
          >
            <div className={`w-4 h-4 bg-white rounded-full transition transform shadow-md ${billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold transition ${billingPeriod === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
              Billed Annually
            </span>
            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/20">
              Save 40%
            </span>
          </div>
        </div>
      </div>

      {/* Coupon Application Box */}
      <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4 rounded-xl shadow-xs" id="coupon-container">
        <form onSubmit={handleApplyCoupon} className="space-y-2">
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400"><Percent className="h-3.5 w-3.5" /> Have a Partner Coupon?</span>
            <span className="text-slate-500 font-mono">Try GXA90</span>
          </div>
          <div className="flex gap-2">
            <input 
              id="coupon-input-field"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter code (e.g. GXA90)"
              className="flex-1 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
            />
            <button 
              id="apply-coupon-btn"
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs px-4 rounded-lg transition"
            >
              Apply
            </button>
          </div>
        </form>
        {couponSuccess && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-2 text-center" id="coupon-success-message">
            {couponSuccess}
          </span>
        )}
        {couponError && (
          <span className="text-[10px] text-rose-500 font-bold block mt-2 text-center" id="coupon-error-message">
            {couponError}
          </span>
        )}
      </div>

      {/* 2. Plan Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch" id="pricing-tier-grid">
        
        {/* FREE PLAN CARD */}
        <div className="flex flex-col justify-between bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-3xl p-6 shadow-xs relative hover:border-slate-300 dark:hover:border-zinc-700 transition duration-200" id="plan-card-free">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">START FOR FREE</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">GXA Starter</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 min-h-[36px]">Basic grammar optimization, translations, and fast writing drafts.</p>
            </div>

            <div className="py-2">
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-slate-900 dark:text-white">{currencySymbol}0</span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 ml-1">/ month</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Free forever, no card required</p>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/60 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Starter Features</span>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">5,000 words paraphrasing / mo</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">Standard spelling/grammar checker</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">Basic Gemini translation tools</span>
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <Minus className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>No premium OCR scanner</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800/60">
            <button 
              id="btn-choose-free"
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold text-xs text-slate-700 dark:text-zinc-300 transition duration-150"
              onClick={() => alert('You are already on the Free Starter plan.')}
            >
              Current Active Plan
            </button>
          </div>
        </div>

        {/* PRO PLAN CARD - HIGHLIGHTED */}
        <div className="flex flex-col justify-between bg-white dark:bg-zinc-900 border-2 border-teal-500 dark:border-teal-500/80 rounded-3xl p-6 shadow-lg relative transform lg:-translate-y-2 hover:scale-[1.01] transition duration-200" id="plan-card-pro">
          <div className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
            Most Popular
          </div>
          
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest font-mono">INDIVIDUAL PRO</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1">
                GXA Pro <Sparkles className="h-4 w-4 text-teal-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 min-h-[36px]">Perfect for authors, technical creators, bloggers, and translators.</p>
            </div>

            <div className="py-2">
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-slate-900 dark:text-white font-display">
                  {currencySymbol}{getDiscountedPrice(basePrices.pro[billingPeriod])}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 ml-1">/ month</span>
              </div>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">
                {billingPeriod === 'yearly' 
                  ? `Billed ${currencySymbol}${getDiscountedPrice(basePrices.pro.yearly * 12)} annually` 
                  : 'Billed month-to-month'}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/60 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pro Level Perks</span>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300 font-bold">Unlimited words paraphrasing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">Advanced Multi-Clause grammar</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">High-Authenticity AI Humanizer</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300 font-bold">Unlimited interactive PDF Chat</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800/60">
            <button 
              id="btn-choose-pro"
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-black text-xs transition duration-150 shadow-md"
              onClick={() => handleOpenCheckout('GXA Pro Upgrade', getDiscountedPrice(basePrices.pro[billingPeriod]), [
                'Unlimited word paraphrasing capabilities',
                'Advanced Multi-Clause Style & Grammar Checking',
                'High-Authenticity Conversational Humanizer',
                'Unlimited PDF Chat File uploads',
                'Priority CPU/GPU processing servers'
              ])}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* TEAM PLAN CARD */}
        <div className="flex flex-col justify-between bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-3xl p-6 shadow-xs relative hover:border-slate-300 dark:hover:border-zinc-700 transition duration-200" id="plan-card-team">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest font-mono">FOR COLLABORATIVE TEAMS</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1">
                GXA Team <Users className="h-4 w-4 text-indigo-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 min-h-[36px]">Best for digital marketing bureaus, research desks, and SaaS startups.</p>
            </div>

            <div className="py-2">
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-slate-900 dark:text-white font-display">
                  {currencySymbol}{getDiscountedPrice(calculateTeamPrice(teamSeats, billingPeriod))}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 ml-1">/ month</span>
              </div>
              <p className="text-[10px] text-indigo-500 font-bold mt-1">
                Adjusted for <span className="font-mono">{teamSeats}</span> team seats
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/60 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Features</span>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300 font-bold">Includes {teamSeats} dedicated seats</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">Shared templates & custom Prompts Studio</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300 font-bold">Collaborative document edits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">Centralized organization billing</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800/60">
            <button 
              id="btn-choose-team"
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-black text-xs transition duration-150"
              onClick={() => handleOpenCheckout('GXA Team Workspace', getDiscountedPrice(calculateTeamPrice(teamSeats, billingPeriod)), [
                `Includes ${teamSeats} team seat licenses`,
                'Central Organization Administrator Panel',
                'Collaborative drafts folder & shared workspace',
                'Custom prompts library sharing',
                'Standard Google SSO integration'
              ])}
            >
              Get Started with Team
            </button>
          </div>
        </div>

        {/* ENTERPRISE PLAN CARD */}
        <div className="flex flex-col justify-between bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-3xl p-6 shadow-xs relative hover:border-slate-300 dark:hover:border-zinc-700 transition duration-200" id="plan-card-enterprise">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest font-mono">FOR LARGE ORGANIZATIONS</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1">
                GXA Enterprise <Building2 className="h-4 w-4 text-purple-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 min-h-[36px]">Isolated proxy servers, high performance pipelines, custom SLAs.</p>
            </div>

            <div className="py-2">
              <div className="flex items-baseline">
                <span className="text-4xl font-black text-slate-900 dark:text-white font-display">
                  {currencySymbol}{getDiscountedPrice(basePrices.enterprise[billingPeriod])}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 ml-1">/ month</span>
              </div>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">Starting price, billed annually</p>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800/60 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enterprise Shield</span>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300 font-bold">Unlimited words & API integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">Dedicated private proxy nodes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300">SAML SSO Integration (Okta/AD)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-zinc-300 font-bold">24/7 technical engineer SLA</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-zinc-800/60">
            <button 
              id="btn-choose-enterprise"
              className="w-full py-2.5 rounded-xl border border-purple-500 hover:bg-purple-500/10 dark:hover:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-extrabold text-xs transition duration-150"
              onClick={() => handleOpenCheckout('GXA Enterprise Elite Upgrade', getDiscountedPrice(basePrices.enterprise[billingPeriod]), [
                'Unlimited dedicated team licenses',
                'Private container network isolated proxy ports',
                'Advanced Okta/Active Directory SAML SSO',
                'Custom fine-tuned generative writing models',
                'Full platform REST API keys access',
                'Direct Slack access to GXA platform engineers'
              ])}
            >
              Contact Sales / Deploy
            </button>
          </div>
        </div>

      </div>

      {/* 3. Interactive Team Seat Slider */}
      <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-850 p-6 sm:p-8 rounded-2xl space-y-4" id="team-seat-calculator">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-4.5 w-4.5 text-teal-500" /> Dynamic Team Seat Calculator
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Drag the selector to find the exact monthly rate for your team size. Extra seats are discounted up to 40% annually.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-950 px-4 py-2 rounded-xl border border-slate-200/40 dark:border-zinc-800 text-center shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Team Size</span>
            <span className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono" id="calc-seats-indicator">{teamSeats} Seats</span>
          </div>
        </div>

        <div className="space-y-4">
          <input 
            id="team-seats-slider"
            type="range"
            min="5"
            max="100"
            step="5"
            value={teamSeats}
            onChange={(e) => setTeamSeats(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
            <span>5 SEATS (BASE)</span>
            <span>25 SEATS</span>
            <span>50 SEATS</span>
            <span>75 SEATS</span>
            <span>100 SEATS</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 text-left">
          <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200/40 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Billing Rate</span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono block mt-1">
              {currencySymbol}{getDiscountedPrice(calculateTeamPrice(teamSeats, 'monthly'))} <span className="text-xs font-bold text-slate-400">/ mo</span>
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200/40 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block flex items-center gap-1">
              Yearly Billing Rate <span className="bg-teal-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">Save 40%</span>
            </span>
            <span className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono block mt-1">
              {currencySymbol}{getDiscountedPrice(calculateTeamPrice(teamSeats, 'yearly'))} <span className="text-xs font-bold text-slate-400">/ mo</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Complete Feature Comparison Table */}
      <div className="space-y-6" id="comparison-table-section">
        <div className="text-center md:text-left space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Feature Comparison Matrix</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Review granular functional and server capability assignments across all tiers.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left" id="feature-matrix-table">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6 text-sm font-black text-slate-900 dark:text-white">Workspace Feature</th>
                  <th className="py-4 px-4 text-center">Free</th>
                  <th className="py-4 px-4 text-center">Pro</th>
                  <th className="py-4 px-4 text-center">Team</th>
                  <th className="py-4 px-4 text-center">Enterprise</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {featureCategories.map((cat, catIdx) => (
                  <React.Fragment key={catIdx}>
                    {/* Category Title Row */}
                    <tr className="bg-slate-100/60 dark:bg-zinc-950/40">
                      <td colSpan={5} className="py-3 px-6 font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-widest text-[10px]">
                        {cat.category}
                      </td>
                    </tr>
                    
                    {/* Specific Row Items */}
                    {cat.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="hover:bg-slate-50/55 dark:hover:bg-zinc-900/40 transition duration-150">
                        <td className="py-3.5 px-6 font-semibold text-slate-700 dark:text-zinc-300">
                          {item.name}
                        </td>
                        
                        {/* Free Col */}
                        <td className="py-3.5 px-4 text-center font-medium">
                          {typeof item.free === 'boolean' ? (
                            item.free ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <Minus className="h-4 w-4 text-slate-300 dark:text-zinc-700 mx-auto" />
                          ) : (
                            <span className="text-slate-500">{item.free}</span>
                          )}
                        </td>

                        {/* Pro Col */}
                        <td className="py-3.5 px-4 text-center font-medium bg-teal-500/5 dark:bg-teal-500/2">
                          {typeof item.pro === 'boolean' ? (
                            item.pro ? <Check className="h-4 w-4 text-emerald-500 mx-auto font-black" /> : <Minus className="h-4 w-4 text-slate-300 dark:text-zinc-700 mx-auto" />
                          ) : (
                            <span className="text-slate-800 dark:text-zinc-200 font-bold">{item.pro}</span>
                          )}
                        </td>

                        {/* Team Col */}
                        <td className="py-3.5 px-4 text-center font-medium">
                          {typeof item.team === 'boolean' ? (
                            item.team ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <Minus className="h-4 w-4 text-slate-300 dark:text-zinc-700 mx-auto" />
                          ) : (
                            <span className="text-slate-800 dark:text-zinc-200">{item.team}</span>
                          )}
                        </td>

                        {/* Enterprise Col */}
                        <td className="py-3.5 px-4 text-center font-medium">
                          {typeof item.enterprise === 'boolean' ? (
                            item.enterprise ? <Check className="h-4 w-4 text-purple-500 mx-auto font-black" /> : <Minus className="h-4 w-4 text-slate-300 dark:text-zinc-700 mx-auto" />
                          ) : (
                            <span className="text-purple-600 dark:text-purple-400 font-black">{item.enterprise}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. FAQs Accordion */}
      <div className="space-y-6 max-w-4xl mx-auto" id="faqs-accordion-section">
        <div className="text-center space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Everything you need to know about GXA AI workspace billing, license allocation, and security.</p>
        </div>

        <div className="space-y-3" id="faqs-accordion-list">
          {faqs.map((faq, i) => {
            const isOpen = expandedFaq === i;
            return (
              <div 
                key={i} 
                className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl overflow-hidden transition"
              >
                <button
                  id={`faq-btn-${i}`}
                  onClick={() => handleToggleFaq(i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-850 dark:text-zinc-100">{faq.q}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-zinc-800/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Checkout Simulation Drawer / Dialog */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs text-left" id="checkout-simulation-drawer">
          <div className="h-full bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 max-w-md w-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto relative animate-slide-in">
            
            {/* Close */}
            <button 
              id="checkout-close-btn"
              onClick={() => setSelectedPlanForCheckout(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-400 hover:text-white transition"
              title="Close checkout panel"
            >
              Close
            </button>

            {checkoutStep === 'details' ? (
              <form onSubmit={executeCheckoutSimulation} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider font-mono">GXA SECURE GATEWAY</span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Secure Workspace Checkout</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Initialize your cloud credentials and assign server-side priority tokens.</p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/50 dark:border-zinc-800 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{selectedPlanForCheckout.name}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{billingPeriod === 'yearly' ? 'Billed Annually (Save 40%)' : 'Monthly Contract'}</span>
                      </div>
                      <span className="text-base font-black text-teal-600 dark:text-teal-400 font-mono">{currencySymbol}{selectedPlanForCheckout.basePrice}/mo</span>
                    </div>

                    {/* Tax segment */}
                    <div className="border-t border-slate-200/40 dark:border-zinc-800/60 pt-2 flex justify-between text-[10px] text-slate-400">
                      <span>GST (18% Simulated)</span>
                      <span>{currencySymbol}0 (Included)</span>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white pt-1">
                      <span>Total Charge Today</span>
                      <span className="font-mono text-teal-600 dark:text-teal-400">
                        {currencySymbol}{billingPeriod === 'yearly' ? selectedPlanForCheckout.basePrice * 12 : selectedPlanForCheckout.basePrice}
                      </span>
                    </div>
                  </div>

                  {/* Features confirmation list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Provisioned Benefits</span>
                    <div className="space-y-1.5">
                      {selectedPlanForCheckout.features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                          <span className="text-slate-600 dark:text-zinc-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form input elements */}
                  <div className="space-y-3 pt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operator Name</label>
                      <input 
                        id="checkout-name-input"
                        type="text" 
                        required
                        value={paymentName}
                        onChange={(e) => setPaymentName(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Simulated Card Details</label>
                      <div className="relative">
                        <input 
                          id="checkout-card-input"
                          type="text" 
                          required
                          value={paymentCard}
                          onChange={(e) => setPaymentCard(e.target.value)}
                          className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-teal-500 font-mono"
                        />
                        <CreditCard className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-zinc-800">
                  <button 
                    id="checkout-submit-btn"
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black text-xs py-3 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-md"
                  >
                    <Lock className="h-3.5 w-3.5" /> Confirm Simulated Checkout
                  </button>
                  <span className="text-[9px] text-slate-400 text-center block leading-relaxed">
                    This is a secure development simulation. No real funds will be drafted. Powered by Stripe and GXA Technologies.
                  </span>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Workspace Upgraded!</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed px-4">
                    Congratulations! Your GXA AI Workspace has been elevated to the <strong>{selectedPlanForCheckout.name}</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/50 dark:border-zinc-800 text-left w-full space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Assigned Account:</span>
                    <span className="font-normal text-slate-500">{paymentName}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Provision Status:</span>
                    <span className="text-emerald-500 font-mono flex items-center gap-1">● COMPLIANT</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Dedicated Proxy:</span>
                    <span className="text-teal-500 font-mono">Port 3000 Active</span>
                  </div>
                </div>

                <button 
                  id="checkout-done-btn"
                  onClick={() => setSelectedPlanForCheckout(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-black text-xs py-2.5 rounded-xl transition"
                >
                  Return to Workspace
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
