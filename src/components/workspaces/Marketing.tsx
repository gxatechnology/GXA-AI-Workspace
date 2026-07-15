import React, { useState } from 'react';
import { 
  Megaphone, 
  Mail, 
  Share2, 
  Search, 
  Copy, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<'ads' | 'email' | 'social' | 'seo'>('ads');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // General Input States
  const [productName, setProductName] = useState('GXA SaaS Platform');
  const [productDesc, setProductDesc] = useState('An enterprise platform delivering technology systems, marketing copywriters, automation pipelines, and analytics calculators.');
  const [targetAudience, setTargetAudience] = useState('Enterprise CTOs, VPs of Marketing, and Operations leaders');
  const [brandTone, setBrandTone] = useState('professional');

  // Ad Copywriter States
  const [adPlatform, setAdPlatform] = useState<'google' | 'facebook' | 'linkedin'>('google');
  const [adCopies, setAdCopies] = useState<any>({
    headline: 'Unlock 10x Operational Velocity',
    subHeadline: 'Scale Systems with GXA Automation Engine',
    body: 'Automate high-converting marketing campaigns, write secure production source code, and simulate business metrics modelers inside one integrated suite.',
    cta: 'Get Enterprise Access'
  });

  // Email Campaign States
  const [emailCampaignType, setEmailCampaignType] = useState('cold-outreach');
  const [emailSubject, setEmailSubject] = useState('Consolidate your SaaS Stack & Save 40% in Q3');
  const [emailBody, setEmailBody] = useState(`Hi {{Contact_First_Name}},

Running an enterprise requires aligning various departments. Typically, your team is splitting focus between custom code deployment, email campaign creators, scraping automations, and LTV metrics tracking.

GXA Technologies has introduced an integrated workspace that handles all 4. 

Let me know if you would like a brief 10-minute workflow optimization call.

Best,
The GXA Team`);
  const [emailSubjectScore, setEmailSubjectScore] = useState({ rating: 88, spamRisk: 'Low', openRatePrediction: 'Extremely High (38-42%)' });

  // Social Media Strategist States
  const [socialCalendar, setSocialCalendar] = useState<any[]>([
    { day: 'Mon', topic: 'Technology: Code reviews with AI', channel: 'LinkedIn', draft: 'Traditional static code reviews delay production releases. Our Technology workspace enables team-wide code reviews, explanation, and visual schema mappings instantly. #SaaS #Productivity' },
    { day: 'Wed', topic: 'Automation: No-code triggers', channel: 'Twitter/X', draft: 'Manual data pipelines are a workflow bottleneck. Build, inspect, and deploy trigger-to-action server hooks automatically. #NoCode #Workflows' },
    { day: 'Fri', topic: 'Growth: Unit Economics formulas', channel: 'LinkedIn', draft: 'LTV/CAC ratio is the ultimate SaaS North Star. Use our interactive projection matrices to map cohort payback times. #Growth #Venture' }
  ]);
  const [selectedSocialIndex, setSelectedSocialIndex] = useState(0);

  // SEO Optimizer States
  const [seoKeyword, setSeoKeyword] = useState('enterprise workflow automation tutorial');
  const [seoOutline, setSeoOutline] = useState<string[]>(
    ['Introduction to Enterprise Operational Waste', 'Defining Workflow Automation vs. Robotic Process Automation', 'Building Visual Trigger-Action Trees', 'Calculating Payback and Efficiency metrics', 'Summary: Consolidating with Integrated SaaS workspaces']
  );

  // Helper copy function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg('Copied to clipboard!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Generate Ad copies
  const handleGenerateAds = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Generate highly engaging and compliant ad copies for ${adPlatform} advertising.
Product: ${productName}
Description: ${productDesc}
Target Audience: ${targetAudience}
Tone: ${brandTone}

Please provide the output strictly as a JSON object with this exact structure:
{
  "headline": "A short high-impact headline",
  "subHeadline": "A supporting hook",
  "body": "The main description/body text optimized for maximum CTR",
  "cta": "The perfect call to action verb phrase"
}
Return ONLY valid JSON. No markdown backticks or wrappers.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an elite Google and Meta conversion copywriting strategist at GXA Technologies.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      setAdCopies(data);
      setSuccessMsg('Ad copywriting generated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error formulating marketing copies.');
    } finally {
      setLoading(false);
    }
  };

  // Generate Email Campaign
  const handleGenerateEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Draft a high-converting ${emailCampaignType} campaign email.
