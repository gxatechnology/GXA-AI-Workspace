import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  Loader2, 
  Smile, 
  Trash2, 
  Check, 
  X, 
  ArrowRight, 
  AlertTriangle,
  Info,
  Copy,
  ChevronRight,
  History,
  Settings,
  Download,
  HelpCircle,
  FileText,
  Upload,
  Undo,
  Redo,
  Save,
  Star,
  Lock,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  MessageSquare,
  Sparkle,
  Search,
  Eye,
  Settings2,
  Languages
} from 'lucide-react';
import { checkGrammar } from '../../utils/grammar';
import { 
  fetchSystemConfig, 
  fetchUsage, 
  isUserPremium, 
  SystemConfig, 
  UsageStats 
} from '../../utils/limits';
import { 
  SuggestionCard, 
  WritingScores, 
  ReadabilityMetrics, 
  ToneAnalysis, 
  HistoryItem, 
  AdminConfig 
} from './grammarTypes';
import { 
  computeDiff, 
  detectLanguage, 
} from './grammarUtils';

interface GrammarProps {
  sharedText?: string;
  setSharedText?: (text: string) => void;
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

export default function Grammar({ 
  sharedText = '', 
  setSharedText,
  currentUser,
  onOpenUpgradeModal
}: GrammarProps) {
  // Primary editor states
  const [localText, setLocalText] = useState<string>(sharedText || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [debouncingCheck, setDebouncingCheck] = useState<boolean>(false);
  
  // Real time checked suggestions and metrics
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [clarityAlerts, setClarityAlerts] = useState<Array<{ text: string; type: string; desc: string }>>([]);
  const [detectedLang, setDetectedLang] = useState<string>('English');
  
  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastPushedText = useRef<string>(localText);
  
  // Fix All state with restore-ability
  const [preFixAllText, setPreFixAllText] = useState<string | null>(null);
  const [showFixAllConfirm, setShowFixAllConfirm] = useState<boolean>(false);

  // Auto Save status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive panels/drawers
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [rightPanelTab, setRightPanelTab] = useState<'suggestions' | 'analytics' | 'compare'>('suggestions');
  const [selectedLearnMore, setSelectedLearnMore] = useState<SuggestionCard | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState<string>('');

  // UI status states
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const analysisControllerRef = useRef<AbortController | null>(null);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [dictionary, setDictionary] = useState<string[]>([]);

  // Private analytics (local state logs)
  const [analytics, setAnalytics] = useState({
    checksRun: 0,
    acceptedCount: 0,
    ignoredCount: 0,
    exportCount: 0,
    copyCount: 0,
    avgScore: 100
  });

  // Error handle state
  const [errorState, setErrorState] = useState<'no-internet' | 'unsupported-language' | 'unsupported-file' | 'limit-exceeded' | 'large-file' | 'ai-unavailable' | 'timeout' | null>(null);

  // Admin Config State
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({
    grammarRulesEnabled: true,
    premiumRulesEnabled: true,
    suggestionLimit: 15,
    dailyLimit: 10,
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Hindi'],
    featureFlags: {
      realTimeChecking: true,
      toneAnalysis: true,
      readabilityScore: true,
      compareMode: true
    }
  });

  // Default Writing Scores
  const [scores, setScores] = useState<WritingScores>({
    overall: 100,
    grammar: 100,
    spelling: 100,
    clarity: 100,
    readability: 100,
    tone: 100,
    conciseness: 100,
    professionalism: 100
  });

  // Default Readability Metrics
  const [readability, setReadability] = useState<ReadabilityMetrics>({
    readingLevel: 'N/A',
    readingTime: 0,
    sentenceLength: 0,
    wordLength: 0,
    paragraphDensity: 'N/A'
  });

  // Default Tone Analysis
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis>({
    dominantTone: 'Friendly',
    scores: {
      Professional: 50,
      Friendly: 50,
      Formal: 50,
      Casual: 50,
      Confident: 50,
      Empathetic: 50,
      Persuasive: 50,
      Academic: 50,
      Business: 50
    }
  });

  // Limits tracking states
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // Premium Lock feature list
  const premiumFeaturesList = [
    { name: 'Advanced Style Diagnostics', desc: 'Flow and stylistic upgrades' },
    { name: 'Vocabulary Enhancement', desc: 'Contextual synonym injections' },
    { name: 'Professional Rewrite Mode', desc: 'Refactor for boardroom elegance' },
    { name: 'Academic Rewrite Mode', desc: 'Scholarly precision formatting' },
    { name: 'Business Tone Restructuring', desc: 'Client-focused confidence tune' },
    { name: 'Sentence Structural Variety', desc: 'Syntax diversity refinement' }
  ];

  // Load limits and configurations
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
      console.error('Failed to load limits:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadLimitsData();
    // Load local history from localStorage
    const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
    const savedHistory = localStorage.getItem('gxa_grammar_history');
    if (savedHistory && user && !user.guest && user.role !== 'Guest') {
      try {
        setHistoryItems(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }

    // Load admin config if saved
    const savedAdmin = localStorage.getItem('gxa_grammar_admin_config');
    if (savedAdmin) {
      try {
        setAdminConfig(JSON.parse(savedAdmin));
      } catch (e) {}
    }
  }, [currentUser]);

  // Sync sharedText on load
  useEffect(() => {
    if (sharedText && !localText) {
      setLocalText(sharedText);
      lastPushedText.current = sharedText;
    }
  }, [sharedText]);

  // Counts
  const charCount = localText.length;
  const wordCount = localText.trim() === '' ? 0 : localText.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = localText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphCount = localText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const computedReadingTimeSec = Math.max(1, Math.ceil((wordCount / 200) * 60));

  // Determine limits
  const wordLimit = isPremium ? Infinity : ((config?.paraphrase_word_limit || 125) * 4);
  const isExceededLimit = !isPremium && wordLimit !== Infinity && wordCount > wordLimit;
  const dailyLimit = isPremium ? Infinity : (config?.grammar_corrections_limit ?? 5);
  const remainingUses = isPremium ? Infinity : Math.max(0, dailyLimit - (usage?.grammar_corrections || 0));
  const isDailyExceeded = !isPremium && remainingUses <= 0;

  // Real-time automatic check trigger (typing debounce)
  useEffect(() => {
    if (!isPremium || !adminConfig.featureFlags.realTimeChecking) return;
    if (!localText.trim()) {
      setSuggestions([]);
      setClarityAlerts([]);
      return;
    }
    
    // Auto save triggers
    setAutoSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');
      // Save current draft
      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      if (user && !user.guest && user.role !== 'Guest') localStorage.setItem('gxa_grammar_draft', localText);
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 1500);

    // Debounced real-time analysis
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setDebouncingCheck(true);
    typingTimerRef.current = setTimeout(() => {
      setDebouncingCheck(false);
      triggerAnalysis(true);
    }, 2000);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [localText, isPremium, adminConfig.featureFlags.realTimeChecking]);

  // Main diagnostic trigger
  const triggerAnalysis = async (isAutoRun = false) => {
    if (!localText.trim() || loading) return;
    if (isExceededLimit || isDailyExceeded) {
      setErrorState('limit-exceeded');
      return;
    }
    
    // Limit large file sizes locally
    if (charCount > 35000) {
      setErrorState('large-file');
      return;
    }

    if (!isAutoRun) {
      setLoading(true);
    }
    setErrorState(null);

    try {
      const languageText = detectLanguage(localText);
      setDetectedLang(languageText);

      // Verify simulated network condition or AI availability
      if (!navigator.onLine) {
        setErrorState('no-internet');
        setLoading(false);
        return;
      }

      // Check if language is unsupported in admin panel
      if (!adminConfig.supportedLanguages.includes(languageText) && languageText !== 'English') {
        setErrorState('unsupported-language');
        setLoading(false);
        return;
      }

      analysisControllerRef.current?.abort();
      const controller = new AbortController();
      analysisControllerRef.current = controller;
      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      const version = documentVersion + 1;
      setDocumentVersion(version);
      const enabledCategories = isPremium
        ? ['Grammar', 'Spelling', 'Punctuation', 'Capitalization', 'Sentence Structure', 'Agreement', 'Tense', 'Articles', 'Prepositions', 'Pronouns', 'Word Choice', 'Clarity', 'Fluency', 'Conciseness', 'Style', 'Tone', 'Formality', 'Readability', 'Vocabulary', 'Repetition', 'Passive Voice', 'Redundancy', 'Wordiness', 'Consistency', 'Formatting']
        : ['Grammar', 'Spelling', 'Punctuation', 'Capitalization'];
      const parsedResult = await checkGrammar({
        text: localText,
        language: languageText.startsWith('Hindi') ? 'Hindi' : languageText === 'English' ? 'English' : languageText,
        categories: enabledCategories,
        ignoredRules: [],
        dictionary,
        mode: isAutoRun ? 'realtime' : 'manual',
        requestId: crypto.randomUUID(),
        documentVersion: version,
        goals: { audience: 'General', formality: 'Neutral', intent: 'Inform', domain: 'General' },
      }, user?.email || 'guest', controller.signal);

      setScores(parsedResult.scores);
      setReadability(parsedResult.readability);
      setToneAnalysis(previous => ({ ...previous, dominantTone: parsedResult.tone?.dominantTone || 'Neutral', scores: parsedResult.tone?.scores || previous.scores }));
      setClarityAlerts([]);
      const formatted: SuggestionCard[] = parsedResult.issues.map((issue: any) => ({
        id: issue.id,
        original: issue.originalText,
        suggested: issue.replacements[0],
        replacementOptions: issue.replacements,
        type: issue.category,
        desc: issue.title,
        explanation: issue.explanation,
        isPremium: issue.premium,
        startOffset: issue.startOffset,
        endOffset: issue.endOffset,
        severity: issue.severity,
        ruleId: issue.ruleId,
        confidence: issue.confidence,
      }));
      setSuggestions(formatted);
      setHasAnalysis(true);
      setUsage(previous => ({ ...(previous || { paraphrases: 0, chats: 0, pdf_uploads: 0, ocr_pages: 0, grammar_corrections: 0 }), grammar_corrections: parsedResult.usage.grammar_corrections }));

      // Add to internal history
      const historyItem: HistoryItem = {
        id: `h-${Date.now()}`,
        timestamp: Date.now(),
        originalText: localText,
        correctedText: '', // Filled if user does corrections or compares
        score: parsedResult.scores.overall,
        isFavorite: false,
        suggestionsCount: parsedResult.issues.length
      };

      setHistoryItems(prev => {
        const next = [historyItem, ...prev].slice(0, 30);
        if (user && !user.guest && user.role !== 'Guest') localStorage.setItem('gxa_grammar_history', JSON.stringify(next));
        return next;
      });

      // Track analytics
      setAnalytics(prev => ({
        ...prev,
        checksRun: prev.checksRun + 1,
        avgScore: Math.round((prev.avgScore * prev.checksRun + parsedResult.scores.overall) / (prev.checksRun + 1))
      }));

    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setErrorState('ai-unavailable');
    } finally {
      analysisControllerRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowHistoryModal(false); setShowSettingsModal(false); setShowHelpModal(false);
        setShowUpgradeModal(false); setSelectedLearnMore(null); setShowFixAllConfirm(false);
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault(); triggerAnalysis();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [localText, loading, isExceededLimit, isDailyExceeded]);

  // Undo/Redo stack pushes
  const pushToHistoryStack = (text: string) => {
    if (text === lastPushedText.current) return;
    setUndoStack(prev => [...prev, lastPushedText.current].slice(-25));
    setRedoStack([]);
    lastPushedText.current = text;
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, localText]);
    setLocalText(previous);
    lastPushedText.current = previous;
    if (setSharedText) setSharedText(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextText = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, localText]);
    setLocalText(nextText);
    lastPushedText.current = nextText;
    if (setSharedText) setSharedText(nextText);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    if (setSharedText) setSharedText(val);
    pushToHistoryStack(val);
    setHasAnalysis(false);
  };

  // File loading
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileContent(file);
  };

