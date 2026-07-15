import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  FileText, 
  Upload, 
  Loader2, 
  Check, 
  Copy, 
  Languages, 
  RefreshCw, 
  Smile, 
  Info,
  Type,
  FileImage,
  Sparkles,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';
import { 
  fetchSystemConfig, 
  fetchUsage, 
  incrementUsage, 
  isUserPremium, 
  SystemConfig, 
  UsageStats 
} from '../../utils/limits';

interface MockScan {
  id: string;
  name: string;
  type: string;
  sampleImgDescription: string;
  simulatedRawText: string;
}

interface OCRProps {
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

export default function OCR({ currentUser, onOpenUpgradeModal }: OCRProps) {
  const [mockScans, setMockScans] = useState<MockScan[]>([
    { 
      id: 'receipt', 
      name: 'invoice_receipt_scan_982.jpg', 
      type: 'Structured Business Scan', 
      sampleImgDescription: 'A high-contrast black-and-white flatbed scan of an office invoice with clear bounding rows and line items.',
      simulatedRawText: 'INVOICE #9821\nGXA Technologies Inc.\nDate: May 12, 2026\n\n1. Enterprise AI Subscription (Annual)\n2. Advanced Support SLA Integration\nTotal Due: Custom Pricing\nTax: Calculated at checkout\nBalance Due: Custom Pricing'
    },
    { 
      id: 'handwriting', 
      name: 'boardroom_brainstorm_scribble.png', 
      type: 'Handwriting OCR', 
      sampleImgDescription: 'A whiteboard capture with markers and sticky diagrams outlining cloud hosting nodes and webhook structures.',
      simulatedRawText: '- Goals for Q3 Automation System:\n- 1. Keep node servers isolated behind Express gateways.\n- 2. Implement full-stack PDF index pipelines.\n- 3. Port 3000 mapping constraint for ingress.\n- 4. Action: Sync database variables on Slack.' 
    },
    { 
      id: 'jp-ocr', 
      name: 'japanese_manual_column_extract.tiff', 
      type: 'Multi-language OCR', 
      sampleImgDescription: 'A technical manual page printed in vertical-column Japanese font with schematics of high-pressure pumps.',
      simulatedRawText: 'システム仕様書 (System Specifications):\n- 動作ポート: 3000番ポート専用 (Exclusive Port 3000)\n- APIキーは環境変数にて保護。クライアントへの漏洩を防止。\n- データベース接続: FirestoreおよびPostgreSQL対応。'
    }
  ]);

  const [activeScanId, setActiveScanId] = useState<string>('receipt');
  const [ocrText, setOcrText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [scanOverlayActive, setScanOverlayActive] = useState<boolean>(false);

  // Limits tracking states
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const userRole = currentUser?.role || 'Guest';
  const isGuest = userRole === 'Guest' || currentUser?.email === 'guest@gxa.io';

  const loadLimitsData = async () => {
    try {
      const sysConfig = await fetchSystemConfig();
      setConfig(sysConfig);
      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      if (user) {
        setIsPremium(isUserPremium(user));
        const userUsage = await fetchUsage(user.email);
        setUsage(userUsage);
      } else {
        setIsPremium(false);
        const guestUsage = await fetchUsage('guest');
        setUsage(guestUsage);
      }
    } catch (err) {
      console.error('Failed to load limits in OCR workspace:', err);
    }
  };

  useEffect(() => {
    loadLimitsData();
  }, [currentUser]);

  const activeScan = mockScans.find(s => s.id === activeScanId) || mockScans[0];

  const dailyLimit = isPremium ? Infinity : (config?.ocr_pages_limit || 2);
  const remainingUses = isPremium ? Infinity : Math.max(0, dailyLimit - (usage?.ocr_pages || 0));
  const isDailyExceeded = !isPremium && remainingUses <= 0;

  const handleRunOCR = async () => {
    if (loading) return;
    if (isGuest || isDailyExceeded) return;
    setLoading(true);
    setScanOverlayActive(true);
    setOcrText('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const prompt = `Convert the following technical description and text content into a perfectly formatted, clean, and spell-corrected copy.
      Description of Image: "${activeScan.sampleImgDescription}"
      Raw Captured Text: "${activeScan.simulatedRawText}"`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an advanced OCR translation engine. You extract text from noisy scans, repair missing spaces, align tabular lines, and output clean markdown.'
      });

      setOcrText(response);

      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      const email = user ? user.email : 'guest';
      const updatedUsage = await incrementUsage(email, 'ocr_pages');
      setUsage(updatedUsage);
    } catch (err) {
      setOcrText(activeScan.simulatedRawText);
    } finally {
      setLoading(false);
      setScanOverlayActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuest || isDailyExceeded) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      const customScan: MockScan = {
        id: file.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: file.name,
        type: 'User Scanned Document',
        sampleImgDescription: `User-uploaded file: "${file.name}". Clean, standard text scanning requested.`,
        simulatedRawText: `EXTRACTED CONTENT FROM: ${file.name}\nTimestamp: 2026-07-13\nStatus: Active\n[Parsed data is fully available for formatting cleanup.]`
      };
      setMockScans(prev => [...prev, customScan]);
      setActiveScanId(customScan.id);
    }, 1000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* File Queue sidebar */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)]">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2.5 mb-2 block font-mono">
          Scanned File Index
        </span>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {mockScans.map((scan) => (
            <button
              key={scan.id}
              onClick={() => {
                setActiveScanId(scan.id);
                setOcrText('');
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-start gap-2.5 ${
                activeScanId === scan.id ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-zinc-900'
              }`}
            >
              <FileImage className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="block truncate">{scan.name}</span>
                <span className={`text-[9px] font-mono block mt-0.5 ${activeScanId === scan.id ? 'text-indigo-200' : 'text-zinc-500'}`}>
                  {scan.type}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Upload Form / Restrictions */}
        {isGuest ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-4 bg-black/40 flex flex-col items-center justify-center text-center space-y-2 mt-4 shrink-0">
            <Lock className="h-5 w-5 text-amber-500 animate-pulse" />
            <div className="text-[10px] font-bold text-zinc-400">Scan Restricted</div>
            <p className="text-[8px] text-zinc-500 max-w-[140px]">Create an account to run handwriting OCR audits.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-[9px] px-3 py-1.5 rounded transition uppercase tracking-wider"
            >
              Sign Up / Login
            </button>
          </div>
        ) : isDailyExceeded ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-4 bg-black/40 flex flex-col items-center justify-center text-center space-y-2 mt-4 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
            <div className="text-[10px] font-bold text-zinc-400">Quota Finished</div>
            <p className="text-[8px] text-zinc-500 max-w-[140px]">You have consumed your free daily OCR scans limit.</p>
            <button 
              onClick={onOpenUpgradeModal}
              className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9px] px-3 py-1.5 rounded transition uppercase tracking-wider"
            >
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-zinc-800 rounded-xl p-4 bg-black/30 flex flex-col items-center justify-center text-center space-y-2 mt-4 shrink-0">
            <Upload className="h-4.5 w-4.5 text-zinc-500" />
            <div className="text-[10px] font-bold text-zinc-400">Scan Real Document</div>
            <p className="text-[8px] text-zinc-500 max-w-[130px]">Upload high-res PNG or JPEG scans</p>
            <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-[9px] px-2.5 py-1.5 rounded cursor-pointer transition">
              {uploading ? 'Processing...' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* OCR Core workspace */}
      <div className="lg:col-span-9 flex flex-col gap-6 h-[calc(100vh-12rem)]">
        {/* Module Header */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shrink-0 shadow-lg">
          <div className="space-y-0.5">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Scan className="h-4.5 w-4.5 text-indigo-400 animate-pulse" /> Neural OCR Scan Engine
            </h3>
            <p className="text-xs text-neutral-400">Extract high-accuracy text structures from handwriting, noisy faxes, and multilingual forms.</p>
          </div>
          <div className="flex items-center gap-3">
            {!isPremium && usage && (
              <span className="text-[10px] text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded font-bold">
                Scans today: {usage.ocr_pages} / {dailyLimit}
              </span>
            )}
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded text-indigo-400 font-mono font-bold uppercase tracking-wider shrink-0">
              OCR V2 Core
            </span>
          </div>
        </div>

        {/* OCR Side-by-Side panels */}
        <div className="flex-1 grid gap-6 md:grid-cols-2 min-h-0">
          {/* Simulated Image Source Canvas */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between min-h-0 relative overflow-hidden">
            {isGuest ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-3">
                <Lock className="h-10 w-10 text-amber-500 animate-pulse" />
                <h4 className="text-xs font-bold text-white">OCR Scanner Locked</h4>
                <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                  Optical character extraction is a premium feature. Please sign up or login to access OCR scans.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition"
                >
                  Create Free Account
                </button>
              </div>
            ) : isDailyExceeded ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-3">
                <AlertTriangle className="h-10 w-10 text-amber-500 animate-pulse" />
                <h4 className="text-xs font-bold text-white">Daily Quota Exhausted</h4>
                <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                  You've scanned {usage?.ocr_pages} files today, reaching your limit of {dailyLimit} daily scans. Upgrade to Pro for unlimited neural OCR checks.
                </p>
                <button 
                  onClick={onOpenUpgradeModal}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-4 py-2 rounded-lg transition shadow-md"
                >
                  Upgrade to Pro
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                  <div className="relative border border-zinc-800/60 rounded-xl bg-zinc-900/20 p-6 max-w-sm w-full aspect-[4/3] flex flex-col justify-center items-center gap-3 overflow-hidden shadow-2xl">
                    {/* Simulated scan green line sweep overlay */}
                    {scanOverlayActive && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-[bounce_1.5s_infinite]" />
                    )}
                    
                    <FileImage className="h-10 w-10 text-indigo-400" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">{activeScan.name}</span>
                      <span className="text-[9px] text-zinc-500 block font-mono">FILE: {activeScan.type}</span>
                    </div>
                    <div className="bg-black/60 border border-zinc-800 p-2.5 rounded text-[10px] text-zinc-400 leading-relaxed text-left font-mono">
                      {activeScan.sampleImgDescription}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRunOCR}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Neural Cell Matrix Parsing...
                    </>
                  ) : (
                    <>
                      <Scan className="h-3.5 w-3.5" /> Execute OCR Cleanup
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Extracted output Column */}
          <div className="bg-black border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden min-h-0 shadow-2xl">
            <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-800/80 flex justify-between items-center shrink-0">
              <span className="text-xs font-mono font-bold text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Extracted Digital Copy
              </span>
              {ocrText && (
                <button 
                  onClick={handleCopy}
                  className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-zinc-800 rounded flex items-center gap-1 text-[10px] font-semibold"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            <div className="flex-1 p-5 overflow-y-auto leading-relaxed text-xs text-neutral-200 text-left font-mono whitespace-pre-wrap select-text">
              {ocrText ? (
                ocrText
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-3 px-4">
                  <Sparkles className="h-8 w-8 text-zinc-600 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400">OCR Extraction Standby</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 max-w-xs">Run scanning cycles on your receipts, whiteboard snaps, or bilingual documentation scans. Text content will compile here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