Product: ${productName}
Description: ${productDesc}
Target Audience: ${targetAudience}
Tone: ${brandTone}

Please provide the output strictly as a JSON object with this exact structure:
{
  "subject": "A highly clickable subject line",
  "body": "The complete email body with clear CTAs, paragraphs, and custom variable tags like {{Contact_First_Name}}",
  "score": {
    "rating": 85,
    "spamRisk": "Low",
    "openRatePrediction": "Extremely High (40-45%)"
  }
}
Return ONLY valid JSON. No markdown tags.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an enterprise email delivery and high-CTR marketing architect.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      if (data.subject) setEmailSubject(data.subject);
      if (data.body) setEmailBody(data.body);
      if (data.score) setEmailSubjectScore(data.score);
      setSuccessMsg('Email draft created & calibrated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('Failed to design campaign email.');
    } finally {
      setLoading(false);
    }
  };

  // Generate Social Planner
  const handleGenerateSocial = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Plan a 3-day weekly social media content planner calendar based on:
Product: ${productName}
Details: ${productDesc}
Tone: ${brandTone}

Format the output strictly as a JSON array of 3 objects, where each object has:
{
  "day": "Mon, Wed, or Fri",
  "topic": "The theme",
  "channel": "LinkedIn, Instagram, or Twitter",
  "draft": "The full social post text with relevant hashtags"
}
Return ONLY valid JSON array.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are a growth marketing and social strategist.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      setSocialCalendar(data);
      setSelectedSocialIndex(0);
      setSuccessMsg('Social planner compiled!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('Could not build content calendar.');
    } finally {
      setLoading(false);
    }
  };

  // Generate SEO Optimizer Brief
  const handleGenerateSEO = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Create a structured SEO Brief and H1/H2 section outlines.
Keyword: ${seoKeyword}
Targeting: ${targetAudience}

