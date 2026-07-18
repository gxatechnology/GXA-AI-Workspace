import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Barcode, BookOpen, Check, Copy, Crop, Download,
  FileImage, FolderOpen, Image as ImageIcon, Images, Languages, Layers3, Library,
  Loader2, Lock, Palette, Plus, RotateCw, Save, ScanLine, Search, Sparkles,
  Trash2, Upload, WandSparkles, X,
} from 'lucide-react';
import {
  MEDIA_ASPECT_RATIOS, MEDIA_EXPORT_FORMATS, MEDIA_QUALITIES, MEDIA_SECTIONS,
  MEDIA_STYLES, MEDIA_TOOLS, type MediaPlan, type MediaSection,
  type MediaToolDefinition,
} from '../../../shared/mediaRegistry';
import type { WorkspaceId } from '../../types';
import { canonicalPlanKey } from '../../utils/pricing';

type StudioTab = 'Home' | MediaSection | 'Library' | 'Projects';

interface MediaConfig {
  tools: MediaToolDefinition[];
  aspectRatios: readonly string[];
  qualities: readonly string[];
  styles: readonly string[];
  exportFormats: readonly string[];
  currentPlan: MediaPlan;
  limits: { generation: number; vision: number; character: number; uploadSizeMb: number; batch: number; assets: number };
  usage: { generation: number; vision: number };
  capabilities: { aiProvider: boolean; svg: boolean; localEditing: boolean; barcode: 'browser' };
}

interface MediaAsset {
  id: string;
  title: string;
  toolId: string;
  image: string;
  mimeType: string;
  projectId?: string | null;
  source: string;
  folder?: string;
  tags?: string[];
  version: number;
  parentId?: string | null;
  createdAt: string;
}

const fallbackConfig: MediaConfig = {
  tools: MEDIA_TOOLS,
  aspectRatios: MEDIA_ASPECT_RATIOS,
  qualities: MEDIA_QUALITIES,
  styles: MEDIA_STYLES,
  exportFormats: MEDIA_EXPORT_FORMATS,
  currentPlan: 'free',
  limits: { generation: 3, vision: 5, character: 4000, uploadSizeMb: 10, batch: 4, assets: 100 },
  usage: { generation: 0, vision: 0 },
  capabilities: { aiProvider: false, svg: true, localEditing: true, barcode: 'browser' },
};

const PLAN_RANK: Record<MediaPlan, number> = { free: 0, pro: 1, pro_plus: 2 };
const authHeaders = (user?: any): Record<string, string> => user?.sessionToken && !user.guest ? { Authorization: `Bearer ${user.sessionToken}` } : {};
const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]!));

const sectionIcon = (section: StudioTab) => {
  if (section === 'Create') return Sparkles;
  if (section === 'Edit') return WandSparkles;
  if (section === 'OCR') return ScanLine;
  if (section === 'Document Vision') return BookOpen;
  if (section === 'Marketing') return Images;
  if (section === 'Brand') return Palette;
  if (section === 'Library') return Library;
  if (section === 'Projects') return FolderOpen;
  return ImageIcon;
};

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('The image could not be read.'));
  reader.readAsDataURL(file);
});

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('The image could not be decoded.'));
  image.src = source;
});

async function rasterize(source: string, mimeType = 'image/png', quality = 0.94) {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is not supported in this browser.');
  if (mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0);
  return canvas.toDataURL(mimeType, quality);
}

function downloadData(data: string | Blob, fileName: string) {
  const href = typeof data === 'string' ? data : URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  if (typeof data !== 'string') URL.revokeObjectURL(href);
}

