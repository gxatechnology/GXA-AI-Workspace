import React, { useState } from 'react';
import { 
  TrendingUp, 
  Percent, 
  BarChart4, 
  HelpCircle, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

export default function Growth() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'abtest' | 'swot'>('calculator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tool 1: LTV / CAC Modeler States
  const [arpu, setArpu] = useState(120); // Average Revenue Per User
  const [churnRate, setChurnRate] = useState(3.5); // Monthly Churn %
  const [cac, setCac] = useState(450); // Customer Acquisition Cost
  const [adSpend, setAdSpend] = useState(15000); // Monthly Ad spend

  // Calculated metrics
  const calculatedLtv = churnRate > 0 ? Math.round((arpu / (churnRate / 100)) * 100) / 100 : 0;
  const ltvToCacRatio = cac > 0 ? Math.round((calculatedLtv / cac) * 10) / 10 : 0;
  const paybackMonths = arpu > 0 ? Math.round((cac / arpu) * 10) / 10 : 0;
  const dynamicRunwayCustomers = Math.round(adSpend / cac);

  // Generate 12 months cashflow curve
  const projectionMonths = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // Cumulative active customers over months assuming 15% monthly compounding cohort additions
    const additions = dynamicRunwayCustomers;
    let customers = 0;
    let cumulativeRevenue = 0;
    let cumulativeCacCost = 0;

    for (let m = 1; m <= month; m++) {
      // customer churn calculations
      customers = (customers + additions) * (1 - churnRate / 100);
      cumulativeRevenue += customers * arpu;
      cumulativeCacCost += additions * cac;
    }

    const netProfit = cumulativeRevenue - cumulativeCacCost;
    return { month, netProfit, customers: Math.round(customers) };
  });

  // Calculate points for Cashflow SVG graph
  const maxCashflow = Math.max(...projectionMonths.map(p => Math.abs(p.netProfit)), 1000);
  const points = projectionMonths.map((p, i) => {
    const x = (i / 11) * 500;
    // Map net profit to graph coordinate: 150 is the zero line.
    // positive profit is mapped up (0 to 150), negative is mapped down (150 to 300)
    const y = 150 - (p.netProfit / maxCashflow) * 130;
    return { x, y };
  });

  const cashflowPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}, ${p.y}`).join(' ');

  // Tool 2: A/B Testing States
  const [visitorsA, setVisitorsA] = useState(12500);
  const [conversionsA, setConversionsA] = useState(620);
  const [visitorsB, setVisitorsB] = useState(12650);
  const [conversionsB, setConversionsB] = useState(780);

  // Conversion calculations
  const rateA = visitorsA > 0 ? (conversionsA / visitorsA) : 0;
  const rateB = visitorsB > 0 ? (conversionsB / visitorsB) : 0;
  const relativeImprovement = rateA > 0 ? Math.round(((rateB - rateA) / rateA) * 1000) / 10 : 0;

  // Statistical calculator
  const pA = rateA;
  const pB = rateB;
  const pooledP = (conversionsA + conversionsB) / (visitorsA + visitorsB);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / visitorsA + 1 / visitorsB));
  const zScore = se > 0 ? (pB - pA) / se : 0;
  
  // Quick normal distribution p-value approximation
  const pValue = Math.round((1 - (1 / (1 + Math.exp(-0.07056 * Math.pow(Math.abs(zScore), 3) - 1.5976 * Math.abs(zScore))))) * 10000) / 10000;
  const significancePercent = Math.round((1 - pValue) * 1000) / 10;
  const isSignificant = significancePercent >= 95;

  // Tool 3: Competitive SWOT States
  const [swotCompetitors, setSwotCompetitors] = useState('AcmeCorp, TechVanguard');
  const [swotIndustry, setSwotIndustry] = useState('B2B Enterprise Workflow Orchestration');
  const [swotReport, setSwotReport] = useState<any>({
    strengths: ['Fully consolidated technology, copywriter, and automation workspace', 'Native low-latency Gemini 3.5 APIs preconfigured', 'Lower total operational cost structure (40% consolidated savings)'],
    weaknesses: ['New brand entrant requiring primary trust validation', 'Complex platform capabilities demanding structured learning curves'],
    opportunities: ['Expanding global operational compliance demands', 'Mid-market SaaS companies seeking developer stack consolidation'],
    threats: ['Legacy single-point product systems pricing aggressively', 'Sudden cloud database pricing increases']
  });

  // SWOT Analyzer call
  const handleGenerateSWOT = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Perform a comprehensive SWOT analysis for my brand (GXA Technologies) against competitor brand(s): ${swotCompetitors} in the industry of ${swotIndustry}.
      
Return the analysis strictly as a JSON object with this exact structure:
{
  "strengths": ["Strengths list item 1", "Strengths list item 2", ...],
  "weaknesses": ["Weaknesses list item 1", ...],
  "opportunities": ["Opportunities list item 1", ...],
  "threats": ["Threats list item 1", ...]
}
Return ONLY valid JSON. No markdown tags.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an enterprise SaaS market analyst and positioning officer.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      setSwotReport(data);
      setSuccessMsg('Competitive SWOT metrics mapped successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('Could not compile competitive positioning quadrants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Growth Workspace</h2>
        <p className="text-neutral-400 text-sm mt-1">Calibrate Customer Lifetime Projections, calculate significance on A/B tests, and run competitive SWOT reports</p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button 
          onClick={() => { setActiveTab('calculator'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'calculator' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> LTV / CAC Modeler
        </button>
        <button 
          onClick={() => { setActiveTab('abtest'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'abtest' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Percent className="h-4 w-4" /> A/B Testing Simulator
        </button>
        <button 
          onClick={() => { setActiveTab('swot'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'swot' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <BarChart4 className="h-4 w-4" /> Competitor SWOT Engine
        </button>
      </div>

      {/* Message banners */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-400 text-xs animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-rose-400 text-xs animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tool 1: LTV / CAC Modeler */}
      {activeTab === 'calculator' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          {/* Inputs Panel */}
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-indigo-400" /> Unit Economics Tuning
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Average Monthly Revenue / Customer (ARPU)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-neutral-500">$</span>
                <input 
                  type="number"
                  value={arpu}
                  onChange={(e) => setArpu(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-zinc-800 bg-black py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Monthly Churn Percentage</label>
              <div className="relative">
                <span className="absolute right-3 top-2.5 text-xs text-neutral-500">%</span>
                <input 
                  type="number"
                  step="0.1"
                  value={churnRate}
                  onChange={(e) => setChurnRate(Math.max(0.1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-zinc-800 bg-black py-2 pl-3 pr-7 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Acquisition Cost / User (CAC)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-neutral-500">$</span>
                <input 
                  type="number"
                  value={cac}
                  onChange={(e) => setCac(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-zinc-800 bg-black py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Monthly Ad & Acquisition Budget</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-neutral-500">$</span>
                <input 
                  type="number"
                  value={adSpend}
                  onChange={(e) => setAdSpend(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-zinc-800 bg-black py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Graphical Projections & Key Indicators */}
          <div className="lg:col-span-8 space-y-6">
            {/* Key Indicators Row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Customer Lifetime Value (LTV)</span>
                <span className="text-xl font-extrabold text-white">${calculatedLtv.toLocaleString()}</span>
                <span className="text-[9px] text-zinc-500 block mt-1">Based on churn rate of {churnRate}%</span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">LTV : CAC Ratio</span>
                <span className={`text-xl font-extrabold ${ltvToCacRatio >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ltvToCacRatio}x
                </span>
                <span className="text-[9px] text-zinc-500 block mt-1">{ltvToCacRatio >= 3 ? 'Outstanding Unit Economics' : 'Review CAC strategy'}</span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Months to Payback CAC</span>
                <span className="text-xl font-extrabold text-white">{paybackMonths} months</span>
                <span className="text-[9px] text-zinc-500 block mt-1">Target payback: &lt; 12 months</span>
              </div>
            </div>

            {/* Compound cashflow Projection Line Chart */}
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-xl text-left">
              <h4 className="text-xs font-bold text-white mb-4 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-400" /> Projected 12-Month Net Cohort Return (Gross Profit - CAC)
              </h4>

              <div className="h-64 w-full relative">
                <svg viewBox="0 0 500 300" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="150" x2="500" y2="150" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="225" x2="500" y2="225" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Main Line */}
                  <path d={cashflowPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Nodes */}
                  {points.map((p, i) => (
                    <circle 
                      key={i} 
                      cx={p.x} 
                      cy={p.y} 
                      r="4" 
                      fill="#18181b" 
                      stroke={projectionMonths[i].netProfit >= 0 ? '#34d399' : '#f87171'} 
                      strokeWidth="2.5" 
                    >
                      <title>{`Month ${i+1}: $${projectionMonths[i].netProfit.toLocaleString()}`}</title>
                    </circle>
                  ))}
                </svg>
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-neutral-500 mt-4 font-mono px-2">
                <span>M01</span>
                <span>M03</span>
                <span>M05</span>
                <span>M07</span>
                <span>M09</span>
                <span>M11</span>
                <span>M12</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool 2: A/B Testing Simulator */}
      {activeTab === 'abtest' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          {/* Inputs Panel */}
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Variant Conversions</h3>

            <div className="space-y-3 pb-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Variant A (Baseline Control)</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500">VISITORS</span>
                  <input 
                    type="number"
                    value={visitorsA}
                    onChange={(e) => setVisitorsA(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded bg-black border border-zinc-800 p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500">CONVERSIONS</span>
                  <input 
                    type="number"
                    value={conversionsA}
                    onChange={(e) => setConversionsA(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded bg-black border border-zinc-800 p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">Variant B (Challenger Variant)</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500">VISITORS</span>
                  <input 
                    type="number"
                    value={visitorsB}
                    onChange={(e) => setVisitorsB(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded bg-black border border-zinc-800 p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500">CONVERSIONS</span>
                  <input 
                    type="number"
                    value={conversionsB}
                    onChange={(e) => setConversionsB(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded bg-black border border-zinc-800 p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* Stats Results */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Variant A Conversion</span>
                <span className="text-xl font-extrabold text-white">{(rateA * 100).toFixed(2)}%</span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Variant B Conversion</span>
                <span className="text-xl font-extrabold text-white">{(rateB * 100).toFixed(2)}%</span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Conversion Lift</span>
                <span className={`text-xl font-extrabold ${relativeImprovement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {relativeImprovement >= 0 ? '+' : ''}{relativeImprovement}%
                </span>
              </div>
            </div>

            {/* Significance Decision Gauge */}
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-6 shadow-xl text-left space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Percent className="h-4 w-4 text-indigo-400" /> Statistical Significance Evaluation
              </h4>

              <div className="flex flex-col sm:flex-row gap-6 items-center justify-between bg-black/40 border border-zinc-800 p-5 rounded-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase block">Significance Confidence</span>
                  <span className="text-4xl font-black text-white">{significancePercent}%</span>
                  <span className="text-[11px] text-zinc-400 block mt-1">p-value: {pValue}</span>
                </div>

                <div className="text-center sm:text-right space-y-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    isSignificant ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {isSignificant ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {isSignificant ? 'Significance Reached' : 'Insignificant Results'}
                  </span>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                    {isSignificant 
                      ? 'The conversion lift is highly robust. We recommend deploying Variant B globally.' 
                      : 'The performance variance is likely caused by minor sample noise. Run the test longer.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool 3: Competitive SWOT Engine */}
      {activeTab === 'swot' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">Competitor Focus</h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Competitor Brand Names</label>
              <input 
                type="text" 
                value={swotCompetitors}
                onChange={(e) => setSwotCompetitors(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Industry Sector</label>
              <input 
                type="text" 
                value={swotIndustry}
                onChange={(e) => setSwotIndustry(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              onClick={handleGenerateSWOT}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Mining Intelligence...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Synthesize SWOT Matrix
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Strengths */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-left shadow-lg">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Strengths (Internal Pros)
                </span>
                <ul className="mt-3 space-y-2 text-xs text-neutral-300 list-disc list-inside leading-relaxed">
                  {swotReport.strengths.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-left shadow-lg">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Weaknesses (Internal Cons)
                </span>
                <ul className="mt-3 space-y-2 text-xs text-neutral-300 list-disc list-inside leading-relaxed">
                  {swotReport.weaknesses.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-left shadow-lg">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                  <Zap className="h-4 w-4" /> Opportunities (External Pros)
                </span>
                <ul className="mt-3 space-y-2 text-xs text-neutral-300 list-disc list-inside leading-relaxed">
                  {swotReport.opportunities.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>

              {/* Threats */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-left shadow-lg">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <Info className="h-4 w-4" /> Threats (External Cons)
                </span>
                <ul className="mt-3 space-y-2 text-xs text-neutral-300 list-disc list-inside leading-relaxed">
                  {swotReport.threats.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