Format the output strictly as a JSON array of 5 strings, each being a high-relevance article section header (H2).
Return ONLY valid JSON array.`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an SEO Strategist analyzing search Intent.',
        responseMimeType: 'application/json'
      });

      const data = JSON.parse(response);
      setSeoOutline(data);
      setSuccessMsg('SEO content brief mapped!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError('Could not analyze search trends.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Marketing Workspace</h2>
        <p className="text-neutral-400 text-sm mt-1">Generate multi-channel ad copy, email outreach flows, SEO articles, and content schedules</p>
      </div>

      {/* Shared Product context inputs */}
      <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400" /> Active Campaign Brief Context
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Product Name</label>
            <input 
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Audience</label>
            <input 
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Brand Voice / Tone</label>
            <select
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="professional">Professional / Decisive</option>
              <option value="playful">Witty / Energetic</option>
              <option value="bold">Bold / Visionary</option>
              <option value="technical">Technical / Methodical</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Offer / Description</label>
            <input 
              type="text"
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-zinc-800">
        <button 
          onClick={() => { setActiveTab('ads'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'ads' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Megaphone className="h-4 w-4" /> Ad Copywriter
        </button>
        <button 
          onClick={() => { setActiveTab('email'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'email' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Mail className="h-4 w-4" /> Email Designer
        </button>
        <button 
          onClick={() => { setActiveTab('social'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'social' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Share2 className="h-4 w-4" /> Social Planner
        </button>
        <button 
          onClick={() => { setActiveTab('seo'); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition duration-200 ${
            activeTab === 'seo' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Search className="h-4 w-4" /> SEO Optimizer
        </button>
      </div>

      {/* Success / Error Messages */}
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

      {/* Ad Copywriter Tab */}
      {activeTab === 'ads' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">Platform Settings</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Select Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {(['google', 'facebook', 'linkedin'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAdPlatform(p)}
                    className={`rounded py-1.5 text-xs font-bold capitalize transition ${
                      adPlatform === p 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-zinc-800 text-neutral-400 hover:bg-zinc-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleGenerateAds}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Aligning Demographics...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Formulate Copies
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-400" /> High-Fidelity {adPlatform === 'google' ? 'Search Engine Result' : 'Mobile Feed Card'} Mockup
              </h4>

              {/* Google Search Mockup */}
              {adPlatform === 'google' && (
                <div className="bg-white rounded-lg p-5 border border-zinc-200 text-black max-w-xl mx-auto space-y-1 font-sans text-left">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <span className="font-bold">Ad</span>
                    <span>•</span>
                    <span>https://www.gxa.ai</span>
                  </div>
                  <h4 className="text-xl font-medium text-blue-800 hover:underline cursor-pointer">
                    {adCopies.headline || 'Unlock 10x Operational Velocity'}
                  </h4>
                  <p className="text-sm text-green-700 font-medium">
                    {adCopies.subHeadline || 'Scale Systems with GXA Automation Engine'}
                  </p>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {adCopies.body || 'Automate high-converting marketing campaigns, write secure production source code, and simulate business metrics modelers inside one integrated suite.'}
                  </p>
                </div>
              )}

              {/* Facebook Card Mockup */}
              {adPlatform === 'facebook' && (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 text-white max-w-md mx-auto overflow-hidden font-sans text-left">
                  <div className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">GXA</div>
                    <div>
                      <h4 className="text-xs font-bold text-white">GXA Technologies</h4>
                      <span className="text-[10px] text-zinc-400">Sponsored</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 text-xs leading-relaxed text-zinc-200">
                    {adCopies.body}
                  </div>
                  <div className="aspect-[1.91/1] bg-gradient-to-br from-indigo-900 to-zinc-950 flex flex-col justify-end p-4 border-y border-zinc-800">
                    <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wide">gxa.ai</span>
                    <h5 className="text-sm font-bold mt-1 text-white">{adCopies.headline}</h5>
                    <p className="text-xs text-zinc-400 truncate">{adCopies.subHeadline}</p>
                  </div>
                  <div className="bg-zinc-950 px-4 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Technology & Growth</span>
                    <button className="bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-bold px-4 py-1.5 rounded transition">
                      {adCopies.cta || 'Learn More'}
                    </button>
                  </div>
                </div>
              )}

              {/* LinkedIn Mockup */}
              {adPlatform === 'linkedin' && (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 text-white max-w-md mx-auto overflow-hidden font-sans text-left">
                  <div className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">GXA</div>
                    <div>
                      <h4 className="text-xs font-bold text-white">GXA Technologies</h4>
                      <span className="text-[9px] text-zinc-400">Enterprise AI • Promoting</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 text-xs leading-relaxed text-zinc-300">
                    {adCopies.body}
                  </div>
                  <div className="aspect-video bg-gradient-to-tr from-zinc-900 via-neutral-900 to-indigo-950 flex items-center justify-center p-6 border-y border-zinc-800">
                    <div className="text-center space-y-2">
                      <h5 className="text-lg font-bold text-white">{adCopies.headline}</h5>
                      <p className="text-xs text-neutral-400">{adCopies.subHeadline}</p>
                    </div>
                  </div>
                  <div className="p-4 flex justify-between items-center bg-zinc-950">
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-white truncate">{adCopies.headline}</h5>
                      <p className="text-[10px] text-zinc-400">gxa.ai</p>
                    </div>
                    <button className="border border-indigo-400 text-indigo-400 hover:bg-indigo-400/10 text-xs font-semibold px-4 py-1 rounded-full transition">
                      {adCopies.cta || 'Register'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Designer Tab */}
      {activeTab === 'email' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">Email Configuration</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Campaign Target</label>
              <select
                value={emailCampaignType}
                onChange={(e) => setEmailCampaignType(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="cold-outreach">Cold Corporate Outreach</option>
                <option value="newsletter">SaaS Newsletter</option>
                <option value="re-engagement">Inactive Member Re-engagement</option>
                <option value="product-launch">Major Feature Release</option>
              </select>
            </div>

            <button 
              onClick={handleGenerateEmail}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting email...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Synthesize Campaign Email
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* Subject Line Grader */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Open Rate Probability</span>
                <span className="text-sm font-extrabold text-emerald-400">{emailSubjectScore.openRatePrediction}</span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Subject Line Rating</span>
                <span className="text-2xl font-black text-indigo-400">{emailSubjectScore.rating}/100</span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Spam Risk Index</span>
                <span className="text-sm font-extrabold text-amber-400">{emailSubjectScore.spamRisk}</span>
              </div>
            </div>

            {/* Email UI Template Mockup */}
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 space-y-1.5 text-left">
                <div className="flex text-xs font-semibold gap-2 items-center text-neutral-400">
                  <span className="font-mono text-zinc-500">Subject:</span>
                  <span className="text-white text-xs tracking-tight">{emailSubject}</span>
                </div>
              </div>
              <div className="bg-black/40 p-6 text-sm text-neutral-300 font-sans leading-relaxed whitespace-pre-wrap min-h-[250px] text-left">
                {emailBody}
              </div>
              <div className="bg-zinc-950/80 px-4 py-3 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-[10px] text-neutral-500 font-mono">Variables: contact.firstName</span>
                <button 
                  onClick={() => copyToClipboard(`Subject: ${emailSubject}\n\n${emailBody}`)} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold px-4 py-1.5 rounded transition flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Email Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Planner Tab */}
      {activeTab === 'social' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">Campaign Calendar</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">Plan and write cohesive copy scheduled for key channels throughout the week.</p>
            <button 
              onClick={handleGenerateSocial}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Scheduling...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Generate New Week Drafts
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* Calendar cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {socialCalendar.map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedSocialIndex(idx)}
                  className={`p-4 border rounded-xl cursor-pointer transition flex flex-col justify-between h-32 ${
                    selectedSocialIndex === idx 
                      ? 'bg-indigo-500/10 border-indigo-500 shadow-indigo-500/5' 
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-indigo-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {card.day}
                    </span>
                    <span className="text-[10px] bg-zinc-800 text-neutral-400 px-2 py-0.5 rounded font-semibold">{card.channel}</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white mt-2 truncate">{card.topic}</h5>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">{card.draft}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected day preview */}
            {socialCalendar[selectedSocialIndex] && (
              <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 shadow-xl text-left animate-fade-in">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Interactive Editor • {socialCalendar[selectedSocialIndex].channel} Draft</h4>
                    <span className="text-xs text-indigo-400 font-semibold">{socialCalendar[selectedSocialIndex].topic}</span>
                  </div>
                  <span className="bg-zinc-800/80 text-white font-mono text-[10px] px-3 py-1 rounded">
                    Scheduled for {socialCalendar[selectedSocialIndex].day}
                  </span>
                </div>
                <textarea 
                  value={socialCalendar[selectedSocialIndex].draft}
                  onChange={(e) => {
                    const updated = [...socialCalendar];
                    updated[selectedSocialIndex].draft = e.target.value;
                    setSocialCalendar(updated);
                  }}
                  rows={6}
                  className="w-full bg-black/60 rounded-lg border border-zinc-800 p-4 text-xs font-sans text-neutral-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => copyToClipboard(socialCalendar[selectedSocialIndex].draft)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white px-4 py-2 rounded transition flex items-center gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEO Optimizer Tab */}
      {activeTab === 'seo' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-fade-in">
          <div className="lg:col-span-4 rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <h3 className="text-md font-bold text-white">SEO Settings</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Target Focus Keyword</label>
              <input 
                type="text"
                value={seoKeyword}
                onChange={(e) => setSeoKeyword(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              onClick={handleGenerateSEO}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white py-2.5 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Mining SERP...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Cluster Keyword & Outline
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-5 shadow-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" /> Curated Blog Post Outline & SEO Checklist
              </h4>
              
              <div className="space-y-3">
                {seoOutline.map((header, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-black/40 border border-zinc-800/80 p-3 rounded-lg text-left">
                    <span className="h-6 w-6 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center justify-center font-mono">
                      H2.{idx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-neutral-200">{header}</span>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg text-left space-y-2.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Recommended Length Parameters</span>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-neutral-500 block text-[9px]">WORD COUNT</span>
                    <span className="text-white font-bold">1,800 - 2,200 words</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">DENSITY INDEX</span>
                    <span className="text-white font-bold">1.2% - 1.6%</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px]">READABILITY RANGE</span>
                    <span className="text-white font-bold">65+ (Flesch-Kincaid)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