export default function MediaStudio({
  currentUser, onOpenUpgradeModal, onSelectWorkspace, setSharedText, initialText = '', initialSection = 'Home',
}: {
  currentUser?: any;
  onOpenUpgradeModal: () => void;
  onSelectWorkspace: (id: WorkspaceId) => void;
  setSharedText: (text: string) => void;
  initialText?: string;
  initialSection?: StudioTab;
}) {
  if (currentUser?.guest) currentUser = undefined;
  const authenticated = Boolean(currentUser);
  const auth = useMemo(() => authHeaders(currentUser), [currentUser]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<MediaConfig>(() => ({
    ...fallbackConfig,
    currentPlan: ['pro_plus', 'team', 'enterprise'].includes(canonicalPlanKey(currentUser?.subscription) || '')
      ? 'pro_plus' : canonicalPlanKey(currentUser?.subscription) === 'pro' ? 'pro' : 'free',
  }));
  const [tab, setTab] = useState<StudioTab>(initialSection);
  const [toolId, setToolId] = useState(initialSection === 'OCR' ? 'ocr-printed' : 'image-generator');
  const [search, setSearch] = useState('');
  const [prompt, setPrompt] = useState(initialText);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('1K');
  const [style, setStyle] = useState('Natural');
  const [batch, setBatch] = useState(1);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [inputImage, setInputImage] = useState('');
  const [inputName, setInputName] = useState('');
  const [outputs, setOutputs] = useState<string[]>([]);
  const [activeOutput, setActiveOutput] = useState(0);
  const [textOutput, setTextOutput] = useState('');
  const [vectorSvg, setVectorSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [brandKitId, setBrandKitId] = useState('');
  const [folder, setFolder] = useState('');
  const [tags, setTags] = useState('');
  const [savedParentId, setSavedParentId] = useState('');
  const [rotation, setRotation] = useState(0);
  const [resizeWidth, setResizeWidth] = useState(1200);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [watermark, setWatermark] = useState('');
  const [ownsWatermark, setOwnsWatermark] = useState(false);

  const tool = config.tools.find((candidate) => candidate.id === toolId) || config.tools[0] || MEDIA_TOOLS[0];
  const imageOutput = outputs[activeOutput] || '';
  const currentImage = imageOutput || inputImage;
  const locked = (candidate: MediaToolDefinition) => PLAN_RANK[config.currentPlan] < PLAN_RANK[candidate.requiredPlan];
  const overLimit = prompt.length > config.limits.character;
  const nearLimit = prompt.length >= config.limits.character * 0.85;
  const availableTools = useMemo(() => config.tools.filter((candidate) => {
    const matchesTab = MEDIA_SECTIONS.includes(tab as MediaSection) ? candidate.section === tab : true;
    const query = search.trim().toLowerCase();
    return matchesTab && (!query || `${candidate.name} ${candidate.description} ${candidate.section}`.toLowerCase().includes(query));
  }), [config.tools, search, tab]);

  useEffect(() => {
    fetch('/api/media/config', { headers: auth })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body) => setConfig({ ...fallbackConfig, ...body, limits: { ...fallbackConfig.limits, ...body.limits }, usage: { ...fallbackConfig.usage, ...body.usage }, capabilities: { ...fallbackConfig.capabilities, ...body.capabilities } }))
      .catch(() => setError('Media configuration is temporarily unavailable. Safe local defaults are shown.'));
    if (!authenticated) return;
    Promise.all([
      fetch('/api/media/assets', { headers: auth }).then((response) => response.json()),
      fetch('/api/projects', { headers: auth }).then((response) => response.json()),
      fetch('/api/business/brand-kits', { headers: auth }).then((response) => response.json()),
    ]).then(([assetData, projectData, brandData]) => {
      setAssets(assetData.assets || []);
      setProjects(projectData.projects || []);
      setBrandKits(brandData.brandKits || []);
    }).catch(() => setError('Your private media library could not be loaded.'));
  }, [authenticated, auth]);

  const selectTool = (candidate: MediaToolDefinition) => {
    if (locked(candidate)) return onOpenUpgradeModal();
    setToolId(candidate.id);
    setTab(candidate.section);
    setError('');
    setStatus('');
    setTextOutput('');
    setVectorSvg('');
    if (candidate.operation === 'generate' || candidate.operation === 'vector') setOutputs([]);
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Upload a PNG, JPEG or WebP image.');
    if (file.size > config.limits.uploadSizeMb * 1024 * 1024) return setError(`The image exceeds the configured ${config.limits.uploadSizeMb} MB limit.`);
    try {
      const data = await fileToDataUrl(file);
      await loadImage(data);
      setInputImage(data);
      setInputName(file.name);
      setOutputs([]);
      setTextOutput('');
      setVectorSvg('');
      setSavedParentId('');
      setStatus('Image loaded locally. It is uploaded only when you run an AI tool or save it.');
    } catch {
      setError('The selected file is not a valid supported image.');
    }
  };

  const updateUsage = (kind: 'generation' | 'vision', used: number) => setConfig((current) => ({ ...current, usage: { ...current.usage, [kind]: used } }));

  const runAiTool = async () => {
    if (locked(tool)) return onOpenUpgradeModal();
    if (tool.requiresImage && !inputImage) return setError('Upload a real image before running this tool.');
    if ((tool.operation === 'generate' || tool.id === 'object-remove' || tool.id === 'visual-question') && !prompt.trim()) return setError('Add the requested visual brief or question.');
    if (overLimit) return;
    if (tool.operation === 'local') return applyLocalEdit();
    if (tool.operation === 'barcode') return readBarcode();
    if (tool.operation === 'vector') return createVectorMark();
    setLoading(true);
    setError('');
    setStatus('');
    setTextOutput('');
    try {
      const endpoint = tool.operation === 'generate' ? 'generate' : tool.operation === 'edit' ? 'edit' : 'vision';
      const response = await fetch(`/api/media/${endpoint}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId, prompt, question: prompt, negativePrompt, aspectRatio, quality, style, batch,
          image: inputImage, targetLanguage, ownsWatermark, brandKitId: brandKitId || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (['PREMIUM_MEDIA_TOOL', 'PREMIUM_QUALITY', 'PREMIUM_BATCH'].includes(body.code)) onOpenUpgradeModal();
        setError(body.error || 'The media request failed. Your image and brief are preserved.');
        return;
      }
      if (endpoint === 'generate') {
        setOutputs((body.images || []).map((item: any) => item.image));
        setActiveOutput(0);
        updateUsage('generation', body.usage.used);
      } else if (endpoint === 'edit') {
        setOutputs([body.image]);
        setActiveOutput(0);
        updateUsage('generation', body.usage.used);
      } else {
        setTextOutput(body.text || '');
        if (body.image) { setOutputs([body.image]); setActiveOutput(0); }
        updateUsage('vision', body.usage.used);
      }
      setSavedParentId('');
      setStatus(endpoint === 'vision' ? 'Analysis completed. Review important text and values against the original image.' : 'Media created. AI-generated images include provider provenance marking where supported.');
    } catch {
      setError('The media service could not be reached. Your image and brief are preserved.');
    } finally {
      setLoading(false);
    }
  };

  const applyLocalEdit = async () => {
    if (!inputImage) return setError('Upload a real image before editing it.');
    setLoading(true);
    setError('');
    try {
      const image = await loadImage(inputImage);
      const targetWidth = Math.max(64, Math.min(5000, resizeWidth || image.naturalWidth));
      const scale = targetWidth / image.naturalWidth;
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const swap = Math.abs(rotation % 180) === 90;
      const canvas = document.createElement('canvas');
      canvas.width = swap ? Math.round(sourceHeight * scale) : targetWidth;
      canvas.height = swap ? targetWidth : Math.round(sourceHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error();
      context.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(rotation * Math.PI / 180);
      context.drawImage(image, -targetWidth / 2, -(sourceHeight * scale) / 2, targetWidth, sourceHeight * scale);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.filter = 'none';
      if (tool.id === 'watermark-add' && watermark.trim()) {
        const fontSize = Math.max(16, Math.round(canvas.width / 24));
        context.font = `600 ${fontSize}px system-ui`;
        context.textAlign = 'right';
        context.fillStyle = 'rgba(255,255,255,.72)';
        context.strokeStyle = 'rgba(0,0,0,.5)';
        context.lineWidth = Math.max(1, fontSize / 20);
        context.strokeText(watermark.trim(), canvas.width - fontSize / 2, canvas.height - fontSize / 2);
        context.fillText(watermark.trim(), canvas.width - fontSize / 2, canvas.height - fontSize / 2);
      }
      setOutputs([canvas.toDataURL('image/png')]);
      setActiveOutput(0);
      setSavedParentId('');
      setStatus('The edit was applied locally in your browser.');
    } catch {
      setError('This browser could not apply the local image edit.');
    } finally {
      setLoading(false);
    }
  };

  const readBarcode = async () => {
    if (!inputImage) return setError('Upload an image containing a supported barcode or QR code.');
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return setError('BarcodeDetector is unavailable in this browser. No result was fabricated; try a supported Chromium browser.');
    setLoading(true);
    setError('');
    try {
      const detector = new Detector();
      const image = await loadImage(inputImage);
      const results = await detector.detect(image);
      if (!results.length) return setError('No supported barcode or QR code was detected in this image.');
      setTextOutput(results.map((result: any) => `${result.format || 'code'}: ${result.rawValue}`).join('\n'));
      setStatus('Code read locally in your browser. Review the decoded value before opening or using it.');
    } catch {
      setError('The browser could not read a supported code from this image.');
    } finally {
      setLoading(false);
    }
  };

  const createVectorMark = async () => {
    const name = prompt.trim();
    if (!name) return setError('Enter the brand name or initials for the original vector mark.');
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const safeName = escapeXml(name.slice(0, 50));
    const safeInitials = escapeXml(initials);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600" role="img" aria-label="${safeName} original brand mark"><rect width="1200" height="600" rx="64" fill="#f8fafc"/><rect x="90" y="110" width="380" height="380" rx="108" fill="#0f766e"/><circle cx="280" cy="300" r="118" fill="none" stroke="#99f6e4" stroke-width="28"/><text x="280" y="338" text-anchor="middle" font-family="Arial,sans-serif" font-size="120" font-weight="700" fill="#fff">${safeInitials}</text><text x="530" y="330" font-family="Arial,sans-serif" font-size="84" font-weight="700" fill="#0f172a">${safeName}</text></svg>`;
    const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    setVectorSvg(svg);
    setOutputs([await rasterize(svgData)]);
    setActiveOutput(0);
    setSavedParentId('');
    setStatus('Original editable SVG mark created. Review trademark availability before commercial use.');
  };

  const saveAsset = async () => {
    if (!authenticated) return onOpenUpgradeModal();
    if (!currentImage) return setError('Create, edit or upload an image before saving.');
    setError('');
    try {
      const image = currentImage.startsWith('data:image/svg') ? await rasterize(currentImage) : await rasterize(currentImage);
      const response = await fetch('/api/media/assets', {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prompt.trim().slice(0, 100) || inputName || tool.name,
          toolId, image, projectId: projectId || undefined, folder,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          source: vectorSvg ? 'vector' : imageOutput ? (tool.operation === 'edit' ? 'edited' : 'generated') : 'uploaded',
          parentId: savedParentId || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error || 'The asset could not be saved.');
      setAssets((current) => [body.asset, ...current]);
      setSavedParentId(body.asset.id);
      setStatus(projectId ? 'A private asset version was saved to the selected Project.' : 'A private asset version was saved to your Library.');
    } catch {
      setError('The asset could not be saved. Your image is preserved.');
    }
  };

  const removeAsset = async (id: string) => {
    const response = await fetch(`/api/media/assets/${id}`, { method: 'DELETE', headers: auth });
    if (!response.ok) return setError('The asset could not be deleted.');
    setAssets((current) => current.filter((asset) => asset.id !== id));
  };

  const exportAsset = async (format: string) => {
    if (!currentImage) return setError('There is no image to export.');
    try {
      const baseName = (inputName || tool.name).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'gxa-media';
      if (format === 'svg') {
        if (!vectorSvg) return setError('SVG export is available only for a vector brand mark.');
        return downloadData(new Blob([vectorSvg], { type: 'image/svg+xml' }), `${baseName}.svg`);
      }
      if (format === 'pdf') {
        const { PDFDocument } = await import('pdf-lib');
        const png = await rasterize(currentImage, 'image/png');
        const pdf = await PDFDocument.create();
        const embedded = await pdf.embedPng(png.split(',')[1]);
        const page = pdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        return downloadData(new Blob([await pdf.save()], { type: 'application/pdf' }), `${baseName}.pdf`);
      }
      const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
      downloadData(await rasterize(currentImage, mime), `${baseName}.${format}`);
    } catch {
      setError('The requested export could not be created in this browser.');
    }
  };

  const useAsset = (asset: MediaAsset) => {
    setInputImage(asset.image);
    setInputName(asset.title);
    setOutputs([]);
    setTextOutput('');
    setSavedParentId(asset.id);
    setToolId(config.tools.some((candidate) => candidate.id === asset.toolId) ? asset.toolId : 'crop-resize');
    setTab('Edit');
    setStatus(`Opened ${asset.title}, version ${asset.version}.`);
  };

  const handoff = (workspace: WorkspaceId) => {
    if (!textOutput) return;
    setSharedText(textOutput);
    onSelectWorkspace(workspace);
  };

  const openSection = (section: StudioTab) => {
    setTab(section);
    setSearch('');
    if (MEDIA_SECTIONS.includes(section as MediaSection)) {
      const first = config.tools.find((candidate) => candidate.section === section && !locked(candidate));
      if (first) setToolId(first.id);
    }
  };

  const renderToolList = () => (
    <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search media tools" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
      <div className="space-y-1">
        {availableTools.map((candidate) => (
          <button key={candidate.id} onClick={() => selectTool(candidate)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${candidate.id === toolId ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100' : 'hover:bg-slate-50 dark:hover:bg-zinc-900'}`}>
            <span className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">{candidate.operation === 'vision' ? <ScanLine className="h-4 w-4" /> : candidate.operation === 'edit' || candidate.operation === 'local' ? <WandSparkles className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-xs font-bold">{candidate.name}{locked(candidate) && <Lock className="h-3 w-3 text-amber-500" />}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500 dark:text-zinc-500">{candidate.description}</span></span>
          </button>
        ))}
        {!availableTools.length && <p className="p-4 text-center text-xs text-slate-500">No matching tools.</p>}
      </div>
    </aside>
  );

  const renderHome = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6 dark:border-teal-950 dark:from-teal-950/50 dark:via-zinc-950 dark:to-cyan-950/30 sm:p-8">
        <div className="max-w-3xl"><span className="text-xs font-black uppercase tracking-[.22em] text-teal-700 dark:text-teal-400">AI Media, Vision and Creative Studio</span><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Create, understand and organize visual work.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-400">Generate original media, edit real images, run probabilistic OCR and visual analysis, build campaign assets, and keep authenticated work private in Projects.</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MEDIA_SECTIONS.map((section) => { const Icon = sectionIcon(section); return <button key={section} onClick={() => openSection(section)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 dark:border-zinc-800 dark:bg-zinc-950"><Icon className="h-5 w-5 text-teal-600" /><h3 className="mt-4 text-sm font-black">{section}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{config.tools.filter((candidate) => candidate.section === section).length} configured tools</p><ArrowRight className="mt-4 h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-600" /></button>; })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"><div className="flex items-center justify-between"><h3 className="text-sm font-black">Recent this session</h3><span className="text-xs text-slate-500">Not stored for guests</span></div>{currentImage ? <button onClick={() => openSection('Edit')} className="mt-4 flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left dark:bg-zinc-900"><img src={currentImage} alt="Most recent session asset" className="h-16 w-16 rounded-lg object-cover" /><span className="text-xs font-bold">Continue editing the current asset</span></button> : <p className="mt-6 text-center text-xs text-slate-500">No media has been created or uploaded in this session.</p>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="text-sm font-black">Projects and private library</h3><p className="mt-2 text-xs leading-5 text-slate-500">{authenticated ? `${assets.length} private assets and ${projects.length} available Projects.` : 'Sign in when you want to save versions, folders, tags, generated assets, OCR outputs or Project associations.'}</p><button onClick={() => openSection(authenticated ? 'Library' : 'Projects')} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">{authenticated ? 'Open Library' : 'Sign in to save'}</button></section>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Private asset library</h2><p className="mt-1 text-xs text-slate-500">Generated, uploaded, edited, OCR-related and exported visual versions.</p></div><span className="text-xs font-bold text-slate-500">{assets.length} / {config.limits.assets}</span></div>
      {!authenticated ? <div className="py-20 text-center"><Lock className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold">Sign in to use the private asset library.</p><button onClick={onOpenUpgradeModal} className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white">Login or register</button></div> : assets.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800"><img src={asset.image} alt={asset.title} className="aspect-video w-full bg-slate-100 object-cover dark:bg-zinc-900" /><div className="p-3"><h3 className="truncate text-xs font-black">{asset.title}</h3><p className="mt-1 text-[10px] text-slate-500">Version {asset.version} · {asset.source}{asset.folder ? ` · ${asset.folder}` : ''}</p><div className="mt-3 flex gap-2"><button onClick={() => useAsset(asset)} className="flex-1 rounded-lg bg-teal-600 px-3 py-1.5 text-[10px] font-bold text-white">Open</button><button onClick={() => removeAsset(asset.id)} aria-label={`Delete ${asset.title}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-red-600 dark:border-zinc-800"><Trash2 className="h-3.5 w-3.5" /></button></div></div></article>)}</div> : <div className="py-20 text-center"><Library className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold">No saved media assets yet.</p><p className="mt-1 text-xs text-slate-500">Create or upload real media, then save it here.</p></div>}
    </div>
  );

  const renderProjects = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Media Projects</h2><p className="mt-1 text-xs text-slate-500">Save each media version into an existing private Project.</p></div>{authenticated && <button onClick={() => onSelectWorkspace('projects')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-zinc-800">Manage Projects</button>}</div>
      {!authenticated ? <div className="py-20 text-center"><Lock className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold">Sign in to associate media with Projects.</p><button onClick={onOpenUpgradeModal} className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white">Login or register</button></div> : projects.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => { const count = assets.filter((asset) => asset.projectId === project.id).length; return <button key={project.id} onClick={() => { setProjectId(project.id); openSection('Create'); setStatus(`New media will be saved to ${project.name} when you choose Save.`); }} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-teal-400 dark:border-zinc-800"><FolderOpen className="h-5 w-5 text-teal-600" /><h3 className="mt-3 truncate text-sm font-black">{project.name}</h3><p className="mt-1 text-xs text-slate-500">{count} media {count === 1 ? 'asset' : 'assets'}</p></button>; })}</div> : <div className="py-20 text-center"><FolderOpen className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold">No Projects yet.</p><p className="mt-1 text-xs text-slate-500">Create a Project first, then return to save media into it.</p><button onClick={() => onSelectWorkspace('projects')} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">Open Projects</button></div>}
    </div>
  );

  const renderWorkspace = () => (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {renderToolList()}
      <main className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-black">{tool.name}</h2>{locked(tool) && <Lock className="h-4 w-4 text-amber-500" />}</div><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{tool.description}</p></div><div className="flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-zinc-900">{tool.requiredPlan === 'pro_plus' ? 'Pro Plus' : tool.requiredPlan === 'pro' ? 'Pro' : 'Free'}</span><span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">{tool.operation === 'vision' ? `${config.usage.vision}/${config.limits.vision} today` : `${config.usage.generation}/${config.limits.generation} today`}</span></div></div>
        </section>

        {tool.requiresImage && <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><div className="grid gap-4 md:grid-cols-2"><button type="button" onClick={() => fileInput.current?.click()} onDrop={(event) => { event.preventDefault(); handleUpload(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-teal-400 dark:border-zinc-800 dark:bg-zinc-900"><Upload className="h-6 w-6 text-teal-600" /><span className="mt-3 text-sm font-black">{inputImage ? 'Replace image' : 'Upload a real image'}</span><span className="mt-1 text-xs text-slate-500">PNG, JPEG or WebP · up to {config.limits.uploadSizeMb} MB</span><input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} /></button>{inputImage ? <div className="relative min-h-48 overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-900"><img src={inputImage} alt="User uploaded source" className="h-full max-h-72 w-full object-contain" /><button onClick={() => { setInputImage(''); setInputName(''); setOutputs([]); setTextOutput(''); }} aria-label="Remove uploaded image" className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white"><X className="h-4 w-4" /></button></div> : <div className="flex min-h-48 items-center justify-center rounded-xl bg-slate-50 text-center text-xs text-slate-500 dark:bg-zinc-900">No demo image is preloaded.</div>}</div></section>}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
          {(tool.operation === 'generate' || tool.operation === 'edit' || tool.id === 'visual-question' || tool.id === 'screenshot-analysis' || tool.id === 'website-analysis' || tool.operation === 'vector') && <label className="block"><span className="text-xs font-black">{tool.operation === 'vector' ? 'Brand name or initials' : tool.operation === 'vision' ? 'Question or review focus' : tool.operation === 'edit' ? 'Editing instructions' : 'Visual brief'}</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={tool.operation === 'generate' ? 'Describe the original visual, subject, composition, factual text and intended use…' : tool.operation === 'edit' ? 'Describe only the change you want…' : 'Enter the supplied brand name or question…'} rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-teal-500 dark:border-zinc-800 dark:bg-zinc-900" /><span className={`mt-1 block text-right text-[10px] ${overLimit ? 'font-bold text-red-600' : nearLimit ? 'text-amber-600' : 'text-slate-400'}`}>{prompt.length.toLocaleString()} / {config.limits.character.toLocaleString()}</span></label>}

          {tool.operation === 'generate' && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-bold">Aspect ratio<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">{config.aspectRatios.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-bold">Quality<select value={quality} onChange={(event) => { if (event.target.value === '4K' && config.currentPlan !== 'pro_plus') { onOpenUpgradeModal(); return; } setQuality(event.target.value); }} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">{config.qualities.map((item) => <option key={item}>{item}{item === '4K' ? ' · Pro Plus' : ''}</option>)}</select></label><label className="text-xs font-bold">Style<select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">{config.styles.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-bold">Batch<select value={batch} onChange={(event) => { const value = Number(event.target.value); if (value > 1 && config.currentPlan === 'free') { onOpenUpgradeModal(); return; } setBatch(value); }} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">{Array.from({ length: Math.max(1, config.limits.batch) }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{item}{item > 1 ? ' · Pro' : ''}</option>)}</select></label></div>}
          {tool.operation === 'generate' && <label className="mt-3 block text-xs font-bold">Avoid (optional)<input value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="Unwanted objects, colors or composition" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" /></label>}
          {tool.id === 'image-translate' && <label className="mt-3 block text-xs font-bold">Target language<input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" /></label>}
          {tool.id === 'watermark-owned-remove' && <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30"><input type="checkbox" checked={ownsWatermark} onChange={(event) => setOwnsWatermark(event.target.checked)} className="mt-0.5" /><span>I confirm I own this watermark or have permission to remove it.</span></label>}
          {tool.operation === 'local' && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-bold">Width (px)<input type="number" min="64" max="5000" value={resizeWidth} onChange={(event) => setResizeWidth(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900" /></label><label className="text-xs font-bold">Rotation<select value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">{[0, 90, 180, 270].map((item) => <option key={item} value={item}>{item}°</option>)}</select></label><label className="text-xs font-bold">Brightness {brightness}%<input type="range" min="25" max="175" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} className="mt-3 w-full" /></label><label className="text-xs font-bold">Contrast {contrast}%<input type="range" min="25" max="175" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} className="mt-3 w-full" /></label>{tool.id === 'watermark-add' && <label className="text-xs font-bold sm:col-span-2">Your watermark text<input value={watermark} onChange={(event) => setWatermark(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900" /></label>}</div>}
          {authenticated && tool.operation === 'generate' && brandKits.length > 0 && <label className="mt-3 block text-xs font-bold">Private Brand Kit<select value={brandKitId} onChange={(event) => setBrandKitId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"><option value="">No Brand Kit</option>{brandKits.map((kit) => <option key={kit.id} value={kit.id}>{kit.companyName}</option>)}</select></label>}
          <button onClick={runAiTool} disabled={loading || overLimit || (tool.requiresImage && !inputImage)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : locked(tool) ? <Lock className="h-4 w-4" /> : tool.operation === 'vision' || tool.operation === 'barcode' ? <ScanLine className="h-4 w-4" /> : tool.operation === 'local' ? <Crop className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{loading ? 'Working…' : locked(tool) ? 'View upgrade options' : tool.operation === 'vision' ? 'Analyze image' : tool.operation === 'barcode' ? 'Read code locally' : tool.operation === 'local' ? 'Apply local edit' : tool.operation === 'vector' ? 'Create vector mark' : tool.operation === 'edit' ? 'Edit image' : 'Create image'}</button>
          {tool.section === 'OCR' && <p className="mt-3 text-[10px] leading-4 text-slate-500">OCR is probabilistic and may misread text, handwriting, tables, formulas or identity fields. Always compare important output with the original. ID reading does not verify identity or authenticity.</p>}
        </section>

        {(error || status) && <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>{error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}<span>{error || status}</span></div>}

        {(currentImage || textOutput) && <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-black">{textOutput ? 'Vision/OCR result' : 'Media output'}</h3><div className="flex flex-wrap gap-2">{textOutput && <button onClick={() => { navigator.clipboard.writeText(textOutput); setCopied(true); setTimeout(() => setCopied(false), 1600); }} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold dark:border-zinc-800">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}</button>}{currentImage && <button onClick={saveAsset} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold dark:border-zinc-800"><Save className="h-3.5 w-3.5" />{savedParentId ? 'Save new version' : 'Save'}</button>}</div></div>{outputs.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{outputs.map((item, index) => <button key={`${item.slice(-20)}-${index}`} onClick={() => setActiveOutput(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${activeOutput === index ? 'border-teal-500' : 'border-transparent'}`}><img src={item} alt={`Generated variation ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}{currentImage && <div className="mt-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-900"><img src={currentImage} alt={imageOutput ? `${tool.name} output` : 'Uploaded image'} className="mx-auto max-h-[640px] w-full object-contain" /></div>}{textOutput && <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-6 dark:bg-zinc-900">{textOutput}</pre>}{textOutput && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => handoff('translation')} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold dark:border-zinc-800"><Languages className="mr-1 inline h-3.5 w-3.5" />Translate</button><button onClick={() => handoff('grammar')} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold dark:border-zinc-800">Check grammar</button><button onClick={() => handoff('ai-writing')} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold dark:border-zinc-800">Open in AI Writer</button></div>}{currentImage && <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-zinc-800 sm:grid-cols-2"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Save privately</p><div className="mt-2 grid gap-2"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={!authenticated} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900"><option value="">No Project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Folder (optional)" className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" /><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags, comma separated" className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" /></div></div><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Export</p><div className="mt-2 flex flex-wrap gap-2">{config.exportFormats.map((format) => <button key={format} onClick={() => exportAsset(format)} disabled={format === 'svg' && !vectorSvg} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800"><Download className="h-3.5 w-3.5" />{format}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-slate-500">SVG is available only for the vector-first Brand Mark tool. Raster exports are created locally.</p></div></div>}</section>}
      </main>
    </div>
  );

  const tabs: StudioTab[] = ['Home', ...MEDIA_SECTIONS, 'Library', 'Projects'];
  return <div className="mx-auto w-full max-w-[1600px] space-y-4 text-left text-slate-900 dark:text-zinc-100">
    <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-teal-600 p-2 text-white"><Layers3 className="h-5 w-5" /></span><div><h1 className="text-base font-black">Media Studio</h1><p className="text-[10px] text-slate-500">Create · Edit · OCR · Vision · Brand</p></div></div><button onClick={() => { setInputImage(''); setInputName(''); setOutputs([]); setTextOutput(''); setPrompt(''); setVectorSvg(''); setSavedParentId(''); setError(''); setStatus(''); }} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-950"><Plus className="h-3.5 w-3.5" />New</button></div><nav aria-label="Media Studio sections" className="flex gap-1 overflow-x-auto pb-1">{tabs.map((item) => { const Icon = sectionIcon(item); return <button key={item} onClick={() => item === 'Projects' && !authenticated ? onOpenUpgradeModal() : openSection(item)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold ${tab === item ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900'}`}><Icon className="h-3.5 w-3.5" />{item}{item === 'Projects' && !authenticated && <Lock className="h-3 w-3" />}</button>; })}</nav></header>
    {tab === 'Home' ? renderHome() : tab === 'Library' ? renderLibrary() : tab === 'Projects' ? renderProjects() : renderWorkspace()}
  </div>;
}