  const readFileContent = (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop();
    if (!extension || !['txt', 'md'].includes(extension)) {
      setErrorState('unsupported-file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorState('large-file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLocalText(content);
        if (setSharedText) setSharedText(content);
        pushToHistoryStack(content);
      }
    };
    reader.onerror = () => setErrorState('large-file');
    reader.readAsText(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFileContent(file);
    }
  };

  // Suggestion actions
  const handleAcceptSuggestion = (id: string, original: string, suggested: string) => {
    const issue = suggestions.find(item => item.id === id);
    const start = issue?.startOffset;
    const end = issue?.endOffset;
    if (typeof start === 'number' && typeof end === 'number' && localText.slice(start, end) === original) {
      const newText = localText.slice(0, start) + suggested + localText.slice(end);
      setLocalText(newText);
      if (setSharedText) setSharedText(newText);
      pushToHistoryStack(newText);
      setHasAnalysis(false);
    } else setErrorState('ai-unavailable');
    setSuggestions(prev => prev.filter(s => s.id !== id));
    setAnalytics(prev => ({ ...prev, acceptedCount: prev.acceptedCount + 1 }));
  };

  const handleIgnoreSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
    setAnalytics(prev => ({ ...prev, ignoredCount: prev.ignoredCount + 1 }));
  };

  // Fix All functions with confirmation and undo stack support
  const handleFixAllClick = () => {
    if (suggestions.length === 0) return;
    setShowFixAllConfirm(true);
  };

  const handleConfirmFixAll = () => {
    setPreFixAllText(localText);
    let tempText = localText;
    const safeIssues = suggestions
      .filter(issue => typeof issue.startOffset === 'number' && typeof issue.endOffset === 'number' && (issue.confidence ?? 0) >= 0.8 && ['Grammar', 'Spelling', 'Punctuation', 'Capitalization', 'Agreement', 'Tense', 'Articles', 'Prepositions', 'Pronouns'].includes(issue.type))
      .sort((a, b) => (b.startOffset || 0) - (a.startOffset || 0));
    safeIssues.forEach(issue => {
      const start = issue.startOffset!; const end = issue.endOffset!;
      if (tempText.slice(start, end) === issue.original) tempText = tempText.slice(0, start) + issue.suggested + tempText.slice(end);
    });
    setLocalText(tempText);
    if (setSharedText) setSharedText(tempText);
    pushToHistoryStack(tempText);
    setSuggestions([]);
    setShowFixAllConfirm(false);
    
    setHasAnalysis(false);
  };

  const handleUndoFixAll = () => {
    if (preFixAllText === null) return;
    setLocalText(preFixAllText);
    if (setSharedText) setSharedText(preFixAllText);
    pushToHistoryStack(preFixAllText);
    setPreFixAllText(null);
    triggerAnalysis();
  };

  // File exports
  const handleExport = (format: 'txt' | 'md' | 'docx' | 'pdf') => {
    setAnalytics(prev => ({ ...prev, exportCount: prev.exportCount + 1 }));
    let filename = `grammar-checked-document.${format}`;
    let mimeType = 'text/plain';
    let dataContent = localText;

    if (format === 'md') {
      dataContent = `# Grammar Checker Revision\n\n${localText}`;
      mimeType = 'text/markdown';
    } else if (format === 'docx' || format === 'pdf') {
      dataContent = `REVISION REPORT\nOriginal score: ${scores.overall}%\nDominant Tone: ${toneAnalysis.dominantTone}\n\nDocument Body:\n${localText}`;
    }

    const blob = new Blob([dataContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClipboardCopy = async () => {
    try {
      await navigator.clipboard.writeText(localText);
      setCopied(true);
      setAnalytics(prev => ({ ...prev, copyCount: prev.copyCount + 1 }));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setErrorState('ai-unavailable');
    }
  };

  const addToDictionary = (word: string, issueId: string) => {
    const entry = word.trim();
    if (!entry || entry.length > 100) return;
    setDictionary(current => current.some(item => item === entry) ? current : [...current, entry]);
    handleIgnoreSuggestion(issueId);
  };

  const focusIssue = (issue: SuggestionCard) => {
    if (typeof issue.startOffset !== 'number' || typeof issue.endOffset !== 'number') return;
    editorRef.current?.focus();
    editorRef.current?.setSelectionRange(issue.startOffset, issue.endOffset);
  };

  // Local Save Actions
  const handleSaveToProject = async () => {
    const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
    if (!user || user.guest || user.role === 'Guest') {
      alert('Sign in to save this document. Your text will remain in the editor.');
      return;
    }
    const response = await fetch('/api/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.email}` },
      body: JSON.stringify({ name: `Grammar revision - ${localText.slice(0, 30) || 'Untitled'}`, type: 'Grammar Document', content: localText, toolUsed: 'Grammar Checker', score: hasAnalysis ? scores.overall : null }),
    });
    if (!response.ok) alert('The document could not be saved. Your text remains available.');
    else alert('Document saved to your workspace.');
  };

  // Toggle Favorite/Delete History
  const toggleFavoriteHistory = (id: string) => {
    setHistoryItems(prev => {
      const next = prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item);
      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      if (user && !user.guest && user.role !== 'Guest') localStorage.setItem('gxa_grammar_history', JSON.stringify(next));
      return next;
    });
  };

  const deleteHistoryItem = (id: string) => {
    setHistoryItems(prev => {
      const next = prev.filter(item => item.id !== id);
      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      if (user && !user.guest && user.role !== 'Guest') localStorage.setItem('gxa_grammar_history', JSON.stringify(next));
      return next;
    });
  };

  const restoreHistoryVersion = (text: string) => {
    setLocalText(text);
    if (setSharedText) setSharedText(text);
    pushToHistoryStack(text);
    setShowHistoryModal(false);
  };

  // Admin panel rule toggles
  const saveAdminConfig = (updated: AdminConfig) => {
    setAdminConfig(updated);
    localStorage.setItem('gxa_grammar_admin_config', JSON.stringify(updated));
  };

  // Highlight word level diff
  const diffChunks = computeDiff(preFixAllText || '', localText);
  const issueCategories = ['All', ...Array.from(new Set(suggestions.map(issue => issue.type)))];
  const visibleSuggestions = activeCategory === 'All' ? suggestions : suggestions.filter(issue => issue.type === activeCategory);
  const safeFixCount = suggestions.filter(issue => (issue.confidence ?? 0) >= 0.8 && ['Grammar', 'Spelling', 'Punctuation', 'Capitalization', 'Agreement', 'Tense', 'Articles', 'Prepositions', 'Pronouns'].includes(issue.type)).length;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 pb-20 text-slate-800 dark:text-zinc-100 flex flex-col font-sans select-text">
      
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 py-6 border-b border-slate-200/60 dark:border-zinc-800/60">
        <div>
          <h1 id="grammar-title" className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-teal-500" /> Grammar Checker
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Improve grammar, spelling, clarity and readability.</p>
        </div>

        {/* Top Right Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowHistoryModal(true)} 
            aria-label="View history and previous versions"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button 
            onClick={() => setShowSettingsModal(true)} 
            aria-label="Grammar system settings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Export Dropdown toggle */}
          <div className="relative group">
            <button 
              aria-label="Export revision"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-1 w-32 shadow-lg z-20">
              <button onClick={() => handleExport('txt')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Plain Text (TXT)</button>
              <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Markdown (MD)</button>
              <button onClick={() => handleExport('docx')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Word (DOCX)</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition">Acrobat (PDF)</button>
            </div>
          </div>

          <button 
            onClick={() => setShowHelpModal(true)} 
            aria-label="Get help and usage instructions"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Help</span>
          </button>

          {/* Protected admin control */}
          {currentUser?.role === 'SuperAdmin' && <button
            onClick={() => setShowAdminPanel(!showAdminPanel)} 
            aria-label="Toggle admin diagnostics"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${showAdminPanel ? 'bg-teal-500/10 text-teal-600' : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
          >
            <Settings2 className="h-4 w-4" />
            <span>Admin</span>
          </button>}
        </div>
      </header>

      {/* Admin Panel Tab overlay block */}
      {currentUser?.role === 'SuperAdmin' && showAdminPanel && (
        <div className="mt-4 p-5 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 rounded-2xl text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <Sliders className="h-4 w-4" /> Rule Configurations & Core Admin Parameters
            </h3>
            <button onClick={() => setShowAdminPanel(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Rule selections */}
            <div className="space-y-3">
              <span className="font-bold text-slate-500 block uppercase tracking-wider">Active Rulesets</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={adminConfig.grammarRulesEnabled} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, grammarRulesEnabled: e.target.checked })} 
                />
                <span>Enable Realtime Grammar Engine Rules</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={adminConfig.premiumRulesEnabled} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, premiumRulesEnabled: e.target.checked })} 
                />
                <span>Enable Premium Audit Audits</span>
              </label>
            </div>

            {/* Threshold limits */}
            <div className="space-y-3">
              <span className="font-bold text-slate-500 block uppercase tracking-wider">Operational Limits</span>
              <div className="flex items-center justify-between">
                <span>Max Suggestion Display:</span>
                <input 
                  type="number" 
                  value={adminConfig.suggestionLimit} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, suggestionLimit: Number(e.target.value) })}
                  className="w-16 p-1 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Daily Free Corrections Limit:</span>
                <input 
                  type="number" 
                  value={adminConfig.dailyLimit} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, dailyLimit: Number(e.target.value) })}
                  className="w-16 p-1 border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            {/* Custom flags */}
            <div className="space-y-2">
              <span className="font-bold text-slate-500 block uppercase tracking-wider">Feature Flags</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={adminConfig.featureFlags.realTimeChecking} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, featureFlags: { ...adminConfig.featureFlags, realTimeChecking: e.target.checked } })}
                />
                <span>Real-time checking (debounce style)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={adminConfig.featureFlags.toneAnalysis} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, featureFlags: { ...adminConfig.featureFlags, toneAnalysis: e.target.checked } })}
                />
                <span>Dominant Tone Meter</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={adminConfig.featureFlags.compareMode} 
                  onChange={(e) => saveAdminConfig({ ...adminConfig, featureFlags: { ...adminConfig.featureFlags, compareMode: e.target.checked } })}
                />
                <span>Interactive Compare View Tab</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Error Handling block */}
      {errorState && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center text-left">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {errorState === 'no-internet' && 'Connectivity Lost'}
                {errorState === 'unsupported-language' && 'Unsupported Language Detected'}
                {errorState === 'unsupported-file' && 'Unsupported File Type'}
                {errorState === 'limit-exceeded' && 'Word or Corrections Limit Exceeded'}
                {errorState === 'large-file' && 'Document Too Voluminous'}
                {errorState === 'ai-unavailable' && 'AI Auditing Engine Unreachable'}
                {errorState === 'timeout' && 'Request Timeout'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {errorState === 'no-internet' && 'Please verify your internet connection settings and try again.'}
                {errorState === 'unsupported-language' && `The grammar engine detected ${detectedLang}, which is currently restricted in Admin configs.`}
                {errorState === 'unsupported-file' && 'Upload a TXT or Markdown file. Your existing document is unchanged.'}
                {errorState === 'limit-exceeded' && 'You have reached the free processing threshold. Please upgrade to Pro to unlock unlimited usage.'}
                {errorState === 'large-file' && 'The document exceeds 35,000 characters. Please break it into smaller chapters.'}
                {errorState === 'ai-unavailable' && 'The network model could not finalize this audit. Please trigger retry manually.'}
                {errorState === 'timeout' && 'The remote server took too long. Let us retry.'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => triggerAnalysis()}
            className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Subtle typing animation / debounce loader (Never Blocks Typing) */}
      {debouncingCheck && (
        <div className="w-full bg-slate-50 dark:bg-zinc-900 h-0.5 relative overflow-hidden mt-1.5">
          <div className="absolute top-0 left-0 bg-teal-500 h-full w-1/3 animate-ping" />
        </div>
      )}

      {/* Workspace central body layout (70/30 Desktop, 65/35 Tablet, Mobile Stacked) */}
      <main className="mt-6 flex flex-col md:flex-row gap-6 items-stretch w-full">
        
        {/* LEFT COLUMN: Main Editor Area (70% Desktop / 65% Tablet) */}
        <section className="w-full md:w-[65%] lg:w-[70%] shrink-0 flex flex-col space-y-4">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 bg-white dark:bg-zinc-900 border ${isDragOver ? 'border-teal-500 bg-teal-50/5' : 'border-slate-200 dark:border-zinc-800'} rounded-2xl p-5 flex flex-col shadow-xs transition duration-200 min-h-[460px] relative text-left`}
          >
            {/* Action panel header for Editor */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wide uppercase">Workspace Editor</span>
                {autoSaveStatus === 'saving' && (
                  <span className="text-[10px] text-teal-600 bg-teal-500/10 px-1.5 py-0.5 rounded animate-pulse">saving...</span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Auto-saved
                  </span>
                )}
              </div>

              {/* Undo / Redo controls */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleUndo} 
                  disabled={undoStack.length === 0}
                  title="Undo change"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 disabled:opacity-30 transition"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button 
                  onClick={handleRedo} 
                  disabled={redoStack.length === 0}
                  title="Redo change"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 disabled:opacity-30 transition"
                >
                  <Redo className="h-4 w-4" />
                </button>
                {loading ? <button type="button" onClick={() => analysisControllerRef.current?.abort()} className="ml-2 min-h-11 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50">Stop</button> : <button type="button" onClick={() => triggerAnalysis()} disabled={!localText.trim() || isExceededLimit || isDailyExceeded} className="ml-2 min-h-11 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><CheckSquare className="mr-1 inline h-4 w-4" />Check Writing</button>}
              </div>
            </div>

            {/* Main Interactive Distraction-Free Textarea */}
            <div className="flex-1 relative flex flex-col min-h-[300px]">
              {localText.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 pointer-events-none p-6">
                  <BookOpen className="h-10 w-10 text-slate-300 dark:text-zinc-700" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400">No text yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Start typing or paste your content. Drag and drop any TXT file here to parse instantly.</p>
                  </div>
                </div>
              ) : null}

              <textarea
                ref={editorRef}
                value={localText}
                onChange={handleEditorChange}
                className="w-full flex-1 bg-transparent border-0 outline-none focus:ring-0 text-slate-800 dark:text-zinc-100 text-sm md:text-base leading-relaxed resize-none h-full"
                placeholder="Compose your draft, paste snippets, or upload files to refine composition..."
                aria-label="Grammar text editor input"
              />
            </div>

            {/* Bottom stats indicators bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/60 flex flex-wrap gap-4 justify-between items-center text-[11px] font-medium text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5 text-slate-400" /> {detectedLang}</span>
                <span>{charCount} Characters</span>
                <span>{wordCount} Words</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> {computedReadingTimeSec}s Read</span>
              </div>

              <div className="flex items-center gap-2">
                {preFixAllText && (
                  <button 
                    onClick={handleUndoFixAll}
                    className="text-amber-600 dark:text-amber-400 hover:underline text-[10px] font-bold"
                  >
                    Undo Fix All
                  </button>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".txt,.md" 
                  className="hidden" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-zinc-200 transition"
                  title="Upload plain text file"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload File
                </button>
                
                <button 
                  onClick={handleClipboardCopy} 
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-zinc-200 transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>Copy</span>
                </button>

                <button 
                  onClick={handleSaveToProject}
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-zinc-200 transition"
                  title="Save current copy to GXA project history"
                >
                  <Save className="h-3.5 w-3.5" /> Save Draft
                </button>
              </div>
            </div>
          </div>

          {/* Real Time Core Metric Score widgets below Editor (Spacious design) */}
          {hasAnalysis ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Writing score from the latest completed check">
            
            {/* Overall Quality dial */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-xs">
              <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                <svg className="absolute top-0 left-0 h-full w-full rotate-[-90deg]">
                  <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="3" fill="none" className="dark:stroke-zinc-800" />
                  <circle cx="24" cy="24" r="20" stroke="#14b8a6" strokeWidth="3" fill="none" 
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - scores.overall / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="text-xs font-black text-slate-800 dark:text-white">{scores.overall}</span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Overall Quality</span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Prose Meter</span>
              </div>
            </div>

            {/* Grammar meter */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-4 text-left shadow-xs">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">
                <span>Grammar</span>
                <span className="text-slate-800 dark:text-zinc-200">{scores.grammar}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full transition-all duration-500" style={{ width: `${scores.grammar}%` }} />
              </div>
            </div>

            {/* Spelling accuracy */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-4 text-left shadow-xs">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">
                <span>Spelling</span>
                <span className="text-slate-800 dark:text-zinc-200">{scores.spelling}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${scores.spelling}%` }} />
              </div>
            </div>

            {/* Readability Score */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-4 text-left shadow-xs">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">
                <span>Readability</span>
                <span className="text-slate-800 dark:text-zinc-200">{scores.readability}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${scores.readability}%` }} />
              </div>
            </div>

          </div> : <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">Writing scores will appear after a completed check.</div>}
        </section>

        {/* RIGHT COLUMN: Interactive Suggestions & Score Insights (30% Desktop / 35% Tablet) */}
        <section className="w-full md:w-[35%] lg:w-[30%] shrink-0 flex flex-col space-y-4">
          
          {/* Sub tabs inside suggestions sidebar */}
          <div className="bg-slate-100/70 dark:bg-zinc-900/40 p-1.5 border border-slate-200/60 dark:border-zinc-800/80 rounded-xl flex">
            <button 
              onClick={() => setRightPanelTab('suggestions')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${rightPanelTab === 'suggestions' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Corrections
            </button>
            <button 
              onClick={() => setRightPanelTab('analytics')}
              disabled={!hasAnalysis}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${rightPanelTab === 'analytics' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Writing Insights
            </button>
            {adminConfig.featureFlags.compareMode && (
              <button 
                onClick={() => setRightPanelTab('compare')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${rightPanelTab === 'compare' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Compare
              </button>
            )}
          </div>

          {/* TAB 1: SUGGESTION CARDS PANEL */}
          {rightPanelTab === 'suggestions' && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-xs h-[calc(100vh-18rem)] md:h-[500px]">
              
              {/* Header with Fix All toggle */}
              <div className="bg-slate-50/50 dark:bg-zinc-950 px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-teal-500" /> AI Corrections
                </span>
                
                {suggestions.length > 0 ? (
                  <button 
                    onClick={handleFixAllClick}
                    disabled={safeFixCount === 0}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition"
                  >
                    Fix All Safe ({safeFixCount})
                  </button>
                ) : (
                  <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">{hasAnalysis ? 'No issues found' : 'Not checked'}</span>
                )}
              </div>

              {/* Confirmation Inline Modal */}
              {showFixAllConfirm && (
                <div className="p-3 bg-teal-500/10 border-b border-teal-500/20 text-left space-y-2 shrink-0">
                  <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400">Apply all suggestions at once? This modifies your active writing canvas.</p>
                  <div className="flex gap-2">
                    <button onClick={handleConfirmFixAll} className="bg-teal-600 text-white font-bold text-[9px] px-2.5 py-1 rounded">Yes, Apply</button>
                    <button onClick={() => setShowFixAllConfirm(false)} className="bg-slate-200 dark:bg-zinc-800 text-slate-600 font-bold text-[9px] px-2.5 py-1 rounded">Cancel</button>
                  </div>
                </div>
              )}

              {/* Suggestions Cards list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-left">
                {suggestions.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Correction category filters">
                  {issueCategories.map(category => <button type="button" key={category} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${activeCategory === category ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{category}</button>)}
                </div>}
                {suggestions.length > 0 ? (
                  visibleSuggestions.map((sug) => (
                    <div 
                      key={sug.id} 
                      className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl space-y-2 relative"
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          sug.type === 'Spelling' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' :
                          sug.type === 'Grammar' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                          sug.type === 'Punctuation' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600' :
                          'bg-blue-50 dark:bg-blue-950/20 text-blue-600'
                        }`}>
                          {sug.type}
                        </span>
                        
                        <button 
                          onClick={() => handleIgnoreSuggestion(sug.id)}
                          className="text-slate-400 hover:text-slate-600 transition"
                          title="Ignore Suggestion"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs flex-wrap">
                          <span className="line-through text-rose-500 bg-rose-50 dark:bg-rose-950/10 px-1 rounded">{sug.original}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/10 px-1 rounded">{sug.suggested}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-sans">{sug.desc}</p>
                      </div>

                      <div className="flex gap-2 pt-1.5">
                        <button
                          onClick={() => handleAcceptSuggestion(sug.id, sug.original, sug.suggested)}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] py-1 rounded transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => setSelectedLearnMore(sug)}
                          className="px-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 hover:bg-slate-200 text-[10px] font-bold rounded transition"
                        >
                          Learn More
                        </button>
                        <button type="button" onClick={() => focusIssue(sug)} className="px-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 hover:bg-slate-200 text-[10px] font-bold rounded transition">Locate</button>
                        {sug.type === 'Spelling' && <button type="button" onClick={() => addToDictionary(sug.original, sug.id)} className="px-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 hover:bg-slate-200 text-[10px] font-bold rounded transition">Add to dictionary</button>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-10">
                    <Smile className="h-8 w-8 text-slate-300 dark:text-zinc-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-600 dark:text-zinc-400">{hasAnalysis ? 'No issues found in enabled checks' : 'Ready to check'}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{hasAnalysis ? 'Review the text for context before publishing.' : 'Choose Check Writing to analyze grammar, spelling, punctuation and capitalization.'}</p>
                    </div>
                  </div>
                )}

                {/* Free tier vs Premium Suggestion Locks section */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Premium Rewrite Rules
                  </h4>
                  <div className="space-y-2">
                    {premiumFeaturesList.map((pf, idx) => (
                      <button type="button"
                        key={idx}
                        onClick={() => setShowUpgradeModal(true)}
                        aria-label={`${pf.name}. Premium feature. View upgrade options.`}
                        className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800 rounded-xl flex justify-between items-center hover:border-amber-500/40 cursor-pointer transition"
                      >
                        <div className="text-left">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 block">{pf.name}</span>
                          <span className="text-[9px] text-slate-400">{pf.desc}</span>
                        </div>
                        <Lock className="h-3 w-3 text-slate-300 dark:text-zinc-600" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: WRITING SCORE & READABILITY METRICS */}
          {rightPanelTab === 'analytics' && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-4 space-y-6 text-left shadow-xs overflow-y-auto max-h-[500px]">
              
              {/* Detailed Metrics */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Writing Scores</h4>
                <div className="space-y-3 text-xs">
                  {[
                    { label: 'Clarity', score: scores.clarity, desc: 'Sentence flow & directness' },
                    { label: 'Tone Delivery', score: scores.tone, desc: 'Appropriate audience targeting' },
                    { label: 'Conciseness', score: scores.conciseness, desc: 'No redundancy or fluff' },
                    { label: 'Professionalism', score: scores.professionalism, desc: 'Suitability for corporate/board communication' }
                  ].map((metric, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between">
                        <div>
                          <span className="font-bold">{metric.label}</span>
                          <span className="text-[9px] text-slate-400 block">{metric.desc}</span>
                        </div>
                        <span className="font-mono">{metric.score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-teal-500 h-full" style={{ width: `${metric.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Readability Meter */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-850">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Readability Metrics</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 rounded-xl">
                    <span className="text-[9px] text-slate-400 block">Grade Level</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-200 mt-0.5 block">{readability.readingLevel}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 rounded-xl">
                    <span className="text-[9px] text-slate-400 block">Paragraph Density</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-200 mt-0.5 block">{readability.paragraphDensity}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 rounded-xl">
                    <span className="text-[9px] text-slate-400 block">Avg Sentence Length</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-200 mt-0.5 block">{readability.sentenceLength} words</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 rounded-xl">
                    <span className="text-[9px] text-slate-400 block">Avg Word Length</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-200 mt-0.5 block">{readability.wordLength} chars</span>
                  </div>
                </div>
              </div>

              {/* Tone Analysis radar indicators */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-850">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tone Analysis</h4>
                <span className="text-xs bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 font-bold px-2.5 py-1 rounded-lg block w-max mb-4">
                  Dominant: {toneAnalysis.dominantTone}
                </span>
                
                <div className="space-y-2 text-xs">
                  {Object.entries(toneAnalysis.scores).map(([tone, score], idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-20 font-medium text-slate-500 text-left">{tone}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-500 h-full" style={{ width: `${score}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[10px]">{score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clarity Alerts */}
              {clarityAlerts.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Clarity & Style Alerts</h4>
                  {clarityAlerts.map((alert, i) => (
                    <div key={i} className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase block">{alert.type}</span>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{alert.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: COMPARE MODE DISPLAY */}
          {rightPanelTab === 'compare' && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-4 text-left shadow-xs overflow-y-auto max-h-[500px]">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-zinc-850">
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">Word Level Compare</span>
                {preFixAllText && (
                  <button onClick={handleUndoFixAll} className="text-xs text-rose-500 font-bold hover:underline">Undo revisions</button>
                )}
              </div>
              
              {!preFixAllText ? (
                <div className="text-center py-10 space-y-2 text-slate-400 text-xs">
                  <Eye className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto" />
                  <p>No changes applied yet. Run an audit and accept suggestions to populate compare mode highlights.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-850 space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">Legend</span>
                    <div className="flex gap-4 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Added</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Removed</span>
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed p-3 border border-slate-100 dark:border-zinc-850 rounded-xl">
                    {diffChunks.map((chunk, idx) => (
                      <span 
                        key={idx} 
                        className={`rounded px-0.5 ${
                          chunk.type === 'added' ? 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold' :
                          chunk.type === 'removed' ? 'bg-rose-500/25 text-rose-800 dark:text-rose-300 line-through' :
                          ''
                        }`}
                      >
                        {chunk.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </section>

      </main>

      {/* MODAL 1: HISTORY DRAWER / VIEW OVERLAY */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-left animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-850">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <History className="h-5 w-5 text-teal-500" /> Version History Logs
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search History */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search history content..."
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Logs List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {historyItems.filter(item => item.originalText.toLowerCase().includes(searchHistoryQuery.toLowerCase())).length > 0 ? (
                historyItems
                  .filter(item => item.originalText.toLowerCase().includes(searchHistoryQuery.toLowerCase()))
                  .map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="text-left space-y-0.5">
                        <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 truncate w-60">{item.originalText}</p>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400">Score: {item.score}% • {item.suggestionsCount} suggestions</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleFavoriteHistory(item.id)}
                          className={`p-1.5 rounded hover:bg-slate-100 ${item.isFavorite ? 'text-amber-500' : 'text-slate-400'}`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <button 
                          onClick={() => restoreHistoryVersion(item.originalText)}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-600 text-[10px] font-bold px-2 py-1 rounded"
                        >
                          Restore
                        </button>
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">No version history matched. Only real composition content gets registered here.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAILED INSTRUCTION (LEARN MORE POPUP) */}
      {selectedLearnMore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl text-left animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-850">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded-full">
                Grammar Rule Mechanics
              </span>
              <button onClick={() => setSelectedLearnMore(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Correction Detail</h3>
              <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="line-through text-rose-500">{selectedLearnMore.original}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className="font-bold text-teal-600">{selectedLearnMore.suggested}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{selectedLearnMore.desc}</p>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-500">Explanation & Grammar Best Practices:</span>
                <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
                  {selectedLearnMore.explanation || "This rule seeks to align proper word order, eliminate redundancies, match subject-verb counts, or use more concise modern stylistic terms to improve clarity."}
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                handleAcceptSuggestion(selectedLearnMore.id, selectedLearnMore.original, selectedLearnMore.suggested);
                setSelectedLearnMore(null);
              }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-xl transition"
            >
              Accept Suggestion Now
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: WORKSPACE SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-left animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-850">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Settings className="h-5 w-5 text-teal-500" /> Engine Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-500 block">Default Dialect Rules</span>
                <select className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl">
                  <option>English (United States)</option>
                  <option>English (United Kingdom)</option>
                  <option>English (India)</option>
                  <option>Spanish (International)</option>
                  <option>French (France)</option>
                </select>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-500 block">Draft Auto Save</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked />
                  <span>Always save draft on text modify</span>
                </label>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-500 block">Checking mode</span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isPremium && adminConfig.featureFlags.realTimeChecking} disabled={!isPremium} onChange={(event) => setAdminConfig(current => ({ ...current, featureFlags: { ...current.featureFlags, realTimeChecking: event.target.checked } }))} />
                  <span>Real-time checking after a short pause</span>
                  {!isPremium && <button type="button" onClick={() => setShowUpgradeModal(true)} className="ml-auto text-[10px] font-bold text-amber-600">Pro</button>}
                </label>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-500 block">Auditing Filters</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked />
                  <span>Highlight passive voice structures</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked />
                  <span>Audit slang and informal vocabularies</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => setShowSettingsModal(false)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-xl transition"
            >
              Save Configuration Settings
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: PRO PLAN UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl text-left animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-850">
              <h3 className="text-base font-bold text-amber-500 flex items-center gap-2">
                <Sparkle className="h-5 w-5 animate-spin" /> Elevate to Pro Writing Assistant
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Plan Comparison */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs space-y-3">
                <span className="font-bold text-slate-500 uppercase tracking-widest block">Features Match</span>
                
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-medium text-slate-500">Spelling & Basic Grammar</span>
                    <span className="font-bold text-teal-600">Free / Pro</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-medium text-slate-500">Premium Rewrite Rules</span>
                    <span className="font-bold text-amber-600">Pro Only</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="font-medium text-slate-500">Daily Diagnostic Audits</span>
                    <span className="font-bold text-slate-600">10 / Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Vocabulary Enhancer</span>
                    <span className="font-bold text-amber-600">Pro Only</span>
                  </div>
                </div>
              </div>

              {/* Pricing benefits card */}
              <div className="p-4 bg-gradient-to-br from-teal-500/10 to-purple-500/10 border border-teal-500/20 rounded-2xl text-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-zinc-200">Ultimate Pro Tier benefits</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Unlock high-level style rewrite, multi-dialect support, and deep tone restructuring diagnostics with unlimited word capacities.</p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Monthly Billing:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold text-slate-800 dark:text-white">₹99</span>
                    <span className="text-[10px] text-slate-400">/ month</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => {
                  if (onOpenUpgradeModal) onOpenUpgradeModal();
                  setShowUpgradeModal(false);
                }}
                className="flex-1 bg-gradient-to-r from-teal-500 to-purple-500 text-white font-bold text-xs py-2.5 rounded-xl text-center shadow-md hover:opacity-90 transition"
              >
                Upgrade to Pro Plan Now
              </button>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-xs rounded-xl text-center transition"
              >
                Continue Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: HELP DIALOG */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl text-left animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-850">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <HelpCircle className="h-5 w-5 text-teal-500" /> Grammar Help Center
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed font-sans">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-700 dark:text-zinc-200">What is the Grammar Checker?</h4>
                <p className="text-slate-500 dark:text-zinc-400">It is a neural writing assistant designed to detect complex syntactic faults, spellings, flow, capitalization errors, and provide dynamic clarity diagnostics.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-700 dark:text-zinc-200">How do I verify other files?</h4>
                <p className="text-slate-500 dark:text-zinc-400">You can use drag and drop to import files, or click the "Upload File" control in the editor bottom bar. We currently support .TXT and .MD plain formats.</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-700 dark:text-zinc-200">What is "Compare Mode"?</h4>
                <p className="text-slate-500 dark:text-zinc-400">Compare mode performs word-level alignments of your initial composition with the revised version, rendering additions in green and removals in crossed-out red highlights.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-xl transition"
            >
              Close Help Center
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
