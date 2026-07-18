import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  Send, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  Trash2, 
  Loader2, 
  Search,
  BookOpen,
  Briefcase,
  Mail,
  GraduationCap,
  PenTool,
  Bookmark,
  Plus,
  RotateCw,
  FolderOpen,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
  Lock,
  Compass,
  Flame,
  Undo2,
  Redo2,
  Upload,
  ArrowRight,
  Eye,
  History,
  Shield,
  Save,
  HelpCircle,
  FileCode,
  FileSpreadsheet,
  Globe,
  Sliders,
  Sparkle,
  Settings,
  FlameKindling,
  User,
  Users,
  CheckCircle,
  X,
  PlusCircle,
  FileSignature,
  Image as ImageIcon
} from 'lucide-react';
import { WRITER_CATEGORIES, WRITER_TEMPLATES, type WriterFieldDefinition } from '../../../shared/writerRegistry';
import type { WorkspaceId } from '../../types';
import { generateWriterContent, WriterApiError } from '../../utils/writer';
import { 
  fetchSystemConfig, 
  fetchUsage, 
  isUserPremium, 
  SystemConfig, 
  UsageStats 
} from '../../utils/limits';

// ==========================================
// DATA STRUCTURES & DEFINITIONS
// ==========================================

interface TemplateItem {
  id: string;
  name: string;
  desc: string;
  placeholderPrompt: string;
  systemInstruction: string;
  inputFields?: WriterFieldDefinition[];
  requiredPlan?: 'free' | 'pro' | 'pro_plus';
  guestAccess?: boolean;
  keywords?: string[];
  featured?: boolean;
  popular?: boolean;
  isNew?: boolean;
  outputType?: 'document' | 'outline' | 'email' | 'social' | 'structured';
}

interface TemplateCategory {
  id: string;
  name: string;
  icon: any;
  templates: TemplateItem[];
}

interface DocumentVersion {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  favorite: boolean;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface AIWritingProps {
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
  initialText?: string;
  onSelectWorkspace?: (id: WorkspaceId) => void;
  setSharedText?: (text: string) => void;
}

export default function AIWriting({ currentUser, onOpenUpgradeModal, initialText = '', onSelectWorkspace, setSharedText }: AIWritingProps) {
  // ------------------------------------------
  // SYSTEM CONFIG & LIMITS STATES
  // ------------------------------------------
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [planType, setPlanType] = useState<'free' | 'pro' | 'pro_plus' | 'team'>('free');
  const [fetchingLimits, setFetchingLimits] = useState<boolean>(true);

  // Layout toggles
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'sidebar' | 'editor' | 'assistant'>('editor');
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  // Active Category & Tool Selection
  const [activeCategory, setActiveCategory] = useState<string>('general-writing');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('ai-writer');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);

  // Document Editor State
  const [editorTitle, setEditorTitle] = useState<string>('');
  const [editorContent, setEditorContent] = useState<string>(initialText);
  const [editorStarted, setEditorStarted] = useState<boolean>(Boolean(initialText));
  const [outlineSections, setOutlineSections] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [lastAutoSaved, setLastAutoSaved] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('English');

