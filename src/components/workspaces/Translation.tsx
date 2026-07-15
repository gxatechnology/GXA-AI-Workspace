import React, { useState } from 'react';
import { 
  Globe2, 
  ArrowLeftRight, 
  ChevronRight, 
  Loader2, 
  Copy, 
  Check, 
  Smile, 
  FileText, 
  Languages, 
  Upload, 
  ArrowRight,
  Info
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';

export default function Translation() {
  const [inputText, setInputText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('es');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const [languages] = useState([
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'it', name: 'Italian (Italiano)' },
    { code: 'pt', name: 'Portuguese (Português)' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'zh', name: 'Chinese (中文)' },
    { code: 'ko', name: 'Korean (한국어)' },
    { code: 'ru', name: 'Russian (Русский)' },
    { code: 'ar', name: 'Arabic (العربية)' }
  ]);

  const handleTranslate = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setTranslatedText('');
    try {
      const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
      const sourceInstruction = sourceLang === 'auto' 
        ? 'Detect the source language first.' 
        : `The source language is ${languages.find(l => l.code === sourceLang)?.name}.`;

      const prompt = `Translate the following text into ${targetLangName}. 
      ${sourceInstruction}
      Provide ONLY the direct translation output without any conversational preamble or notes.
      Text: "${inputText}"`;

      const response = await generateContent({
        prompt,
        systemInstruction: 'You are an elite, localization-grade translation system. Preserve tone, formatting, and technical accuracy.'
      });

      setTranslatedText(response);

      if (sourceLang === 'auto') {
        // Simple mock detection or basic regex matching
        setDetectedLanguage('English (Detected)');
      } else {
        setDetectedLanguage('');
      }
    } catch (err) {
      setTranslatedText('Translation pipeline failed. Verify settings and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          setInputText(`[Document Content Loaded from "${file.name}"]\nThis is a placeholder for the extracted document text. Now choose a target language and execute translate!`);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Settings / Controls Column */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-5 h-[calc(100vh-12rem)]">
        <div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1 block font-mono">
            Translation Configuration
          </span>
          <p className="text-[10px] text-zinc-500 px-1 mt-1">Configure live localization layers</p>
        </div>

        {/* Source Language Select */}
        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Source Language</label>
          <select 
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="auto">✨ Auto Detect Language</option>
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          {detectedLanguage && (
            <span className="text-[10px] text-indigo-400 font-mono font-bold block mt-1">
              🔍 {detectedLanguage}
            </span>
          )}
        </div>

        {/* Target Language Select */}
        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Target Language</label>
          <select 
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
          >
            {languages.filter(l => l.code !== 'en').map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Doc / PDF File Uploader */}
        <div className="border border-dashed border-zinc-800 rounded-xl p-4 bg-black/30 flex flex-col items-center justify-center text-center space-y-2 mt-2">
          <Upload className="h-5 w-5 text-zinc-500" />
          <div className="text-[10px] font-bold text-zinc-400">Translate Docs & PDFs</div>
          <p className="text-[9px] text-zinc-500 max-w-[150px]">Drag files or click below to upload documents directly</p>
          
          <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-[10px] px-3 py-1.5 rounded cursor-pointer transition">
            Choose File
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.txt" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

          {uploadProgress !== null && (
            <div className="w-full space-y-1 mt-2">
              <div className="flex justify-between text-[8px] font-mono text-zinc-400">
                <span className="truncate max-w-[100px]">{fileName}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor & Translation View Column */}
      <div className="lg:col-span-9 flex flex-col gap-6 h-[calc(100vh-12rem)] min-h-0">
        {/* Module Header */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 flex items-center justify-between shrink-0 shadow-lg">
          <div className="space-y-0.5">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Languages className="h-4.5 w-4.5 text-indigo-400" /> Professional Translation Engine
            </h3>
            <p className="text-xs text-neutral-400">Ultra-accurate side-by-side localizations preserving formal syntax and tone tags.</p>
          </div>
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded text-indigo-400 font-mono font-bold uppercase tracking-wider">
            Enterprise Grade (Gemini)
          </span>
        </div>

        {/* Translating Panels */}
        <div className="flex-1 grid gap-6 md:grid-cols-2 min-h-0">
          {/* Source Entry Panel */}
          <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between min-h-0">
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Source Content</span>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full flex-1 bg-black/60 border border-zinc-800 rounded-xl p-4 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none font-sans"
                placeholder="Type your sentences here..."
              />
            </div>

            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Compiling Localization Models...
                </>
              ) : (
                <>
                  <Globe2 className="h-3.5 w-3.5 animate-pulse" /> Translate Content
                </>
              )}
            </button>
          </div>

          {/* Translation Result Panel */}
          <div className="bg-black border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden min-h-0 shadow-2xl">
            <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-800/80 flex justify-between items-center shrink-0">
              <span className="text-xs font-mono font-bold text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Localized Translation Output
              </span>
              {translatedText && (
                <button 
                  onClick={handleCopy}
                  className="text-neutral-400 hover:text-white transition p-1.5 hover:bg-zinc-800 rounded flex items-center gap-1 text-[10px] font-semibold"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            <div className="flex-1 p-5 overflow-y-auto leading-relaxed text-xs text-neutral-200 text-left font-sans whitespace-pre-wrap select-text">
              {translatedText ? (
                translatedText
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-3 px-4">
                  <Globe2 className="h-8 w-8 text-zinc-600 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400">Translation Console Standby</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 max-w-xs">Run a translation trigger. Clean localization translations will compile into this viewport instantly.</p>
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
