import React, { useState } from 'react';
import { 
  Image, 
  Sparkles, 
  Download, 
  Trash, 
  Plus, 
  Search, 
  Crop, 
  Wand2, 
  Compass, 
  FileCode,
  Tag,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  aspect: string;
  date: string;
  size: string;
}

export default function ImagesView() {
  const [promptText, setPromptText] = useState('');
  const [activeStyle, setActiveStyle] = useState('Brutalist Swiss');
  const [activeAspect, setActiveAspect] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>([
    { 
      id: 'img-1', 
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60', 
      prompt: 'Minimalist vector representation of a secure server cloud operating system, teal accents, architectural typography grid', 
      style: 'Minimalist Vector', 
      aspect: '16:9', 
      date: '2026-07-13 16:40',
      size: '2.4 MB'
    },
    { 
      id: 'img-2', 
      url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=60', 
      prompt: 'Isometric glowing cube representation of scalable local database index schema, glassmorphism UI', 
      style: '3D Render', 
      aspect: '1:1', 
      date: '2026-07-11 11:15',
      size: '1.8 MB'
    },
    { 
      id: 'img-3', 
      url: 'https://images.unsplash.com/photo-1604871000636-074fa5117945?w=600&auto=format&fit=crop&q=60', 
      prompt: 'Bold Swiss graphic design layout, typography elements, high contrast grid, experimental geometric shape collage', 
      style: 'Brutalist Swiss', 
      aspect: '3:4', 
      date: '2026-07-09 14:02',
      size: '4.1 MB'
    }
  ]);
  const [activeImageId, setActiveImageId] = useState<string>('img-1');
  const [notification, setNotification] = useState<string | null>(null);

  const activeImage = gallery.find(img => img.id === activeImageId) || gallery[0];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    setIsGenerating(true);
    
    // Simulate high-fidelity AI render trigger
    setTimeout(() => {
      const newImg: GeneratedImage = {
        id: `img-${Date.now()}`,
        url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=60', // beautiful organic fluid render
        prompt: promptText,
        style: activeStyle,
        aspect: activeAspect,
        date: 'Just Now',
        size: '1.5 MB'
      };
      setGallery(prev => [newImg, ...prev]);
      setActiveImageId(newImg.id);
      setIsGenerating(false);
      setPromptText('');
      setNotification('Workspace Engine rendered asset successfully.');
      setTimeout(() => setNotification(null), 3000);
    }, 2000);
  };

  const handleDelete = (id: string) => {
    setGallery(prev => prev.filter(img => img.id !== id));
    if (activeImageId === id && gallery.length > 1) {
      setActiveImageId(gallery[0].id);
    }
  };

  const handleRemoveBackground = () => {
    setNotification('Neural mask applied: background separated successfully.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOcrExtract = () => {
    setNotification('OCR neural scanning completed. Text elements copied to clipboard.');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left font-sans h-full">
      
      {/* LEFT: Generator controls and Quick Assets Studio (Col span 4) */}
      <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between h-[calc(100vh-12rem)] overflow-y-auto scrollbar-none">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
            <Sparkles className="h-4.5 w-4.5 text-teal-500" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">AI Image Generator</span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Prompt Input</label>
              <textarea
                placeholder="Describe your creative vision (e.g. brutalist architecture, vector glassmorphism dashboard, glowing database schemas...)"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-teal-500 font-medium leading-relaxed resize-none"
              />
            </div>

            {/* Visual Style Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Visual Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Brutalist Swiss', '3D Render', 'Minimalist Vector', 'Neon Cyberpunk', 'Oil Painting', 'Architectural Sketch'].map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setActiveStyle(style)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black text-left transition ${
                      activeStyle === style
                        ? 'bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Aspect Ratio</label>
              <div className="flex gap-2">
                {['1:1', '16:9', '4:3', '3:4', '9:16'].map(aspect => (
                  <button
                    key={aspect}
                    type="button"
                    onClick={() => setActiveAspect(aspect)}
                    className={`flex-1 px-1.5 py-1.5 rounded-lg border text-[10px] font-black text-center transition ${
                      activeAspect === aspect
                        ? 'bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {aspect}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !promptText.trim()}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white text-xs font-black rounded-xl transition duration-150 shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGenerating ? 'Rendering Visual...' : 'Generate Asset'}</span>
            </button>
          </form>
        </div>

        {/* Saved assets mini gallery */}
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 mt-4 space-y-2 text-left">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Generated Library</span>
          <div className="grid grid-cols-3 gap-2">
            {gallery.map(img => (
              <button
                key={img.id}
                onClick={() => setActiveImageId(img.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                  activeImageId === img.id ? 'border-teal-500 scale-95 shadow-sm' : 'border-transparent'
                }`}
              >
                <img src={img.url} className="h-full w-full object-cover" alt="Thumb" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER: Main Active Asset Focus (Col span 8) */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin">
        
        {notification && (
          <div className="mb-4 bg-teal-500 text-white rounded-xl py-3 px-5 text-xs font-black flex items-center gap-2.5 shadow-lg shadow-teal-500/20 max-w-md animate-fade-in">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {activeImage ? (
          <div className="flex-1 flex flex-col justify-between">
            {/* Visual Canvas Panel */}
            <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden flex-1 min-h-[250px] sm:min-h-[350px]">
              <img 
                src={activeImage.url} 
                className="max-h-80 sm:max-h-96 object-contain rounded-xl shadow-md border border-slate-200/30 dark:border-zinc-800" 
                alt="Active Asset View"
                referrerPolicy="no-referrer"
              />
              
              {/* Aspect Badge floating */}
              <span className="absolute bottom-4 right-4 bg-zinc-950/80 backdrop-blur-xs text-white border border-zinc-800 text-[10px] font-mono font-bold py-1 px-2.5 rounded-lg">
                Aspect: {activeImage.aspect}
              </span>
            </div>

            {/* Asset Actions Rail */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-4 border-b border-slate-100 dark:border-zinc-850">
              <button 
                onClick={handleRemoveBackground}
                className="p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 hover:bg-teal-500/[0.04] text-slate-700 dark:text-zinc-300 text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                <Wand2 className="h-4 w-4 text-teal-500" />
                <span>Remove BG</span>
              </button>

              <button 
                onClick={handleOcrExtract}
                className="p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 hover:bg-teal-500/[0.04] text-slate-700 dark:text-zinc-300 text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                <Crop className="h-4 w-4 text-teal-500" />
                <span>Neural OCR</span>
              </button>

              <a 
                href={activeImage.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 hover:bg-teal-500/[0.04] text-slate-700 dark:text-zinc-300 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 text-center"
              >
                <ExternalLink className="h-4 w-4 text-teal-500" />
                <span>Source Link</span>
              </a>

              <button 
                onClick={() => handleDelete(activeImage.id)}
                className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 text-rose-600 hover:bg-rose-500 hover:text-white dark:text-rose-400 text-xs font-black rounded-xl transition flex items-center justify-center gap-2"
              >
                <Trash className="h-4 w-4" />
                <span>Delete Asset</span>
              </button>
            </div>

            {/* Asset Metadata details */}
            <div className="pt-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Asset Context Details</span>
              <div className="bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-850/60 text-xs font-bold text-slate-600 dark:text-zinc-400 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Generation Prompt:</span>
                  <span className="text-slate-800 dark:text-zinc-200 text-right max-w-sm font-semibold truncate leading-relaxed">
                    {activeImage.prompt}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-zinc-850">
                  <span>Render Style: {activeImage.style}</span>
                  <span>Disk Cache: {activeImage.size}</span>
                  <span>Rendered: {activeImage.date}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 text-center space-y-2">
            <Image className="h-10 w-10 text-slate-300 dark:text-zinc-700 mx-auto" />
            <h4 className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wide">No Active Graphic Assets</h4>
          </div>
        )}

      </div>

    </div>
  );
}