  // Interactive Commands & Highlights
  const [showSlashMenu, setShowSlashMenu] = useState<boolean>(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState<string>('');
  const [slashMenuPosition, setSlashMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showInlineMenu, setShowInlineMenu] = useState<boolean>(false);
  const [inlineMenuPosition, setInlineMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [highlightedText, setHighlightedText] = useState<string>('');

  // AI Assistant Panel State Parameters
  const [purpose, setPurpose] = useState<string>('inform');
  const [tone, setTone] = useState<string>('professional');
  const [audience, setAudience] = useState<string>('general');
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [lengthMode, setLengthMode] = useState<string>('medium');
  const [creativity, setCreativity] = useState<string>('medium');
  const [professionalLevel, setProfessionalLevel] = useState<string>('mid');
  const [writingStyle, setWritingStyle] = useState<string>('expository');
  const [readingLevel, setReadingLevel] = useState<string>('high_school');
  const [keywordsInput, setKeywordsInput] = useState<string>('');

  const [promptInput, setPromptInput] = useState<string>(initialText);
  const [templateValues, setTemplateValues] = useState<Record<string, Record<string, string>>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generationError, setGenerationError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isAborted, setIsAborted] = useState<boolean>(false);

  // Projects State
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-default');

  // Prompt Library State
  const [promptLibrary, setPromptLibrary] = useState<SavedPrompt[]>([]);
  const [newPromptTitle, setNewPromptTitle] = useState<string>('');
  const [newPromptText, setNewPromptText] = useState<string>('');
  const [showPromptLibraryModal, setShowPromptLibraryModal] = useState<boolean>(false);

  // Version History State
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [comparingVersionId, setComparingVersionId] = useState<string | null>(null);

  // Copy Feedback state
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Admin Variables
  const [adminConfig, setAdminConfig] = useState({
    defaultModel: 'gemini-3.5-flash',
    maxFreeGenerations: 10,
    maxFreeWordCount: 500,
    rateLimitMinute: 60
  });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const storedWriterUser = (() => { try { return JSON.parse(localStorage.getItem('gxa_user') || 'null'); } catch { return null; } })();
  const authenticatedWriterUser = currentUser?.sessionToken && !currentUser?.guest ? currentUser : storedWriterUser?.sessionToken ? storedWriterUser : null;
  const isWriterAuthenticated = Boolean(authenticatedWriterUser?.sessionToken);

  // ==========================================
  // TEMPLATES DATABASE BY CATEGORIES
  // ==========================================
  // The shared registry is the runtime source of truth for search, forms, routes,
  // access labels, backend validation identifiers, and analytics-safe IDs.
  const categories = useMemo<TemplateCategory[]>(() => WRITER_CATEGORIES.map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    name,
    icon: name.includes('Academic') ? GraduationCap : name.includes('Business') || name.includes('Career') ? Briefcase : name.includes('Email') || name.includes('Marketing') ? Mail : name.includes('Social') || name.includes('SEO') ? Globe : name.includes('Creative') || name.includes('Personal') ? PenTool : Sparkles,
    templates: WRITER_TEMPLATES.filter(template => template.category === name).map(template => ({
      id: template.id,
      name: template.name,
      desc: template.description,
      placeholderPrompt: template.inputFields[0]?.placeholder || 'Describe what you want to write…',
      systemInstruction: template.systemInstructionKey,
      inputFields: template.inputFields,
      requiredPlan: template.requiredPlan,
      guestAccess: template.guestAccess,
      keywords: template.keywords,
      featured: template.featured,
      popular: template.popular,
      isNew: template.isNew,
      outputType: template.outputType,
    })),
  })), []);
  const allTemplates = useMemo(() => categories.flatMap(c => c.templates.map(t => ({ ...t, category: c.name }))), [categories]);

  const activeTemplate = allTemplates.find(t => t.id === activeTemplateId) || allTemplates[0];

  // ------------------------------------------
  // INITIALIZATION & LIMITS
  // ------------------------------------------
  useEffect(() => {
    const loadLimits = async () => {
      try {
        const sysConfig = await fetchSystemConfig();
        setConfig(sysConfig);
        const user = authenticatedWriterUser;
        if (user) {
          setIsPremium(isUserPremium(user));
          setPlanType(user.plan || (isUserPremium(user) ? 'pro' : 'free'));
          const userUsage = await fetchUsage(user);
          setUsage(userUsage);
        } else {
          setIsPremium(false);
          setPlanType('free');
          const guestUsage = await fetchUsage();
          setUsage(guestUsage);
        }
      } catch (err) {
        console.error('Failed to load limits in AI Writing Studio:', err);
      } finally {
        setFetchingLimits(false);
      }
    };

    const fetchProjects = async () => {
      const savedUser = localStorage.getItem('gxa_user');
      if (!savedUser) return;
      try {
        const user = JSON.parse(savedUser);
        const projRes = await fetch('/api/projects', {
          headers: { 'Authorization': `Bearer ${user.sessionToken}` }
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData.projects || []);
        }
      } catch (err) {
        console.error('Error fetching database projects:', err);
      }
    };

    loadLimits();
    fetchProjects();

    // Existing browser-backed drafts are loaded only for authenticated users.
    // Guests receive a clean studio and are never shown fake cloud persistence.
    if (isWriterAuthenticated) try {
      const savedVersions = localStorage.getItem('gxa_writer_versions');
      if (savedVersions) setVersions(JSON.parse(savedVersions));

      const savedFavs = localStorage.getItem('gxa_writer_favorites');
      if (savedFavs) setFavoritesList(JSON.parse(savedFavs));

      const savedRecent = localStorage.getItem('gxa_writer_recent');
      if (savedRecent) setRecentTemplates(JSON.parse(savedRecent));

      const savedPrompts = localStorage.getItem('gxa_writer_saved_prompts');
      if (savedPrompts) setPromptLibrary(JSON.parse(savedPrompts));

      const lastEditorTitle = localStorage.getItem('gxa_writer_active_title');
      if (lastEditorTitle) setEditorTitle(lastEditorTitle);

      const lastEditorContent = localStorage.getItem('gxa_writer_active_content');
      if (lastEditorContent) setEditorContent(lastEditorContent);
    } catch (e) {
      console.error('Error loading AI Writer stored context:', e);
    }
  }, [currentUser]);

  // ------------------------------------------
  // COUNTERS & HELPER FUNCTIONS
  // ------------------------------------------
  const getWordCount = (str: string) => {
    if (!str.trim()) return 0;
    return str.trim().split(/\s+/).length;
  };

  const getCharCount = (str: string) => {
    return str.length;
  };

  const getReadingTime = (str: string) => {
    const words = getWordCount(str);
    return Math.ceil(words / 225); // Average words read per minute
  };

  // Safe localStorage saving
  const saveLocalContext = (key: string, value: any) => {
    if (!isWriterAuthenticated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  };

  // Undo / Redo mechanics
  const handleEditorChange = (val: string) => {
    setEditorStarted(true);
    setUndoStack(prev => [...prev, editorContent].slice(-50)); // Limit history to 50
    setRedoStack([]);
    setEditorContent(val);
    if (isWriterAuthenticated) localStorage.setItem('gxa_writer_active_content', val);

    // Dynamic auto-detect language outline
    if (val.length > 50) {
      const hasSpanish = /\b(el|la|los|las|de|en|y|que|con|una)\b/i.test(val);
      const hasGerman = /\b(der|die|das|und|ist|mit|auf|eine|für)\b/i.test(val);
      const hasFrench = /\b(le|la|les|et|est|un|une|pour|avec)\b/i.test(val);
      if (hasSpanish) setDetectedLanguage('Spanish');
      else if (hasGerman) setDetectedLanguage('German');
      else if (hasFrench) setDetectedLanguage('French');
      else setDetectedLanguage('English');
    }

    if (isWriterAuthenticated) {
      const now = new Date();
      setLastAutoSaved(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } else {
      setLastAutoSaved('');
    }
  };

  const triggerUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, editorContent]);
    setEditorContent(prev);
    setUndoStack(prevStack => prevStack.slice(0, -1));
  };

  const triggerRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, editorContent]);
    setEditorContent(next);
    setRedoStack(prevStack => prevStack.slice(0, -1));
  };

  // Toggle Favorite
  const toggleFavoriteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (favoritesList.includes(id)) {
      updated = favoritesList.filter(item => item !== id);
    } else {
      updated = [...favoritesList, id];
    }
    setFavoritesList(updated);
    saveLocalContext('gxa_writer_favorites', updated);
  };

  // Drag & Drop / File Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['txt', 'md', 'markdown'].includes(extension || '') || !['text/plain', 'text/markdown', ''].includes(file.type)) {
      setGenerationError('Upload a TXT or Markdown file. The current draft is unchanged.');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setGenerationError('The file is larger than 2 MB. The current draft is unchanged.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string || '';
      setEditorTitle(file.name.replace(/\.[^/.]+$/, ""));
      handleEditorChange(text);
      setGenerationError('');
    };
    reader.onerror = () => setGenerationError('The file could not be read. The current draft is unchanged.');
    reader.readAsText(file);
  };

  // ------------------------------------------
  // AI STREAMING GENERATION CORE
  // ------------------------------------------
  const runAiGeneration = async (mode: 'generate' | 'continue' | 'improve' | 'expand' | 'shorten' | 'rewrite' | 'inline' | 'outline' | 'section' = 'generate', customPrompt = '') => {
    if (loading) return;
    if (!isPremium && activeTemplate.requiredPlan && activeTemplate.requiredPlan !== 'free') {
      setShowUpgradeModal(true);
      return;
    }
    const values = templateValues[activeTemplateId] || {};
    const nextErrors: Record<string, string> = {};
    for (const field of activeTemplate.inputFields || []) {
      if (field.required && !String(values[field.id] || '').trim()) nextErrors[field.id] = `${field.label} is required.`;
      if (String(values[field.id] || '').length > field.maxLength) nextErrors[field.id] = `${field.label} is too long.`;
    }
    if (mode === 'generate' && activeTemplateId === 'ai-writer' && !String(values.topic || promptInput).trim()) nextErrors.topic = 'Describe what you want to write.';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setGenerationError('Review the highlighted fields before generating.');
      return;
    }

    setFieldErrors({});
    setGenerationError('');
    setLoading(true);
    setIsAborted(false);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const response = await generateWriterContent({
        templateId: activeTemplateId,
        fields: { ...values, ...(promptInput.trim() && !values.topic ? { topic: promptInput.trim() } : {}) },
        tone,
        language: targetLanguage,
        length: lengthMode,
        audience,
        purpose,
        keywords: keywordsInput.split(',').map(value => value.trim()).filter(Boolean),
        customInstructions: customPrompt || promptInput,
        existingContent: editorContent,
        selectedText: mode === 'inline' ? highlightedText : '',
        mode,
        requestId: globalThis.crypto?.randomUUID?.() || `writer-${Date.now()}`,
      }, controller.signal);
      const nextContent = mode === 'inline' && selectionRange
        ? editorContent.slice(0, selectionRange.start) + response.text + editorContent.slice(selectionRange.end)
        : response.text;
      handleEditorChange(nextContent);
      if (mode === 'outline') {
        const headings = response.text.split('\n').map(line => line.replace(/^\s*(?:[-*]|\d+[.)]|#{1,6})\s*/, '').trim()).filter(line => line.length > 2).slice(0, 20);
        setOutlineSections(headings);
      }
      setShowInlineMenu(false);

      if (isWriterAuthenticated) {
        const newVersion: DocumentVersion = { id: `v-${Date.now()}`, title: `${activeTemplate.name} revision`, content: nextContent, timestamp: Date.now() };
        const updatedVersions = [newVersion, ...versions].slice(0, 30);
        setVersions(updatedVersions);
        saveLocalContext('gxa_writer_versions', updatedVersions);
      }
      const nextRecent = [activeTemplateId, ...recentTemplates.filter(id => id !== activeTemplateId)].slice(0, 6);
      setRecentTemplates(nextRecent);
      saveLocalContext('gxa_writer_recent', nextRecent);
      setUsage(previous => previous ? { ...previous, writer_generations: response.usage.writer_generations } : previous);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setIsAborted(true);
        setGenerationError('Generation stopped. Your existing draft is preserved.');
      } else if (error instanceof WriterApiError) {
        if (error.field) setFieldErrors({ [error.field]: error.message });
        if (error.status === 403 || error.code === 'REQUEST_LIMIT' || error.code === 'WORD_LIMIT') setShowUpgradeModal(true);
        setGenerationError(error.message);
      } else {
        setGenerationError('The writing service is unavailable. Your form and draft are preserved. Try again.');
      }
    } finally {
      setLoading(false);
      requestControllerRef.current = null;
    }
  };

  const handleSelectTemplate = (template: TemplateItem) => {
    if (!isPremium && template.requiredPlan && template.requiredPlan !== 'free') {
      setShowUpgradeModal(true);
      return;
    }
    setActiveTemplateId(template.id);
    setFieldErrors({});
    setGenerationError('');
    setMobileTab('assistant');
  };

  const handleCancelGeneration = () => {
    requestControllerRef.current?.abort();
    setLoading(false);
    setIsAborted(true);
  };

  // ------------------------------------------
  // INLINE SELECTION AI HELPERS
  // ------------------------------------------
  const handleEditorSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const txtArea = e.currentTarget;
    const start = txtArea.selectionStart;
    const end = txtArea.selectionEnd;
    
    if (start !== end) {
      const selectedText = txtArea.value.substring(start, end);
      if (selectedText.trim().length > 3) {
        setHighlightedText(selectedText);
        setSelectionRange({ start, end });
        
        // Calculate coordinates roughly
        const rect = txtArea.getBoundingClientRect();
        // Place menu near selection
        setInlineMenuPosition({
          top: rect.top + window.scrollY + 40,
          left: Math.min(rect.left + 50, window.innerWidth - 300)
        });
        setShowInlineMenu(true);
      }
    } else {
      setShowInlineMenu(false);
    }
  };

  // ------------------------------------------
  // SLASH COMMAND POPUP LISTENER
  // ------------------------------------------
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/') {
      const txtArea = e.currentTarget;
      const rect = txtArea.getBoundingClientRect();
      setSlashMenuPosition({
        top: rect.top + window.scrollY + 40,
        left: Math.min(rect.left + 60, window.innerWidth - 280)
      });
      setShowSlashMenu(true);
      setSlashSearchQuery('');
    } else if (showSlashMenu) {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
      } else if (e.key === 'Backspace' && slashSearchQuery === '') {
        setShowSlashMenu(false);
      }
    }
  };

  const handleApplySlashCommand = (templateId: string) => {
    const selected = allTemplates.find(t => t.id === templateId);
    if (selected) {
      handleSelectTemplate(selected);
      setShowSlashMenu(false);
      // Strip out the trailing slash
      if (editorContent.endsWith('/')) {
        handleEditorChange(editorContent.slice(0, -1));
      }
    }
  };

  // ------------------------------------------
  // EXPORT UTILITIES (TXT, MD, HTML, DOCX)
  // ------------------------------------------
  const exportDocument = (format: 'txt' | 'md' | 'html' | 'docx') => {
    if (!editorContent.trim()) return;
    const safeTitle = (editorTitle || activeTemplate.name || 'document').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'document';
    const filename = `${safeTitle}.${format}`;
    let outputData = '';
    let mimeType = 'text/plain';

    if (format === 'html') {
      const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      mimeType = 'text/html';
      outputData = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(editorTitle || activeTemplate.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1, h2, h3 { color: #111827; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; }
    code { font-family: monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(editorTitle || activeTemplate.name)}</h1>
  <div>${escapeHtml(editorContent).replace(/\n/g, '<br />')}</div>
</body>
</html>`;
    } else if (format === 'md') {
      outputData = `# ${editorTitle || activeTemplate.name}\n\n${editorContent}`;
    } else {
      outputData = `${editorTitle || activeTemplate.name}\n\n${editorContent}`;
    }

    const blob = new Blob([outputData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  // Version management
  const restoreVersionSnapshot = (content: string) => {
    handleEditorChange(content);
    setComparingVersionId(null);
  };

  const deleteVersionSnapshot = (id: string) => {
    const updated = versions.filter(v => v.id !== id);
    setVersions(updated);
    saveLocalContext('gxa_writer_versions', updated);
  };

  // Prompt Library Actions
  const handleSavePromptToLib = () => {
    if (!isWriterAuthenticated) {
      setShowPromptLibraryModal(false);
      setGenerationError('Log in or register to save reusable prompts. Your entries are preserved for this session.');
      return;
    }
    if (!newPromptTitle || !newPromptText) return;
    const newPrompt: SavedPrompt = {
      id: `prompt-${Date.now()}`,
      title: newPromptTitle,
      prompt: newPromptText,
      favorite: false
    };
    const updated = [newPrompt, ...promptLibrary];
    setPromptLibrary(updated);
    saveLocalContext('gxa_writer_saved_prompts', updated);
    setNewPromptTitle('');
    setNewPromptText('');
    setShowPromptLibraryModal(false);
  };

  const deleteSavedPrompt = (id: string) => {
    const updated = promptLibrary.filter(p => p.id !== id);
    setPromptLibrary(updated);
    saveLocalContext('gxa_writer_saved_prompts', updated);
  };

  const handleSaveDocument = async () => {
    const user = authenticatedWriterUser;
    if (!user?.email) {
      setGenerationError('Log in or register to save this document. Your current work is preserved.');
      return;
    }
    if (!editorContent.trim()) {
      setGenerationError('Add content before saving a document.');
      return;
    }
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.sessionToken}` },
        body: JSON.stringify({
          name: editorTitle.trim() || activeTemplate.name,
          content: editorContent,
          type: 'Writer Document',
          toolUsed: 'AI Writer Studio',
          projectId: selectedProjectId === 'proj-default' ? undefined : selectedProjectId,
          metadata: { templateId: activeTemplateId, fields: templateValues[activeTemplateId] || {}, tone, language: targetLanguage, length: lengthMode },
        }),
      });
      if (!response.ok) throw new Error('save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
    } catch {
      setSaveStatus('error');
      setGenerationError('The document could not be saved. Your current work is preserved. Try again.');
    }
  };

  const handleCreateProject = async () => {
    const user = authenticatedWriterUser;
    if (!user?.email) {
      setGenerationError('Log in or register to create a project. Your current work is preserved.');
      return;
    }
    const name = window.prompt('Project name');
    if (!name?.trim()) return;
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.sessionToken}` }, body: JSON.stringify({ name: name.trim(), type: 'Writing', toolUsed: 'AI Writer Studio', previewText: editorContent.slice(0, 160) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error('project failed');
      setProjects(previous => [payload.project, ...previous]);
      setSelectedProjectId(payload.project.id);
    } catch {
      setGenerationError('The project could not be created. Your current work is preserved.');
    }
  };

  // ------------------------------------------
  // SELECTION FILTER
  // ------------------------------------------
  const getFilteredTemplates = () => {
    return allTemplates.filter(t => 
      t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      String(t.category || '').toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      (t.keywords || []).some(keyword => keyword.includes(templateSearchQuery.toLowerCase()))
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100 bg-slate-50/10 dark:bg-zinc-950/20 relative select-text">
      
      {/* Dynamic Upper Control Dashboard Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                GXA AI Writer Studio
              </h1>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-mono px-2 py-0.5 rounded-md">
                Gemini Multi-Drafting v3.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">High-fidelity distraction-free drafting studio with templates, /slash commands, inline editing, and context mapping.</p>
          </div>
        </div>

        {/* Quota Indicators */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          {!isPremium && usage && config && (
            <div className="hidden sm:flex items-center gap-3 bg-slate-100/60 dark:bg-zinc-900/60 p-2 rounded-xl border border-slate-200/40 dark:border-zinc-800">
              <div className="text-[10px] text-slate-400 text-left">
                <span className="block font-bold">Remaining Writes: <strong className="text-indigo-600 dark:text-indigo-400">{Math.max(0, (config.writer_generations_limit || 5) - (usage.writer_generations || 0))}</strong></span>
                <span className="block font-bold">Input limit: <strong className="text-indigo-600 dark:text-indigo-400">{config.writer_input_word_limit || 1500} words</strong></span>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black py-1 px-2.5 rounded-lg transition"
              >
                Upgrade Plan
              </button>
            </div>
          )}

          {/* Plan badge and Admin Button */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-600 dark:text-emerald-400 font-mono">
              Backend generation
            </span>
            {currentUser?.role === 'SuperAdmin' && (
              <button onClick={() => setShowAdminModal(true)} className="p-2 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-850 transition" title="Studio Configuration"><Settings className="h-4 w-4" /></button>
            )}
          </div>
        </div>
      </div>

      {generationError && (
        <div id="writer-generation-error" role="alert" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <span>{generationError}</span>
          <button onClick={() => setGenerationError('')} className="rounded-lg p-1 hover:bg-red-100 dark:hover:bg-red-900/40" aria-label="Dismiss writing error"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Main Studio Body Grid */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* Mobile Sub-Navigation Header Toggles */}
        <div className="md:hidden absolute top-0 left-0 right-0 z-20 flex bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold">
          <button 
            onClick={() => setMobileTab('sidebar')}
            className={`flex-1 py-2 text-center border-r border-slate-100 dark:border-zinc-800 ${mobileTab === 'sidebar' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
          >
            Templates & Tools
          </button>
          <button 
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-2 text-center border-r border-slate-100 dark:border-zinc-800 ${mobileTab === 'editor' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
          >
            Distraction-Free Editor
          </button>
          <button 
            onClick={() => setMobileTab('assistant')}
            className={`flex-1 py-2 text-center ${mobileTab === 'assistant' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
          >
            AI Assistant Params
          </button>
        </div>

        {/* ==========================================
            LEFT SIDEBAR: CATEGORIES & TEMPLATE MAP
            ========================================== */}
        <aside className={`border-r border-slate-200/50 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md flex flex-col shrink-0 transition-all duration-300 z-10 ${
          leftSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'
        } ${
          mobileTab === 'sidebar' ? 'flex w-full pt-10' : 'hidden md:flex'
        }`}>
          
          {/* Top category tabs control */}
          <div className="p-3 border-b border-slate-200/20 dark:border-zinc-800/20 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search templates & tools..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-zinc-950/40 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Scrollable Categories List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            
            {/* Template Categories Map */}
            {templateSearchQuery ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-2.5 block">Search Results</span>
                {getFilteredTemplates().map((tool) => (
                  <div key={tool.id} className={`flex w-full items-center rounded-lg text-xs font-bold transition ${activeTemplateId === tool.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'}`}>
                    <button onClick={() => handleSelectTemplate(tool)} className="min-w-0 flex-1 px-2.5 py-1.5 text-left" aria-label={`Open ${tool.name}. ${tool.requiredPlan === 'free' ? 'Free' : 'Premium'} template`}>
                      <span className="block truncate">{tool.name}</span><span className="text-[8px] font-semibold opacity-70">{tool.requiredPlan === 'free' ? 'Free' : tool.requiredPlan === 'pro_plus' ? 'Pro Plus' : 'Pro'}{tool.isNew ? ' · New' : ''}</span>
                    </button>
                    <button onClick={(e) => toggleFavoriteTemplate(tool.id, e)} className="m-1 rounded p-1 text-slate-400 transition hover:text-amber-500" aria-label={`${favoritesList.includes(tool.id) ? 'Remove' : 'Add'} ${tool.name} ${favoritesList.includes(tool.id) ? 'from' : 'to'} favorites`}><Bookmark className={`h-3 w-3 ${favoritesList.includes(tool.id) ? 'fill-amber-500 text-amber-500' : ''}`} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Favorites Segment */}
                {favoritesList.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-2.5 block">Starred Favorites</span>
                    {favoritesList.map((favId) => {
                      const tool = allTemplates.find(t => t.id === favId);
                      if (!tool) return null;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            handleSelectTemplate(tool);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                            activeTemplateId === tool.id 
                              ? 'bg-indigo-600 text-white' 
                              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'
                          }`}
                        >
                          <span className="min-w-0"><span className="block truncate">{tool.name}</span><span className="text-[8px] font-semibold opacity-70">{tool.requiredPlan === 'free' ? 'Free' : tool.requiredPlan === 'pro_plus' ? 'Pro Plus' : 'Pro'}</span></span>
                          <Bookmark className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Main grouped categories */}
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2.5 pb-1">
                        <Icon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                          {cat.name}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {cat.templates.map((tool) => (
                          <div key={tool.id} className={`flex w-full items-center rounded-lg text-xs font-bold transition ${activeTemplateId === tool.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'}`}>
                            <button onClick={() => handleSelectTemplate(tool)} className="min-w-0 flex-1 px-2.5 py-1.5 text-left" aria-label={`Open ${tool.name}. ${tool.requiredPlan === 'free' ? 'Free' : 'Premium'} template`}><span className="block truncate">{tool.name}</span><span className="text-[8px] font-semibold opacity-70">{tool.requiredPlan === 'free' ? 'Free' : tool.requiredPlan === 'pro_plus' ? 'Pro Plus' : 'Pro'}{tool.isNew ? ' · New' : ''}</span></button>
                            <button onClick={(e) => toggleFavoriteTemplate(tool.id, e)} className="m-1 shrink-0 rounded p-1 text-slate-400 transition hover:text-amber-500" aria-label={`${favoritesList.includes(tool.id) ? 'Remove' : 'Add'} ${tool.name} ${favoritesList.includes(tool.id) ? 'from' : 'to'} favorites`}><Bookmark className={`h-3 w-3 ${favoritesList.includes(tool.id) ? 'fill-amber-500 text-amber-500' : ''}`} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Prompt Library quick toggler */}
            <div className="border-t border-slate-100 dark:border-zinc-850 pt-3">
              <button 
                onClick={() => setShowPromptLibraryModal(true)}
                className="w-full py-2 px-3 text-xs font-bold rounded-lg border border-slate-200/60 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950/20 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-between gap-1 transition"
              >
                <span className="flex items-center gap-1.5"><Compass className="h-4 w-4 text-indigo-500" /> Prompt Library</span>
                <span className="bg-slate-200 dark:bg-zinc-800 text-[9px] px-1.5 py-0.5 rounded-md text-slate-500">{promptLibrary.length} saved</span>
              </button>
            </div>
          </div>

          {/* Project Allocation Selector */}
          <div className="p-3 border-t border-slate-200/20 dark:border-zinc-800/20 shrink-0 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono block">Assign to Project</span>
            <div className="flex gap-1">
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-zinc-950/60 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 font-semibold text-slate-700 dark:text-zinc-300"
              >
                <option value="proj-default">Default Writing Folder</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
              <button 
                onClick={handleCreateProject}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shrink-0"
                title="Create Project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Collapsible Left sidebar grip tab */}
        <button 
          onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
          className="hidden md:flex absolute left-0 top-1/2 z-30 h-10 w-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-r-lg shadow-md items-center justify-center text-slate-400 hover:text-indigo-500 transition-all duration-150"
          style={{ transform: `translateY(-50%) left: ${leftSidebarCollapsed ? '0px' : '320px'}` }}
        >
          {leftSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5 rotate-90" />}
        </button>

        {/* ==========================================
            CENTER COLUMN: THE DISTRACTION-FREE EDITOR
            ========================================== */}
        <main className={`flex-1 flex flex-col bg-slate-50/20 dark:bg-zinc-950/10 min-w-0 transition-all duration-300 ${
          mobileTab === 'editor' ? 'flex pt-10' : 'hidden md:flex'
        }`}>
          
          {/* Tiny header workspace title input */}
          <div className="p-3 border-b border-slate-200/40 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <FileSignature className="h-4 w-4 text-indigo-500 shrink-0" />
              <input 
                type="text"
                placeholder="Drafting Title (e.g. Q3 SaaS Business Plan)"
                value={editorTitle}
                onChange={(e) => {
                  setEditorTitle(e.target.value);
                  localStorage.setItem('gxa_writer_active_title', e.target.value);
                }}
                className="bg-transparent border-0 font-bold text-xs p-0 text-slate-900 dark:text-white focus:outline-none focus:ring-0 flex-1 placeholder-slate-400"
              />
            </div>

            {/* Undo/Redo & Import controls */}
            <div className="flex items-center gap-1">
              <button 
                onClick={triggerUndo} 
                disabled={undoStack.length === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-400 disabled:opacity-30 transition"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={triggerRedo} 
                disabled={redoStack.length === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-400 disabled:opacity-30 transition"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800 mx-1"></div>
              
              <label className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-850 text-slate-400 cursor-pointer transition flex items-center gap-1 text-[10px]" title="Import TXT/MD">
                <Upload className="h-3.5 w-3.5" /> Import
                <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Distraction free text zone */}
          <div className="flex-1 p-6 flex flex-col relative overflow-hidden">
            
            {/* Version diff preview banner if applicable */}
            {comparingVersionId && (
              <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <History className="h-4 w-4" /> Version Comparison Panel Active
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const ver = versions.find(v => v.id === comparingVersionId);
                      if (ver) restoreVersionSnapshot(ver.content);
                    }}
                    className="bg-indigo-600 text-white text-[10px] py-1 px-2 rounded-lg"
                  >
                    Restore This Version
                  </button>
                  <button 
                    onClick={() => setComparingVersionId(null)}
                    className="text-slate-400 hover:text-white text-[10px] py-1 px-2 rounded-lg"
                  >
                    Close Compare
                  </button>
                </div>
              </div>
            )}

            {(activeTemplate.outputType === 'outline' || ['blog-writer', 'article-writer', 'seo-article', 'research-paper'].includes(activeTemplateId)) && (
              <section className="mb-3 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50" aria-labelledby="writer-outline-heading">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 id="writer-outline-heading" className="text-xs font-black">Content outline</h2><p className="text-[10px] text-slate-500">Generate, review, and edit headings before drafting.</p></div>
                  <div className="flex gap-2"><button onClick={() => runAiGeneration('outline')} disabled={loading} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">{outlineSections.length ? 'Regenerate outline' : 'Generate outline'}</button><button onClick={() => setOutlineSections(previous => [...previous, 'New section'])} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold dark:border-zinc-700">Add section</button></div>
                </div>
                {outlineSections.length > 0 && <div className="mt-3 space-y-2">{outlineSections.map((section, index) => (
                  <div key={`${index}-${section}`} className="flex items-center gap-2">
                    <input aria-label={`Outline section ${index + 1}`} value={section} onChange={event => setOutlineSections(previous => previous.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-xs dark:border-zinc-700" />
                    <button aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => setOutlineSections(previous => { const next = [...previous]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded p-1 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5 rotate-180" /></button>
                    <button aria-label={`Move section ${index + 1} down`} disabled={index === outlineSections.length - 1} onClick={() => setOutlineSections(previous => { const next = [...previous]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} className="rounded p-1 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                    <button aria-label={`Delete section ${index + 1}`} onClick={() => setOutlineSections(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}<button onClick={() => handleEditorChange(outlineSections.map(section => `## ${section}`).join('\n\n'))} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white">Approve outline</button></div>}
              </section>
            )}

            {/* The Main Distraction Free Editor */}
            <div className="flex-1 flex flex-col relative min-h-[250px]">
              {editorContent || editorStarted ? (
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  onSelect={handleEditorSelect}
                  onKeyDown={handleEditorKeyDown}
                  className="w-full flex-1 bg-transparent p-4 text-xs font-sans text-slate-800 dark:text-zinc-200 border-0 focus:ring-0 focus:outline-none leading-relaxed resize-none overflow-y-auto selection:bg-indigo-500/30"
                  placeholder="Draft is compiling. You can type, highlight words for inline assistant instructions, or press '/' to change active templates..."
                />
              ) : (
                /* Elegant Empty State */
                <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white/40 dark:bg-zinc-900/10 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Create something amazing</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
                      Start typing inside this window, choose a creative template from the left bar, or press <kbd className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded border text-[10px] font-mono">/</kbd> for quick command injection.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditorTitle('Untitled document'); setEditorStarted(true); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                    >
                      Start Scratchpad
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTemplateId('blog-writer');
                        setMobileTab('sidebar');
                      }}
                      className="border border-slate-200 dark:border-zinc-800 text-[10px] font-bold py-1.5 px-3 rounded-lg text-slate-500"
                    >
                      Browse Templates
                    </button>
                  </div>
                </div>
              )}

              {/* Honest request state: the current provider does not expose true streaming. */}
              {loading && (
                <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 p-8 text-xs font-sans leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-zinc-200 overflow-y-auto border border-indigo-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-4 text-indigo-500 font-bold font-mono">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating your draft…</span>
                  </div>
                  <p className="text-slate-500 dark:text-zinc-400">Your form and existing document remain available if you stop this request.</p>
                </div>
              )}
            </div>

            {/* ==========================================
                FLOATING INLINE SELECTION CONTEXT MENU
                ========================================== */}
            {showInlineMenu && (
              <div 
                className="absolute z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-56 animate-in fade-in-50 duration-100"
                style={{ top: `${inlineMenuPosition.top}px`, left: `${inlineMenuPosition.left}px` }}
              >
                <div className="flex justify-between items-center px-2 py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold font-mono text-slate-400">Inline AI Selection</span>
                  <button onClick={() => setShowInlineMenu(false)} className="text-slate-400 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {['Rewrite', 'Improve', 'Simplify', 'Professional', 'Academic', 'Explain', 'Translate'].map((act) => (
                  <button
                    key={act}
                    onClick={() => {
                      runAiGeneration('inline', `Apply inline revision: ${act} standard content format.`);
                    }}
                    className="w-full text-left p-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100/60 dark:hover:bg-zinc-800 hover:text-indigo-500 transition"
                  >
                    {act} Selection
                  </button>
                ))}
              </div>
            )}

            {/* ==========================================
                SMART SLASH '/' COMMANDS DIALOG
                ========================================== */}
            {showSlashMenu && (
              <div 
                className="absolute z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-64 max-h-60 overflow-y-auto"
                style={{ top: `${slashMenuPosition.top}px`, left: `${slashMenuPosition.left}px` }}
              >
                <div className="flex justify-between items-center px-2 py-1 border-b border-slate-100 dark:border-zinc-800 shrink-0">
                  <span className="text-[9px] font-bold font-mono text-slate-400">Select Writing Template Command</span>
                  <button onClick={() => setShowSlashMenu(false)} className="text-slate-400 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-1 shrink-0">
                  <input 
                    type="text"
                    placeholder="Search command..."
                    value={slashSearchQuery}
                    onChange={(e) => setSlashSearchQuery(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-zinc-950 p-1 text-[11px] border-0 rounded"
                    autoFocus
                  />
                </div>
                {allTemplates
                  .filter(t => t.name.toLowerCase().includes(slashSearchQuery.toLowerCase()))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleApplySlashCommand(t.id)}
                      className="w-full text-left p-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-indigo-500 transition flex items-center justify-between"
                    >
                      <span>/{t.id}</span>
                      <span className="text-[10px] text-slate-400">{t.name}</span>
                    </button>
                  ))}
              </div>
            )}

          </div>

          {/* Core Footer Metadata Metrics */}
          <div className="p-3 border-t border-slate-200/40 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20 shrink-0 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span>Words: <strong className="text-slate-700 dark:text-white">{getWordCount(editorContent)}</strong></span>
              <span>Chars: <strong className="text-slate-700 dark:text-white">{getCharCount(editorContent)}</strong></span>
              <span>Read Time: <strong className="text-slate-700 dark:text-white">{getReadingTime(editorContent)} min</strong></span>
              <span>Lang: <strong className="text-indigo-400">{detectedLanguage}</strong></span>
            </div>

            <div className="flex items-center gap-3">
              {lastAutoSaved && (
                <span>Auto-saved: <strong className="text-emerald-500">{lastAutoSaved}</strong></span>
              )}
              {/* Output Actions copy/export triggers */}
              {editorContent && (
                <div className="flex items-center gap-1">
                  <button onClick={handleSaveDocument} disabled={saveStatus === 'saving'} className="inline-flex items-center gap-1 rounded p-1 hover:text-indigo-500 disabled:opacity-50" title="Save document">
                    {saveStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>{saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(editorContent);
                        setCopiedFormat('copy');
                        setTimeout(() => setCopiedFormat(null), 1200);
                      } catch {
                        setGenerationError('Copy failed. Select the document text and copy it manually.');
                      }
                    }}
                    className="hover:text-indigo-500 p-1 rounded"
                    title="Copy All"
                  >
                    {copiedFormat === 'copy' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => exportDocument('txt')} className="hover:text-indigo-400 p-1 rounded" title="Export Text">TXT</button>
                  <button onClick={() => exportDocument('md')} className="hover:text-indigo-400 p-1 rounded" title="Export Markdown">MD</button>
                  <button onClick={() => exportDocument('html')} className="hover:text-indigo-400 p-1 rounded" title="Export HTML">HTML</button>
                  {onSelectWorkspace && setSharedText && <button onClick={() => { setSharedText(editorContent); onSelectWorkspace('images'); }} className="inline-flex items-center gap-1 rounded p-1 hover:text-teal-500" title="Create a visual from this document"><ImageIcon className="h-3.5 w-3.5" />Visual</button>}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ==========================================
            RIGHT SIDEBAR: AI ASSISTANT PANEL
            ========================================== */}
        <aside className={`border-l border-slate-200/50 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md flex flex-col shrink-0 transition-all duration-300 z-10 ${
          rightSidebarCollapsed ? 'w-0 overflow-hidden border-l-0' : 'w-80'
        } ${
          mobileTab === 'assistant' ? 'flex w-full pt-10' : 'hidden md:flex'
        }`}>
          
          {/* Main Title settings */}
          <div className="p-4 border-b border-slate-200/20 dark:border-zinc-800/20 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              AI Creative Parameters
            </span>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded tracking-widest font-mono">
                {activeTemplate.category || 'Professional'}
              </span>
              <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">{activeTemplate.name}</h3>
            </div>
          </div>

          {/* Granular interactive configuration form fields */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Template Specific Description block */}
            <div className="bg-slate-100/60 dark:bg-zinc-950/40 p-2.5 rounded-xl text-[10px] text-slate-500 dark:text-zinc-400 border border-slate-200/30 dark:border-zinc-800">
              <span className="font-bold block text-slate-700 dark:text-zinc-200 mb-0.5">Focus Goal:</span>
              {activeTemplate.desc}
            </div>

            <fieldset className="space-y-3" aria-describedby={generationError ? 'writer-generation-error' : undefined}>
              <legend className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Template details</legend>
              {(activeTemplate.inputFields || []).map(field => {
                const value = templateValues[activeTemplateId]?.[field.id] || '';
                const update = (next: string) => {
                  setTemplateValues(previous => ({ ...previous, [activeTemplateId]: { ...(previous[activeTemplateId] || {}), [field.id]: next } }));
                  setFieldErrors(previous => { const nextErrors = { ...previous }; delete nextErrors[field.id]; return nextErrors; });
                };
                return (
                  <div key={field.id} className="space-y-1">
                    <label htmlFor={`writer-${field.id}`} className="text-[10px] font-bold text-slate-600 dark:text-zinc-300">{field.label}{field.required ? ' *' : ''}</label>
                    {field.type === 'textarea' ? (
                      <textarea id={`writer-${field.id}`} rows={field.id === 'topic' ? 4 : 3} value={value} maxLength={field.maxLength} placeholder={field.placeholder} onChange={event => update(event.target.value)} aria-invalid={Boolean(fieldErrors[field.id])} aria-describedby={fieldErrors[field.id] ? `writer-${field.id}-error` : undefined} className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950" />
                    ) : field.type === 'select' ? (
                      <select id={`writer-${field.id}`} value={value} onChange={event => update(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"><option value="">Select an option</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>
                    ) : (
                      <input id={`writer-${field.id}`} type={field.type === 'url' ? 'url' : 'text'} value={value} maxLength={field.maxLength} placeholder={field.placeholder} onChange={event => update(event.target.value)} aria-invalid={Boolean(fieldErrors[field.id])} aria-describedby={fieldErrors[field.id] ? `writer-${field.id}-error` : undefined} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950" />
                    )}
                    {field.description && <p className="text-[9px] text-slate-400">{field.description}</p>}
                    {fieldErrors[field.id] && <p id={`writer-${field.id}-error`} role="alert" className="text-[10px] font-semibold text-red-600">{fieldErrors[field.id]}</p>}
                  </div>
                );
              })}
            </fieldset>

            {(activeTemplate.category?.includes('Academic') || activeTemplate.id === 'citation-builder') && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Academic integrity: provide source details for factual claims. GXA preserves supplied citations and uses placeholders instead of inventing references.</p>
            )}

            {/* Purpose */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Purpose Direction</label>
              <select 
                value={purpose} 
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold"
              >
                <option value="inform">Informative (Neutral explanation)</option>
                <option value="persuade">Persuasive (Formulate arguments)</option>
                <option value="educate">Educate</option>
                <option value="explain">Explain</option>
                <option value="sell">Sell</option>
                <option value="entertain">Entertain</option>
              </select>
            </div>

            {/* Tone */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Brand & Tone Voice</label>
              <select 
                value={tone} 
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold"
              >
                <option value="professional">Professional (Corporate/Firm)</option>
                <option value="casual">Casual (Friendly/Playful)</option>
                <option value="empathetic">Empathetic (Compassionate)</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="confident">Confident</option>
                <option value="informative">Informative</option>
                <option value="creative">Creative</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            {/* Target Audience */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Target Audience</label>
              <select 
                value={audience} 
                onChange={(e) => setAudience(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold"
              >
                <option value="general">General Public</option>
                <option value="technical">Technical Engineers</option>
                <option value="executive">Board Executives / VCs</option>
                <option value="academic">University Researchers</option>
              </select>
            </div>

            {/* Target Language */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Language Translation</label>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Hinglish">Hinglish</option>
                <option value="Italian">Italian</option>
              </select>
            </div>

            {/* Length Mode */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Draft Length Target</label>
              <div className="grid grid-cols-3 gap-1 bg-white dark:bg-zinc-950 p-1 border border-slate-200 dark:border-zinc-800 rounded-lg">
                {['short', 'medium', 'long'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLengthMode(mode)}
                    className={`py-1 text-[10px] font-bold rounded-md capitalize transition ${
                      lengthMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity Index */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Creativity Temperature</label>
              <div className="grid grid-cols-3 gap-1 bg-white dark:bg-zinc-950 p-1 border border-slate-200 dark:border-zinc-800 rounded-lg">
                {['low', 'medium', 'high'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCreativity(mode)}
                    className={`py-1 text-[10px] font-bold rounded-md capitalize transition ${
                      creativity === mode ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Professional Level */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Professional Level</label>
              <select 
                value={professionalLevel} 
                onChange={(e) => setProfessionalLevel(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold"
              >
                <option value="entry">Entry Level Graduate</option>
                <option value="mid">Mid-Career Professional</option>
                <option value="senior">Senior Staff Architect</option>
                <option value="executive">Director / VP Executive</option>
              </select>
            </div>

            {/* Style & Reading level */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Writing Style Layout</label>
              <select 
                value={writingStyle} 
                onChange={(e) => setWritingStyle(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold"
              >
                <option value="expository">Expository (Facts & Figures)</option>
                <option value="descriptive">Descriptive (Visual detail)</option>
                <option value="persuasive">Persuasive (Impact arguments)</option>
                <option value="narrative">Narrative (Story flow)</option>
              </select>
            </div>

            {/* Target Keywords */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Focus SEO Keywords</label>
              <input 
                type="text"
                placeholder="e.g. edge cache, distributed, latency"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold placeholder:slate-400"
              />
            </div>

            {/* Custom Extra Directives */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Extra Topic Directives</label>
              <textarea 
                rows={4}
                placeholder="e.g. Include a short paragraph about Q2 security audits."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg p-2 font-semibold resize-none"
              />
            </div>

            {/* Version Snapshot quick check inside sidebar */}
            {versions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-850">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Recent Snapshot Drafts</span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {versions.map((ver) => (
                    <div 
                      key={ver.id}
                      className="p-1.5 rounded bg-slate-100/50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-850 text-[10px] flex items-center justify-between gap-1"
                    >
                      <button 
                        onClick={() => {
                          setComparingVersionId(ver.id);
                          setEditorContent(ver.content);
                        }}
                        className="truncate text-left font-bold text-slate-600 dark:text-zinc-300 flex-1 hover:text-indigo-500 transition"
                      >
                        {ver.title}
                      </button>
                      <button 
                        onClick={() => deleteVersionSnapshot(ver.id)}
                        className="p-1 hover:text-red-500 text-slate-400 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Trigger Generate controls button footer inside Right panel */}
          <div className="p-4 border-t border-slate-200/20 dark:border-zinc-800/20 bg-white/50 dark:bg-zinc-900/40 backdrop-blur shrink-0 space-y-2">
            
            {/* Generate & Post controls */}
            {loading ? (
              <button
                onClick={handleCancelGeneration}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/15"
              >
                <X className="h-4 w-4 shrink-0" /> Cancel Compile Generation
              </button>
            ) : (
              <button
                onClick={() => runAiGeneration('generate')}
                className="w-full bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 group"
              >
                <Sparkles className="h-4 w-4 shrink-0 group-hover:animate-pulse" /> Create Professional Draft
              </button>
            )}

            {/* Smart Post-Generation Refining controls */}
            {editorContent && !loading && (
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  onClick={() => runAiGeneration('continue')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] py-1.5 px-2 rounded-lg transition text-center border border-slate-200/40 dark:border-zinc-800"
                >
                  Continue Writing
                </button>
                <button 
                  onClick={() => runAiGeneration('improve')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] py-1.5 px-2 rounded-lg transition text-center border border-slate-200/40 dark:border-zinc-800"
                >
                  Improve Copy
                </button>
                <button 
                  onClick={() => runAiGeneration('expand')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] py-1.5 px-2 rounded-lg transition text-center border border-slate-200/40 dark:border-zinc-800"
                >
                  Expand Content
                </button>
                <button 
                  onClick={() => runAiGeneration('shorten')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] py-1.5 px-2 rounded-lg transition text-center border border-slate-200/40 dark:border-zinc-800"
                >
                  Make Concise
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Collapsible Right sidebar grip tab */}
        <button 
          onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
          className="hidden md:flex absolute right-0 top-1/2 z-30 h-10 w-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-l-lg shadow-md items-center justify-center text-slate-400 hover:text-indigo-500 transition-all duration-150"
          style={{ transform: `translateY(-50%) right: ${rightSidebarCollapsed ? '0px' : '320px'}` }}
        >
          {rightSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5 rotate-180" /> : <ChevronDown className="h-3.5 w-3.5 -rotate-90" />}
        </button>

      </div>

      {/* ==========================================
          PORTAL DIALOG: PROMPT LIBRARY MODAL
          ========================================== */}
      {showPromptLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowPromptLibraryModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Compass className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white">GXA AI Prompts Library</h2>
            </div>

            {/* Create Prompt form */}
            <div className="space-y-3 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200/40 dark:border-zinc-850 mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Save New Prompt Formula</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input 
                  type="text" 
                  placeholder="Title / Segment Category" 
                  value={newPromptTitle} 
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  className="sm:col-span-1 bg-white dark:bg-zinc-900 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg p-2"
                />
                <input 
                  type="text" 
                  placeholder="Detailed Prompt instructions..." 
                  value={newPromptText} 
                  onChange={(e) => setNewPromptText(e.target.value)}
                  className="sm:col-span-2 bg-white dark:bg-zinc-900 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg p-2"
                />
              </div>
              <button 
                onClick={handleSavePromptToLib}
                disabled={!newPromptTitle || !newPromptText}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition"
              >
                Add to Prompt Deck
              </button>
            </div>

            {/* List saved Prompts */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Saved Prompt Decks ({promptLibrary.length})</span>
              {promptLibrary.map((pr) => (
                <div 
                  key={pr.id}
                  className="p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 hover:border-indigo-500/30 transition flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">{pr.title}</span>
                    <button 
                      onClick={() => deleteSavedPrompt(pr.id)}
                      className="p-1 hover:text-red-500 text-slate-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed italic">"{pr.prompt}"</p>
                  <button 
                    onClick={() => {
                      setPromptInput(pr.prompt);
                      setShowPromptLibraryModal(false);
                    }}
                    className="self-start mt-1 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white text-[10px] font-bold py-1 px-2 rounded-lg transition"
                  >
                    Load into Assistant Prompt
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PORTAL DIALOG: SYSTEM ADMIN LIMITS MODAL
          ========================================== */}
      {showAdminModal && currentUser?.role === 'SuperAdmin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-indigo-500 animate-spin" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Workspace Admin Rules</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Engine Model</label>
                <select 
                  value={adminConfig.defaultModel} 
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, defaultModel: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-zinc-950 p-2 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Ultra Fast / Default)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Extreme Precision)</option>
                  <option value="claude-3-opus">Claude 3 Opus (Creative Prose)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Free Tier Generation Limit</label>
                <input 
                  type="number" 
                  value={adminConfig.maxFreeGenerations} 
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, maxFreeGenerations: Number(e.target.value) }))}
                  className="w-full bg-slate-100 dark:bg-zinc-950 p-2 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Max Word Output Count / request</label>
                <input 
                  type="number" 
                  value={adminConfig.maxFreeWordCount} 
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, maxFreeWordCount: Number(e.target.value) }))}
                  className="w-full bg-slate-100 dark:bg-zinc-950 p-2 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg"
                />
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-200/40 dark:border-zinc-850 text-[10px] text-slate-400 leading-relaxed">
                <span className="font-bold block text-slate-700 dark:text-zinc-200 mb-0.5">Admin Guidelines:</span>
                Changes apply only inside active container workspace context. Persistent changes require server-level environment modifications inside .env templates.
              </div>

              <button 
                onClick={() => setShowAdminModal(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition"
              >
                Save rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PORTAL DIALOG: UPGRADE EXPERIENCE PLATFORM
          ========================================== */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full shadow-2xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-6">
            
            {/* Background absolute decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>

            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Left promo segment */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg w-max tracking-widest font-mono">
                <Sparkles className="h-3 w-3" /> Unlock Professional Writes
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Create premium content without word boundaries.</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Draft research publications, academic reviews, corporate SLAs, and newsletters on the fly utilizing specialized local caches and Gemini 3.5 precision engines.
              </p>

              <div className="space-y-2 text-xs font-semibold">
                <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Unlimited drafts and /slash command allocations</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Long-form chapters and automated PDF uploads</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Advanced Pro Plus creativity tuning levels</span>
                </div>
              </div>
            </div>

            {/* Right pricing segment */}
            <div className="w-full md:w-64 bg-slate-50 dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200/40 dark:border-zinc-850 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Pro Subscription Plan</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">₹149</span>
                  <span className="text-xs text-slate-400 font-bold">/ month</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Save 40% utilizing promo GXA40 at final checkout portal.</p>
              </div>

              <div className="space-y-2 mt-6">
                <button 
                  onClick={() => {
                    if (onOpenUpgradeModal) onOpenUpgradeModal();
                    setShowUpgradeModal(false);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-indigo-600/10 text-center block"
                >
                  Upgrade to Pro Plus
                </button>
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full text-center py-2 text-[10px] text-slate-400 font-bold hover:text-slate-600"
                >
                  Continue Free Version limits
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
