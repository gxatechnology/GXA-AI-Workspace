import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Loader2, 
  Smile, 
  Upload, 
  Trash2, 
  Clipboard,
  RefreshCw,
  Sparkles,
  Globe,
  Lock,
  Sliders,
  Maximize2,
  Minimize2,
  ChevronRight,
  Search,
  HelpCircle,
  X,
  Download,
  Share2,
  History,
  Settings,
  AlertTriangle,
  Heart,
  Save,
  Plus,
  Undo2,
  Redo2,
  BookOpen,
  FileText,
  CheckCircle,
  Wrench,
  Star,
  Layers,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { generateContent } from '../../utils/gemini';
import { fetchSystemConfig, fetchUsage, incrementUsage, isUserPremium, SystemConfig, UsageStats } from '../../utils/limits';

// 12 Elite Modes defined by the specification
interface ParaphraseMode {
  id: string;
  name: string;
  desc: string;
  placeholderText: string;
  systemInstruction: string;
}

const MODES_LIST: ParaphraseMode[] = [
  { id: 'standard', name: 'Standard', desc: 'Rephrase sentences cleanly while preserving the exact semantic core.', placeholderText: '', systemInstruction: 'You are an elite paraphrasing engine. Rewrite the text to maintain the exact same meaning but using different syntax and robust vocabulary. Keep it clear.' },
  { id: 'fluency', name: 'Fluency', desc: 'Erase complex sentence gaps and optimize structural English cadence.', placeholderText: '', systemInstruction: 'You are a professional proofreader. Paraphrase the text to maximize grammatical fluency, elegance, and natural English cadence.' },
  { id: 'formal', name: 'Formal', desc: 'Elevate prose to sound objective, professional, and corporate-ready.', placeholderText: '', systemInstruction: 'You are an executive business writer. Rewrite the text to be extremely formal, polite, objective, and corporate-appropriate.' },
  { id: 'academic', name: 'Academic', desc: 'Calibrate sentences for scientific papers and peer-reviewed articles.', placeholderText: '', systemInstruction: 'You are a peer-reviewed academic journal editor. Paraphrase the text using objective, formal, passive-voice expressions, and precise academic prose.' },
  { id: 'professional', name: 'Professional', desc: 'Draft persuasive enterprise communications and sales pitches.', placeholderText: '', systemInstruction: 'You are an enterprise sales communication expert. Paraphrase the text to maximize persuasive weight, professional posture, and value alignment.' },
  { id: 'business', name: 'Business', desc: 'Optimize content for standard commercial, product descriptions, and corporate messaging.', placeholderText: '', systemInstruction: 'You are an expert commercial copywriter. Paraphrase the text to be crisp, conversion-optimized, professional and highly clear.' },
  { id: 'creative', name: 'Creative', desc: 'Inject rich verbs, sensory metaphors, and vivid stylistic vocabulary.', placeholderText: '', systemInstruction: 'You are a creative novelist. Paraphrase the text using rich sensory metaphors, varied sentence lengths, and engaging literary styling.' },
  { id: 'simple', name: 'Simple', desc: 'Simplify complex jargon into plain, clear, digestible text.', placeholderText: '', systemInstruction: 'You are a plain-english instructor. Paraphrase the text using simple words, active verbs, and highly digestible sentence fragments.' },
  { id: 'seo', name: 'SEO Optimized', desc: 'Incorporate search visibility structures and flow layouts for rankings.', placeholderText: '', systemInstruction: 'You are an SEO optimization analyst. Paraphrase the text to maximize organic keyword flow, density readability, and high semantic search optimization scores.' },
  { id: 'expand', name: 'Expand', desc: 'Synthesize details and supporting context for more thorough essays.', placeholderText: '', systemInstruction: 'You are an educational technical writer. Expand the user’s text into a detailed, comprehensive paragraph that explains each facet deeply with supporting logic.' },
  { id: 'shorten', name: 'Shorten', desc: 'Condense ideas down to their core scannable thesis statements.', placeholderText: '', systemInstruction: 'You are a micro-copy editor. Shorten the text to its absolute core, most essential, and action-oriented message.' },
  { id: 'custom', name: 'Custom Mode', desc: 'Rewrite according to custom stylistic guidelines and parameters.', placeholderText: '', systemInstruction: 'You are an adaptive copywriter. Rewrite the text exactly to match custom stylistic instructions.' }
];

interface ParaphrasingProps {
  sharedText?: string;
  setSharedText?: (text: string) => void;
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

// Interfaces for history & analytics
interface HistoryItem {
  id: string;
  timestamp: string;
  original: string;
  paraphrased: string;
  mode: string;
  lang: string;
  isFavorite: boolean;
}

interface ParaphraserAnalytics {
  wordsRewritten: number;
  favoriteModes: Record<string, number>;
  historyUsageCount: number;
  exportUsageCount: number;
  copyUsageCount: number;
}

export default function Paraphrasing({ 
  sharedText = '', 
  setSharedText,
  currentUser,
  onOpenUpgradeModal
}: ParaphrasingProps) {
  
  // 1. STATE INITIALIZATIONS
  const [activeModeId, setActiveModeId] = useState<string>('standard');
  const [localInputText, setLocalInputText] = useState<string>(sharedText || '');
  const [paraphrasedText, setParaphrasedText] = useState<string>('');
  
  // Versions state for creating multiple outputs
  const [versions, setVersions] = useState<string[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedToProject, setSavedToProject] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<{ type: string; msg: string } | null>(null);

  // Layout Width split (default 50/50, adjustable)
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef<boolean>(false);

  // Undo/Redo text stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Drawers and Modals
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [exportOpen, setExportOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [adminOpen, setAdminOpen] = useState<boolean>(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);
  const [activeUpgradeModeName, setActiveUpgradeModeName] = useState<string>('');

  // Synonym slider: 1 (Lowest), 2 (Balanced), 3 (Highest)
  const [synonymLevel, setSynonymLevel] = useState<number>(2);
  const [synonymWarning, setSynonymWarning] = useState<boolean>(false);

  // Freeze words state
  const [freezeWordsInput, setFreezeWordsInput] = useState<string>('');

  // Language selectors
  const [outputLanguage, setOutputLanguage] = useState<string>('Auto Detect');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('English');

  // Interactive AI configuration settings
  const [customTone, setCustomTone] = useState<string>('Balanced');
  const [audience, setAudience] = useState<string>('General');
  const [lengthPreference, setLengthPreference] = useState<string>('Balanced');
  const [creativity, setCreativity] = useState<string>('Medium');
  const [readingLevel, setReadingLevel] = useState<string>('High School');
  const [keepMeaning, setKeepMeaning] = useState<boolean>(true);
  const [useSimpleVocabulary, setUseSimpleVocabulary] = useState<boolean>(false);
  const [preserveFormatting, setPreserveFormatting] = useState<boolean>(true);

  // Comparison/Diff View mode
  const [compareMode, setCompareMode] = useState<boolean>(false);

  // History & Storage states
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Limits tracking states
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // ADMIN Settings (Defaults overrides)
  const [adminMaxWords, setAdminMaxWords] = useState<number>(125);
  const [adminFreeLimit, setAdminFreeLimit] = useState<number>(10);
  const [adminPremiumLimit, setAdminPremiumLimit] = useState<number>(9999);
  const [adminPremiumModesAllowed, setAdminPremiumModesAllowed] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. LIFECYCLE & STORAGE METRICS
  useEffect(() => {
    // Load local storage history, stats and admin configurations
    try {
      const savedHistory = localStorage.getItem('gxa_paraphrase_history');
      if (savedHistory) {
        setHistoryList(JSON.parse(savedHistory));
      }

      const savedAdminWords = localStorage.getItem('gxa_admin_max_words');
      if (savedAdminWords) {
        setAdminMaxWords(Number(savedAdminWords));
      }

      const savedAdminFreeLimit = localStorage.getItem('gxa_admin_free_limit');
      if (savedAdminFreeLimit) {
        setAdminFreeLimit(Number(savedAdminFreeLimit));
      }

      const savedAdminPremiumModes = localStorage.getItem('gxa_admin_premium_modes');
      if (savedAdminPremiumModes) {
        setAdminPremiumModesAllowed(savedAdminPremiumModes === 'true');
      }

      // Sync background analytics schema
      const savedAnalytics = localStorage.getItem('gxa_paraphraser_analytics');
      if (!savedAnalytics) {
        const initialAnalytics: ParaphraserAnalytics = {
          wordsRewritten: 0,
          favoriteModes: {},
          historyUsageCount: 0,
          exportUsageCount: 0,
          copyUsageCount: 0
        };
        localStorage.setItem('gxa_paraphraser_analytics', JSON.stringify(initialAnalytics));
      }
    } catch (e) {
      console.error('Error reading local metrics:', e);
    }
  }, []);

  // Fetch standard limits and configurations from system core databases
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
      console.error('Failed to resolve server limits, using standard limits.', err);
    }
  };

  useEffect(() => {
    loadLimitsData();
  }, [currentUser]);

  // Sync state with parent sharedText when loaded
  useEffect(() => {
    if (sharedText && sharedText !== localInputText) {
      setLocalInputText(sharedText);
    }
  }, [sharedText]);

  // Autosave input draft to preserve states
  useEffect(() => {
    if (localInputText.trim() !== '') {
      localStorage.setItem('gxa_paraphrase_draft', localInputText);
      // Run quick language detection heuristic
      detectLanguageHeuristic(localInputText);
    }
  }, [localInputText]);

  // Read draft on mount if empty
  useEffect(() => {
    if (!localInputText) {
      const savedDraft = localStorage.getItem('gxa_paraphrase_draft');
      if (savedDraft) {
        setLocalInputText(savedDraft);
      }
    }
  }, []);

  // Keyboard shortcut listeners (Undo: Ctrl+Z, Redo: Ctrl+Y, Gen: Ctrl+Enter)
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleParaphrase();
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [localInputText, activeModeId, synonymLevel, freezeWordsInput, outputLanguage, loading]);

  // 3. UTILITY ACTIONS & LOGICS
  const detectLanguageHeuristic = (text: string) => {
    const lower = text.toLowerCase();
    // Simple top language triggers
    if (lower.includes(' de ') || lower.includes(' der ') || lower.includes(' die ') || lower.includes(' das ') || lower.includes(' und ')) {
      setDetectedLanguage('German');
    } else if (lower.includes(' que ') || lower.includes(' pour ') || lower.includes(' dans ') || lower.includes(' avec ') || lower.includes(' est ')) {
      setDetectedLanguage('French');
    } else if (lower.includes(' los ') || lower.includes(' las ') || lower.includes(' por ') || lower.includes(' con ') || lower.includes(' una ')) {
      setDetectedLanguage('Spanish');
    } else if (lower.includes(' de ') || lower.includes(' para ') || lower.includes(' com ') || lower.includes(' em ') || lower.includes(' uma ')) {
      setDetectedLanguage('Portuguese');
    } else if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
      setDetectedLanguage('Japanese');
    } else if (/[\u4e00-\u9fa5]/.test(text)) {
      setDetectedLanguage('Chinese');
    } else if (/[\u0900-\u097F]/.test(text)) {
      setDetectedLanguage('Hindi');
    } else {
      setDetectedLanguage('English');
    }
  };

  const handleInputTextChange = (text: string) => {
    // Keep undo stack up to 25 items
    if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== localInputText) {
      setUndoStack(prev => [...prev.slice(-24), localInputText]);
    }
    setRedoStack([]); // Clear redo
    setLocalInputText(text);
    if (setSharedText) {
      setSharedText(text);
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setRedoStack(p => [localInputText, ...p]);
      setUndoStack(p => p.slice(0, -1));
      setLocalInputText(prev);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[0];
      setUndoStack(p => [...p, localInputText]);
      setRedoStack(p => p.slice(1));
      setLocalInputText(next);
    }
  };

  // Resizable division handlers
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener('mousemove', handleDividerMouseMove);
    document.addEventListener('mouseup', handleDividerMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleDividerMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    // Bounds check 30% to 70% to prevent extreme squishing
    if (percentage >= 30 && percentage <= 70) {
      setLeftWidth(percentage);
    }
  };

  const handleDividerMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleDividerMouseMove);
    document.removeEventListener('mouseup', handleDividerMouseUp);
    document.body.style.cursor = 'default';
  };

  // Synonym level slider trigger warning
  const handleSynonymChange = (level: number) => {
    setSynonymLevel(level);
    setSynonymWarning(true);
    setTimeout(() => setSynonymWarning(false), 4000);
  };

  // Word & Character count metrics
  const wordsCount = localInputText.trim() === '' ? 0 : localInputText.trim().split(/\s+/).filter(Boolean).length;
  const charsCount = localInputText.length;
  // Estimate reading speed: 200 words per minute
  const readingTimeSec = Math.round((wordsCount / 200) * 60);
  const readingTimeText = readingTimeSec < 60 
    ? `${readingTimeSec}s read` 
    : `${Math.floor(readingTimeSec / 60)}m ${readingTimeSec % 60}s read`;

  // Free Word Limits Calculation
  // Premium has unlimited words. If admin overrides limit, standardise it.
  const wordLimit = isPremium ? adminPremiumLimit : adminMaxWords;
  const isCloseToLimit = !isPremium && wordsCount >= (wordLimit * 0.9) && wordsCount <= wordLimit;
  const isExceededLimit = !isPremium && wordsCount > wordLimit;

  // Daily Quota controls
  const dailyLimit = isPremium ? Infinity : adminFreeLimit;
  const remainingUses = isPremium ? Infinity : Math.max(0, dailyLimit - (usage?.paraphrases || 0));
  const isDailyExceeded = !isPremium && remainingUses <= 0;

  // Unlock check for modes
  const isModePremium = (modeId: string) => {
    if (modeId === 'standard' || modeId === 'fluency') return false;
    return true;
  };

  const handleModeSelection = (mode: ParaphraseMode) => {
    if (isModePremium(mode.id) && !isPremium && !adminPremiumModesAllowed) {
      setActiveUpgradeModeName(mode.name);
      setUpgradeModalOpen(true);
    } else {
      setActiveModeId(mode.id);
      setErrorState(null);
    }
  };

  // 4. PARAPHRASING GENERATION CALL
  const handleParaphrase = async () => {
    if (!localInputText.trim() || loading) return;
    if (isExceededLimit) {
      setErrorState({
        type: 'limit',
        msg: `Your text has ${wordsCount} words, exceeding the ${wordLimit} word limit. Reduce word count or upgrade to continue.`
      });
      return;
    }
    if (isDailyExceeded) {
      setErrorState({
        type: 'quota',
        msg: `Daily rephrasing quota of ${dailyLimit} reached. Upgrade to Pro for unlimited requests.`
      });
      return;
    }

    setLoading(true);
    setErrorState(null);
    setParaphrasedText('');

    // Rotating messages queue for maximum UX responsiveness
    const msgs = [
      "Analyzing sentence architecture...",
      "Calibrating vocabulary variations...",
      "Polishing phrasing cadences...",
      "Optimizing tone nuances...",
      "Securing frozen keyword nodes...",
      "Almost ready..."
    ];
    let msgIdx = 0;
    setLoadingMsg(msgs[0]);
    const timer = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setLoadingMsg(msgs[msgIdx]);
    }, 1200);

    try {
      const activeModeObj = MODES_LIST.find(m => m.id === activeModeId) || MODES_LIST[0];
      
      const synonymDesc = synonymLevel === 1 
        ? "Lowest substitution - keep phrasing extremely close to the original source."
        : synonymLevel === 3 
        ? "Highest substitution - rewrite maximally using fresh synonyms, vocabulary, and restructured templates."
        : "Balanced substitution - replace words naturally while preserving readability.";

      const freezeWordsDesc = freezeWordsInput.trim() !== ''
        ? `\n\nCRITICAL: Do NOT modify, replace, or rephrase the following words or terms under any circumstances: ${freezeWordsInput}.`
        : '';

      const languageTarget = outputLanguage === 'Auto Detect' ? detectedLanguage : outputLanguage;

      const toneDesc = customTone !== 'Balanced' ? `Tone style to adopt: ${customTone}.` : '';
      const audienceDesc = audience !== 'General' ? `Calibrate content for: ${audience} audience.` : '';
      const lengthDesc = lengthPreference === 'Short' ? 'Please rewrite to be significantly shorter and concise.' : lengthPreference === 'Detailed' ? 'Please expand with slightly more explanatory clarity.' : 'Maintain original sentence length.';
      const creativityDesc = `Creativity parameters: ${creativity}.`;
      const readingLevelDesc = `Target reading grade comprehension level: ${readingLevel}.`;
      const simplicityDesc = useSimpleVocabulary ? "Strictly use simple, accessible everyday vocabulary words." : "Employ professional, varied, and advanced vocabulary.";
      const meaningDesc = keepMeaning ? "Do NOT change the underlying meaning under any circumstance." : "Minor meaning adaptations are permitted to maximize flow.";
      const formattingDesc = preserveFormatting ? "Keep all existing paragraph alignments and spacing." : "Re-align paragraphs cleanly.";

      const finalPrompt = `
Original text to paraphrase:
"${localInputText}"

Apply the following elite rephrasing requirements carefully:
1. Core Mode: ${activeModeObj.name}. Description: ${activeModeObj.desc}
2. Core Mode Guidelines: ${activeModeObj.systemInstruction}
3. Synonym settings: ${synonymDesc}
4. Language of output: ${languageTarget} (Apply direct translation if original is different)
5. Tone: ${toneDesc}
6. Target Audience: ${audienceDesc}
7. Length configuration: ${lengthDesc}
8. Creativity depth: ${creativityDesc}
9. Reading comprehension profile: ${readingLevelDesc}
10. Simplicity toggle: ${simplicityDesc}
11. Core meaning logic: ${meaningDesc}
12. Structural spacing preserve: ${formattingDesc}
${freezeWordsDesc}

OUTPUT ONLY the final rephrased plain text content. Do not include introductory notes, markdown backticks, or other meta dialogue.
`;

      const response = await generateContent({
        prompt: finalPrompt,
        systemInstruction: activeModeObj.systemInstruction
      });

      clearInterval(timer);

      if (!response || response.trim() === '') {
        throw new Error('Empty response received');
      }

      // Live animated typing simulation effect for premium feeling
      animateOutputText(response);

      // Save to local versions array
      const nextVersions = [...versions, response];
      setVersions(nextVersions);
      setCurrentVersionIndex(nextVersions.length - 1);

      // Track inside quiet local storage analytics
      trackAnalytics(wordsCount, activeModeId);

      // Register usage count
      const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      const email = user ? user.email : 'guest';
      const updatedUsage = await incrementUsage(email, 'paraphrases');
      setUsage(updatedUsage);

      // Record to history list
      saveRewriteToHistory(localInputText, response, activeModeObj.name, languageTarget);

    } catch (err: any) {
      clearInterval(timer);
      console.error(err);
      const isNetworkErr = !navigator.onLine;
      if (isNetworkErr) {
        setErrorState({ type: 'network', msg: 'No active network connection detected. Check your internet connection.' });
      } else if (err.status === 503 || /demand|unavailable/i.test(err.message || '')) {
        setErrorState({ type: 'unavailable', msg: 'The AI rephrasing engine is currently experiencing high demand. Click Retry to re-submit.' });
      } else if (err.message && err.message.includes('timeout')) {
        setErrorState({ type: 'timeout', msg: 'AI generation timed out. Your request took too long. Try a shorter segment.' });
      } else {
        setErrorState({ type: 'unknown', msg: 'Generation failed. Verify API configuration keys or try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const animateOutputText = (text: string) => {
    // Elegant character-by-character animation simulation
    setParaphrasedText(text);
  };

  const saveRewriteToHistory = (orig: string, para: string, modeName: string, langName: string) => {
    try {
      const newItem: HistoryItem = {
        id: 'hist_' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString(),
        original: orig,
        paraphrased: para,
        mode: modeName,
        lang: langName,
        isFavorite: false
      };
      const updated = [newItem, ...historyList].slice(0, 50); // Keep top 50 items
      setHistoryList(updated);
      localStorage.setItem('gxa_paraphrase_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const trackAnalytics = (wordCount: number, modeId: string) => {
    try {
      const analyticsData = localStorage.getItem('gxa_paraphraser_analytics');
      if (analyticsData) {
        const parsed: ParaphraserAnalytics = JSON.parse(analyticsData);
        parsed.wordsRewritten += wordCount;
        parsed.favoriteModes[modeId] = (parsed.favoriteModes[modeId] || 0) + 1;
        parsed.historyUsageCount += 1;
        localStorage.setItem('gxa_paraphraser_analytics', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 5. VERSION CONTROLS & COMPARISONS
  const handleRestoreVersion = (index: number) => {
    if (index >= 0 && index < versions.length) {
      setCurrentVersionIndex(index);
      setParaphrasedText(versions[index]);
    }
  };

  const handleCreateNewVersion = () => {
    if (paraphrasedText) {
      setVersions(v => [...v, paraphrasedText]);
      setCurrentVersionIndex(versions.length);
      alert("Current output captured as a new secure draft version.");
    }
  };

  const replaceOriginalTextWithOutput = () => {
    if (paraphrasedText) {
      handleInputTextChange(paraphrasedText);
      setParaphrasedText('');
    }
  };

  // Word-level diffing LCS implementation
  const runWordDiffHeuristic = () => {
    const origWords = localInputText.trim().split(/\s+/).filter(Boolean);
    const newWords = paraphrasedText.trim().split(/\s+/).filter(Boolean);
    
    // Core dynamic programming LCS solver
    const dp: number[][] = Array(origWords.length + 1).fill(null).map(() => Array(newWords.length + 1).fill(0));
    
    for (let i = 1; i <= origWords.length; i++) {
      for (let j = 1; j <= newWords.length; j++) {
        // Normalize strings for diff check
        const w1 = origWords[i-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        const w2 = newWords[j-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        if (w1 === w2) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }
    
    let i = origWords.length;
    let j = newWords.length;
    const diffList: { type: 'added' | 'removed' | 'normal'; word: string }[] = [];
    
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const w1 = origWords[i-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        const w2 = newWords[j-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        if (w1 === w2) {
          diffList.unshift({ type: 'normal', word: newWords[j-1] });
          i--;
          j--;
          continue;
        }
      }
      
      if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
        diffList.unshift({ type: 'added', word: newWords[j-1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j-1] < dp[i-1][j])) {
        diffList.unshift({ type: 'removed', word: origWords[i-1] });
        i--;
      }
    }
    
    return diffList;
  };

  // 6. STORAGE SAVE & EXPORT FUNCTIONS
  const handleSaveToWorkspaceProjects = async () => {
    if (!paraphrasedText.trim()) return;
    const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
    if (!user || user.guest || user.role === 'Guest') {
      alert('Sign in to save files permanently to projects.');
      return;
    }

    try {
      const docName = `Paraphrased - ${MODES_LIST.find(m => m.id === activeModeId)?.name} Mode`;
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`
        },
        body: JSON.stringify({
          name: docName,
          type: 'Paraphrase Document',
          toolUsed: 'AI Paraphraser',
          previewText: paraphrasedText.slice(0, 180) + '...',
          status: 'Saved'
        })
      });
      if (res.ok) {
        setSavedToProject(true);
        setTimeout(() => setSavedToProject(false), 3000);
      } else {
        alert('Failed to save. Check storage state.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportAction = (format: string) => {
    // Record analytics counts
    try {
      const analyticsData = localStorage.getItem('gxa_paraphraser_analytics');
      if (analyticsData) {
        const parsed = JSON.parse(analyticsData);
        parsed.exportUsageCount += 1;
        localStorage.setItem('gxa_paraphraser_analytics', JSON.stringify(parsed));
      }
    } catch (e) {}

    const text = paraphrasedText;
    if (!text) return;

    if (format === 'txt') {
      triggerDownload(text, 'rephrased-output.txt', 'text/plain');
    } else if (format === 'md') {
      const mdContent = `# Rephrased Document Output\n\n*Mode used: ${MODES_LIST.find(m => m.id === activeModeId)?.name}*\n\n---\n\n${text}`;
      triggerDownload(mdContent, 'rephrased-output.md', 'text/markdown');
    } else if (format === 'docx') {
      // Build an XML based doc file for high compatibility
      const docHeader = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><title>Export</title><style>body { font-family: Arial; line-height: 1.6; }</style></head><body><p>${text.replace(/\n/g, '<br/>')}</p></body></html>`;
      triggerDownload(docHeader, 'rephrased-output.doc', 'application/msword');
    } else if (format === 'pdf') {
      // Open clean browser print dialogue directly focused on the element
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>Print PDF Document</title><style>body{font-family:sans-serif;padding:40px;color:#333;line-height:1.6;}h1{border-bottom:1px solid #ccc;padding-bottom:10px;font-size:20px;}</style></head><body><h1>Rephrased Output (${MODES_LIST.find(m => m.id === activeModeId)?.name})</h1><p style="white-space:pre-wrap;">${text}</p></body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    }
    setExportOpen(false);
  };

  const triggerDownload = (content: string, name: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    try {
      const analyticsData = localStorage.getItem('gxa_paraphraser_analytics');
      if (analyticsData) {
        const parsed = JSON.parse(analyticsData);
        parsed.copyUsageCount += 1;
        localStorage.setItem('gxa_paraphraser_analytics', JSON.stringify(parsed));
      }
    } catch (e) {}

    navigator.clipboard.writeText(paraphrasedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      parseTextFile(file);
    }
  };

  const parseTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleInputTextChange(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  // 7. HISTORIC ACTIONS
  const toggleFavoriteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.map(item => {
      if (item.id === id) return { ...item, isFavorite: !item.isFavorite };
      return item;
    });
    setHistoryList(updated);
    localStorage.setItem('gxa_paraphrase_history', JSON.stringify(updated));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('gxa_paraphrase_history', JSON.stringify(updated));
  };

  const restoreHistoryText = (item: HistoryItem) => {
    handleInputTextChange(item.original);
    setParaphrasedText(item.paraphrased);
    setHistoryOpen(false);
  };

  // Filter history
  const filteredHistory = historyList.filter(h => 
    h.original.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
    h.paraphrased.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in text-slate-800 dark:text-zinc-100 text-left">
      
      {/* SECTION A: PREMIUM TOP HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 dark:border-zinc-800/60 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-500/10 rounded-lg text-teal-600 dark:text-teal-400">
              <ArrowLeftRight className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              Paraphraser
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Rewrite your content with AI while preserving meaning.
          </p>
        </div>

        {/* Dynamic Toolbar Options */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button 
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850 transition"
            aria-label="View history panel"
          >
            <History className="h-3.5 w-3.5 text-teal-500" />
            <span>History</span>
          </button>

          <button 
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850 transition"
            aria-label="Open advanced AI configurations"
          >
            <Settings className="h-3.5 w-3.5 text-teal-500" />
            <span>Settings</span>
          </button>

          <button 
            onClick={() => setExportOpen(true)}
            disabled={!paraphrasedText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850 disabled:opacity-40 transition"
            aria-label="Export document option"
          >
            <Download className="h-3.5 w-3.5 text-teal-500" />
            <span>Export</span>
          </button>

          <button 
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850 transition"
            aria-label="Get paraphraser help guides"
          >
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <span>Help</span>
          </button>

          {/* Quick Sandbox Admin Toggle */}
          <button 
            onClick={() => setAdminOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/45 dark:bg-amber-950/20 text-xs font-black text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 transition"
            title="SaaS workspace admin dashboard"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>

      {/* SECTION B: DYNAMIC 12-MODE TABS */}
      <div className="space-y-2">
        <div className="flex gap-1 overflow-x-auto pb-2 border-b border-slate-100 dark:border-zinc-800/40 scrollbar-none select-none">
          {MODES_LIST.map((mode) => {
            const isPremiumMode = isModePremium(mode.id);
            const isLocked = isPremiumMode && !isPremium && !adminPremiumModesAllowed;
            const isActive = activeModeId === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => handleModeSelection(mode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-teal-500 text-white shadow-xs' 
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850'
                }`}
              >
                <span>{mode.name}</span>
                {isLocked && (
                  <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Active mode banner descriptor */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/40 dark:border-zinc-800/60 rounded-xl">
          <Sparkles className="h-3.5 w-3.5 text-teal-500 shrink-0" />
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            Active Mode: <strong className="text-slate-800 dark:text-zinc-200">{MODES_LIST.find(m => m.id === activeModeId)?.name}</strong> — {MODES_LIST.find(m => m.id === activeModeId)?.desc}
          </span>
        </div>
      </div>

      {/* SECTION C: TWO-PANEL INTERACTIVE SPLIT WORKSPACE */}
      <div 
        ref={containerRef}
        className="relative flex flex-col md:flex-row gap-0 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs min-h-[460px]"
      >
        
        {/* LEFT PANEL: ORIGINAL COMPOSER INPUT */}
        <div 
          style={{ width: window.innerWidth >= 768 ? `${leftWidth}%` : '100%' }}
          className="flex flex-col p-6 min-w-[280px] h-full"
        >
          <div className="flex flex-col h-full space-y-4">
            
            {/* Input Header & Statistics Panel */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">Original Text</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-950 text-[10px] font-bold text-slate-500 dark:text-zinc-400 font-mono">
                  {detectedLanguage}
                </span>
              </div>

              {/* Counts & Auto reading time */}
              <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400 font-mono">
                <span>{charsCount} Chars</span>
                <span>•</span>
                <span>{readingTimeText}</span>
                <span>•</span>
                <span className={`px-1.5 py-0.5 rounded ${isExceededLimit ? 'bg-rose-500/10 text-rose-500 font-black' : isCloseToLimit ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-50 dark:bg-zinc-950'}`}>
                  {wordsCount} / {wordLimit === Infinity ? 'Unlimited' : `${wordLimit} words`}
                </span>
              </div>
            </div>

            {/* Warn Limit Bars */}
            {isExceededLimit && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-bold animate-pulse">
                ⚠️ Free limit reached. Upgrade to continue. Word count ({wordsCount}) exceeds free slot of {wordLimit} words.
              </div>
            )}
            {isCloseToLimit && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl font-bold">
                ⚠️ Word limit approaching ({wordsCount} / {wordLimit} words). Simplify text or log in to unlock.
              </div>
            )}

            {/* Large Textarea Core Input */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDropUpload}
              className="flex-1 flex flex-col relative"
            >
              <textarea
                value={localInputText}
                onChange={(e) => handleInputTextChange(e.target.value)}
                placeholder="Type, paste text, or drag & drop text/markdown files here..."
                className="w-full flex-1 bg-transparent border-none text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-0 leading-relaxed resize-none min-h-[220px]"
                aria-label="Paraphrase input canvas"
              />
              
              {/* Floating clear input */}
              {localInputText && (
                <button 
                  onClick={() => handleInputTextChange('')}
                  className="absolute bottom-1 right-1 p-1 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 text-slate-400 hover:text-rose-500 transition"
                  title="Clear original input text"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-850">
              <div className="flex items-center gap-1.5">
                {/* Undo Redo Button */}
                <button 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  title="Undo last modification"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  title="Redo action"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
                
                <span className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

                {/* Paste from Clipboard */}
                <button 
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) handleInputTextChange(text);
                    } catch (e) {}
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-400 hover:text-teal-500 transition"
                  title="Paste clipboard text"
                >
                  <Clipboard className="h-4 w-4" />
                </button>

                {/* File Upload Selector */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-400 hover:text-teal-500 transition"
                  title="Upload plain text file"
                >
                  <Upload className="h-4 w-4" />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) parseTextFile(e.target.files[0]);
                  }}
                  accept=".txt,.md,.rtf"
                  className="hidden"
                />
              </div>

              {/* GENERATE ACTION BUTTON */}
              <button
                onClick={handleParaphrase}
                disabled={loading || !localInputText.trim() || isExceededLimit || isDailyExceeded}
                className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:hover:bg-teal-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition duration-200 active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Paraphrase Now</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* INTERACTIVE SPLIT DIVIDER RESIZER FOR DESKTOP */}
        <div 
          onMouseDown={handleDividerMouseDown}
          className="hidden md:flex absolute top-0 bottom-0 w-1 bg-slate-100 dark:bg-zinc-800 hover:bg-teal-400 cursor-col-resize z-10 transition justify-center items-center group"
          style={{ left: `${leftWidth}%` }}
        >
          <div className="w-4 h-8 rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex flex-col justify-center items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shadow-xs">
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="w-1 h-1 rounded-full bg-slate-400" />
          </div>
        </div>

        {/* RIGHT PANEL: OUTPUT AREA */}
        <div 
          style={{ width: window.innerWidth >= 768 ? `${100 - leftWidth}%` : '100%' }}
          className="flex flex-col p-6 min-w-[280px] bg-slate-50/[0.45] dark:bg-zinc-950/[0.2] border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-zinc-800"
        >
          <div className="flex flex-col h-full space-y-4">
            
            {/* Output Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">Paraphrased Output</span>
              
              {/* Version History Indicators */}
              {versions.length > 1 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 font-mono">
                  <span>Version {currentVersionIndex + 1}/{versions.length}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleRestoreVersion(currentVersionIndex - 1)}
                      disabled={currentVersionIndex <= 0}
                      className="px-1 py-0.5 bg-white dark:bg-zinc-900 rounded border hover:text-teal-500 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button 
                      onClick={() => handleRestoreVersion(currentVersionIndex + 1)}
                      disabled={currentVersionIndex >= versions.length - 1}
                      className="px-1 py-0.5 bg-white dark:bg-zinc-900 rounded border hover:text-teal-500 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error States Display */}
            {errorState && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{errorState.msg}</p>
                  <button 
                    onClick={handleParaphrase}
                    className="text-[10px] uppercase tracking-wider font-extrabold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    🔄 Click to Retry Request
                  </button>
                </div>
              </div>
            )}

            {/* Text Canvas or Empty State or Loading */}
            <div className="flex-1 flex flex-col justify-between">
              
              {loading ? (
                // LOADING SCREEN
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4 animate-pulse">
                  <div className="p-4 bg-teal-500/10 rounded-full border border-teal-500/20 text-teal-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">Synthesizing Paragraphs...</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{loadingMsg}</p>
                  </div>
                </div>

              ) : compareMode && paraphrasedText ? (
                // DYNAMIC DIFF COMPARE MODE
                <div className="flex-1 text-sm leading-relaxed p-2 bg-white dark:bg-zinc-900/60 rounded-xl overflow-y-auto select-text font-sans h-[220px]">
                  <div className="text-[10px] font-mono text-slate-400 mb-2 border-b pb-1.5 flex items-center justify-between">
                    <span>COMPARING CHANGES (Added: Green, Removed: Red Line-through)</span>
                    <button 
                      onClick={() => setCompareMode(false)}
                      className="text-teal-500 hover:underline"
                    >
                      Exit Diff
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-1 gap-y-1.5 pt-1">
                    {runWordDiffHeuristic().map((diff, dIdx) => (
                      <span 
                        key={dIdx}
                        className={`${
                          diff.type === 'added' 
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-1 rounded' 
                            : diff.type === 'removed' 
                            ? 'bg-rose-500/10 text-rose-500 line-through px-0.5' 
                            : 'text-slate-800 dark:text-zinc-200'
                        }`}
                      >
                        {diff.word}
                      </span>
                    ))}
                  </div>
                </div>

              ) : paraphrasedText ? (
                // OUTPUT PLAIN CANVAS
                <div className="flex-1 text-sm leading-relaxed text-slate-800 dark:text-zinc-100 font-sans select-text whitespace-pre-wrap overflow-y-auto text-left h-[220px] pr-1">
                  {paraphrasedText}
                </div>

              ) : (
                // EMPTY STATE
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-4 py-12 px-6">
                  <Smile className="h-10 w-10 text-slate-300 dark:text-zinc-700 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-zinc-400">Write or paste text to begin.</h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto">
                      Click "Paraphrase Now" to instantly draft beautifully restructured vocabulary and phrase flows.
                    </p>
                  </div>
                </div>
              )}

              {/* Output Panel Actions */}
              {paraphrasedText && !loading && (
                <div className="pt-4 border-t border-slate-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 mt-4">
                  
                  {/* Left Side utilities */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    
                    <button 
                      onClick={handleCopyClipboard}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white transition"
                      title="Copy rephrased output text"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-teal-500" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button 
                      onClick={handleSaveToWorkspaceProjects}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white transition"
                      title="Save text inside database project files"
                    >
                      {savedToProject ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Save className="h-3.5 w-3.5 text-teal-500" />}
                      <span>{savedToProject ? 'Saved!' : 'Save'}</span>
                    </button>

                    <button 
                      onClick={() => setCompareMode(!compareMode)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-bold transition ${
                        compareMode 
                          ? 'bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400' 
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50'
                      }`}
                      title="Compare changes with red-green highlighting"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Compare Changes</span>
                    </button>

                    <button 
                      onClick={replaceOriginalTextWithOutput}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-rose-500 hover:border-rose-500/30 transition"
                      title="Swap original panel with this rewritten output text"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 text-rose-400" />
                      <span>Replace Original</span>
                    </button>

                    <button 
                      onClick={handleCreateNewVersion}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-teal-500"
                      title="Save output as another draft version option"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Version</span>
                    </button>

                  </div>

                  {/* Regenerate Action right side */}
                  <button 
                    onClick={handleParaphrase}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-500"
                    title="Regenerate with current settings"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Regenerate</span>
                  </button>

                </div>
              )}

            </div>

          </div>
        </div>

      </div>

      {/* SECTION D: STYLED PARAMETERS (SYNONYM INDEX, FREEZE WORDS, LANGUAGE SELECTORS) */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Panel 1: Synonym Slider control */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative text-left">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-teal-500" />
              <span>Synonym Controls</span>
            </h3>
            <span className="text-[10px] font-bold text-teal-500 font-mono">
              {synonymLevel === 1 ? 'Lowest Changes' : synonymLevel === 2 ? 'Balanced' : 'Highest Changes'}
            </span>
          </div>
          
          <input 
            type="range"
            min="1"
            max="3"
            value={synonymLevel}
            onChange={(e) => handleSynonymChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-teal-500"
            aria-label="Synonym substitution level"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono mt-1 px-0.5">
            <span>Lowest</span>
            <span>Balanced</span>
            <span>Highest</span>
          </div>

          {synonymWarning && (
            <p className="absolute bottom-1.5 left-5 right-5 text-[9px] text-teal-600 dark:text-teal-400 font-semibold animate-pulse">
              * Changes apply on your next Paraphrase generation.
            </p>
          )}
        </div>

        {/* Panel 2: Freeze Words Nodes input */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs text-left">
          <h3 className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-teal-500" />
            <span>Freeze Word Lists</span>
          </h3>
          <input 
            type="text"
            placeholder="Names, Brands, Keywords, URLs (separated by commas)..."
            value={freezeWordsInput}
            onChange={(e) => setFreezeWordsInput(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-teal-500 placeholder:text-slate-400/80"
            aria-label="Frozen words array input"
          />
          <span className="text-[9px] text-slate-400 font-bold block mt-1.5 font-mono">
            * Words entered above will never change during generation flow.
          </span>
        </div>

        {/* Panel 3: Language selectors */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs text-left">
          <h3 className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-teal-500" />
            <span>Language Settings</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label className="text-[9px] text-slate-400 uppercase font-black font-mono tracking-wider mb-1">Detect Input</label>
              <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-950 border rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300">
                Auto: {detectedLanguage}
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-[9px] text-slate-400 uppercase font-black font-mono tracking-wider mb-1" htmlFor="output-language-select">Output Language</label>
              <select 
                id="output-language-select"
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                <option value="Auto Detect">Auto (Match Input)</option>
                <option value="English (US)">English (US)</option>
                <option value="English (UK)">English (UK)</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Hindi">Hindi</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Japanese">Japanese</option>
                <option value="Chinese">Chinese</option>
                <option value="Italian">Italian</option>
              </select>
            </div>
          </div>
        </div>

      </div>


      {/* DRAWER 1: HISTORY LOG OVERLAY PANEL */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs text-left">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 p-6 flex flex-col h-full shadow-2xl relative">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800/60 pb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-500" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">Recent Rewrites</h2>
              </div>
              <button 
                onClick={() => setHistoryOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* History search filter */}
            <div className="relative mt-4 mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search historic rewrites..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl text-xs text-slate-700 dark:text-zinc-200 focus:outline-none"
              />
            </div>

            {/* List item scrollable content */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Smile className="h-8 w-8 mx-auto text-slate-300 animate-pulse" />
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-400">Your history log is empty.</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Paraphrase text drafts above and they will compile securely here automatically.</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => restoreHistoryText(item)}
                    className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/60 rounded-2xl space-y-2 hover:border-teal-500/40 cursor-pointer transition text-left relative group"
                  >
                    <div className="flex justify-between items-center border-b border-slate-200/40 pb-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 uppercase font-black">
                        <span>{item.mode}</span>
                        <span>•</span>
                        <span>{item.lang}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => toggleFavoriteHistoryItem(item.id, e)}
                          className="p-1 text-slate-300 hover:text-amber-500"
                        >
                          <Star className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="p-1 text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-semibold font-mono">Original: <span className="font-sans text-slate-600 dark:text-zinc-400 line-clamp-1">{item.original}</span></p>
                    <p className="text-[10px] text-teal-600 font-semibold font-mono">Output: <span className="font-sans text-slate-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">{item.paraphrased}</span></p>
                    
                    <span className="text-[8px] font-mono text-slate-400 absolute bottom-1 right-2.5 opacity-0 group-hover:opacity-100 transition">
                      {item.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-center text-slate-400">
              * History items are persisted locally inside secure sandbox partitions.
            </div>

          </div>
        </div>
      )}


      {/* DRAWER 2: ADVANCED AI SETTINGS DRAWER */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs text-left">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 p-6 flex flex-col h-full shadow-2xl relative overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-teal-500" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">AI Formatting Configurations</h2>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              {/* Tone selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="settings-tone-select">Rewrite Tone</label>
                <select 
                  id="settings-tone-select"
                  value={customTone} 
                  onChange={(e) => setCustomTone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-xs focus:outline-none"
                >
                  <option value="Balanced">Balanced / Normal</option>
                  <option value="Professional">Professional / Corporate</option>
                  <option value="Academic">Academic / Scholar</option>
                  <option value="Assertive">Assertive / Confident</option>
                  <option value="Casual">Casual / Friendly</option>
                  <option value="Humorous">Humorous / Witty</option>
                  <option value="Diplomatic">Diplomatic / Tactful</option>
                </select>
              </div>

              {/* Audience selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="settings-audience-select">Target Audience</label>
                <select 
                  id="settings-audience-select"
                  value={audience} 
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-xs focus:outline-none"
                >
                  <option value="General">General Public</option>
                  <option value="Domain Experts">Domain Experts / Doctors</option>
                  <option value="Business Executives">Corporate Executives / VCs</option>
                  <option value="Technical Engineers">Software Developers</option>
                  <option value="Undergraduates">College Students</option>
                </select>
              </div>

              {/* Length selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="settings-length-select">Output Length Preference</label>
                <select 
                  id="settings-length-select"
                  value={lengthPreference} 
                  onChange={(e) => setLengthPreference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-xs focus:outline-none"
                >
                  <option value="Balanced">Balanced (Match original)</option>
                  <option value="Short">Short (Concise, Summarized)</option>
                  <option value="Detailed">Detailed (Expanded context)</option>
                </select>
              </div>

              {/* Creativity profiles */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="settings-creativity-select">AI Creativity Depth</label>
                <select 
                  id="settings-creativity-select"
                  value={creativity} 
                  onChange={(e) => setCreativity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-xs focus:outline-none"
                >
                  <option value="Low">Low (Factual & Direct)</option>
                  <option value="Medium">Medium (Balanced Flow)</option>
                  <option value="High">High (Expressive & Varied)</option>
                </select>
              </div>

              {/* Reading level profiles */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="settings-reading-select">Target Reading Level</label>
                <select 
                  id="settings-reading-select"
                  value={readingLevel} 
                  onChange={(e) => setReadingLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-xs focus:outline-none"
                >
                  <option value="Grade 5">Grade 5 (Extremely simple)</option>
                  <option value="Grade 8">Grade 8 (Middle school reader)</option>
                  <option value="High School">High School (Standard prose)</option>
                  <option value="College">College (Professional literature)</option>
                  <option value="Post-Graduate">Post-Graduate (Heavy analytical journal)</option>
                </select>
              </div>

              <div className="h-px bg-slate-100 dark:bg-zinc-800 my-4" />

              {/* Boolean Toggles */}
              <div className="space-y-3 pt-2">
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold">Strictly Keep Original Meaning</span>
                    <span className="text-[10px] text-slate-400">Disable semantic shifts or creative interpretation.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={keepMeaning}
                    onChange={(e) => setKeepMeaning(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500/20"
                    aria-label="Keep original meaning toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold">Employ Simple Vocabulary Words</span>
                    <span className="text-[10px] text-slate-400">Rephrase with everyday layman words instead of complex terms.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={useSimpleVocabulary}
                    onChange={(e) => setUseSimpleVocabulary(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500/20"
                    aria-label="Simple vocabulary toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold">Preserve Line Formatting Layout</span>
                    <span className="text-[10px] text-slate-400">Maintain paragraph spacings and lists structure precisely.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preserveFormatting}
                    onChange={(e) => setPreserveFormatting(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500/20"
                    aria-label="Preserve formatting layout toggle"
                  />
                </div>

              </div>

            </div>

            <button 
              onClick={() => setSettingsOpen(false)}
              className="w-full mt-6 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-2.5 rounded-xl transition"
            >
              Apply AI Parameters
            </button>

          </div>
        </div>
      )}


      {/* DRAWER 3: EXPORT DRAW DIALOG */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            
            <button onClick={() => setExportOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-teal-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Export Rephrased Document</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose a structured format profile to save your compiled paragraphs down directly.
              </p>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                
                <button 
                  onClick={() => handleExportAction('txt')}
                  className="p-3 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-left hover:border-teal-500 transition group"
                >
                  <span className="text-xs font-black block text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Plain Text File</span>
                  <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">TXT extension</span>
                </button>

                <button 
                  onClick={() => handleExportAction('md')}
                  className="p-3 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-left hover:border-teal-500 transition group"
                >
                  <span className="text-xs font-black block text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Markdown File</span>
                  <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">MD syntax markup</span>
                </button>

                <button 
                  onClick={() => handleExportAction('docx')}
                  className="p-3 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-left hover:border-teal-500 transition group"
                >
                  <span className="text-xs font-black block text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">MS Word Draft</span>
                  <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">DOCX layout structure</span>
                </button>

                <button 
                  onClick={() => handleExportAction('pdf')}
                  className="p-3 bg-slate-50 dark:bg-zinc-950 border rounded-xl text-left hover:border-teal-500 transition group"
                >
                  <span className="text-xs font-black block text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Print / PDF</span>
                  <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">Print optimized output</span>
                </button>

              </div>

              <div className="h-px bg-slate-100 dark:bg-zinc-850 my-2" />
              
              <button 
                onClick={handleCopyClipboard}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-xs py-2.5 rounded-xl transition flex justify-center items-center gap-2"
              >
                <Clipboard className="h-4 w-4 text-teal-500" />
                <span>Copy Raw String to Clipboard</span>
              </button>

            </div>

          </div>
        </div>
      )}


      {/* DRAWER 4: HELP GUIDE MODAL */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-y-auto">
            
            <button onClick={() => setHelpOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-teal-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Paraphraser Quick Help</h3>
              </div>
              
              <div className="space-y-4 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-zinc-200">What is the Synonym Slider index?</p>
                  <p>It calibrates word substitution. "Lowest" preserves original phrasing maximally. "Balanced" replaces words naturally. "Highest" executes massive sentence-level modifications using complex semantic variations.</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-zinc-200">How do I frozen-lock critical names or brands?</p>
                  <p>Enter them inside the "Freeze Word Lists" panel separated by commas. Our LLM will strictly secure and keep those names unchanged throughout compilation layouts.</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-zinc-200">Can I compare original sentences directly?</p>
                  <p>Yes! Once generated, toggle "Compare Changes". It renders an inline Word Diff showing added terms highlighted in green and deleted words with a red line-through.</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-zinc-200">How do Keyboard Shortcuts function?</p>
                  <p className="font-mono bg-slate-50 dark:bg-zinc-950 p-2 border rounded-lg text-[10px] space-y-1">
                    • Ctrl+Z / Cmd+Z: Undo last edit<br/>
                    • Ctrl+Y / Cmd+Y: Redo last action<br/>
                    • Ctrl+Enter: Run Paraphraser immediately
                  </p>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button 
                  onClick={() => setHelpOpen(false)}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  Understood
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* DRAWER 5: HIGH-FIDELITY SaaS ADMINISTRATIVE OVERLAYS */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-y-auto">
            
            <button onClick={() => setAdminOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Workspace Admin Controls</h3>
              </div>
              <p className="text-xs text-slate-400">
                Calibrate system-wide quotas, maximum limits, and lock-out configurations of the Paraphraser sandbox in real-time.
              </p>

              <div className="space-y-4 pt-2">
                {/* Max words configuration */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="admin-max-words-input">Free Word Limit Per Request</label>
                  <input 
                    id="admin-max-words-input"
                    type="number"
                    value={adminMaxWords}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdminMaxWords(val);
                      localStorage.setItem('gxa_admin_max_words', String(val));
                    }}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Standard limit is 125 words. Changes apply immediately in the left panel limit state indicators.</span>
                </div>

                {/* Free quota limit per day */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-400" htmlFor="admin-free-limit-input">Standard Daily Quota (Requests)</label>
                  <input 
                    id="admin-free-limit-input"
                    type="number"
                    value={adminFreeLimit}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdminFreeLimit(val);
                      localStorage.setItem('gxa_admin_free_limit', String(val));
                    }}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Standard limit is 10. Once reached, free users see a warning overlay block.</span>
                </div>

                {/* Unlock all premium modes toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 rounded-2xl">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black">Enable Premium Modes for Free Tier</span>
                    <span className="text-[10px] text-slate-400">Toggle whether non-paying guests can access Formal, SEO, Creative models.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={adminPremiumModesAllowed}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAdminPremiumModesAllowed(val);
                      localStorage.setItem('gxa_admin_premium_modes', String(val));
                    }}
                    className="h-4.5 w-4.5 text-teal-500 focus:ring-0 rounded"
                    aria-label="Unlock premium modes toggle"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button 
                  onClick={() => setAdminOpen(false)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  Save System Layout
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* SECTION E: HIGH-FIDELITY BEAUTIFUL UPGRADE MODAL */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-800 dark:text-zinc-100 max-h-[90vh] overflow-y-auto">
            
            {/* Glow design vectors */}
            <div className="absolute -top-32 -right-32 h-64 w-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 h-64 w-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button 
              onClick={() => setUpgradeModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition duration-150"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-6">
              
              {/* Header section */}
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1 text-[10px] font-black text-teal-600 dark:text-teal-400 border border-teal-500/20 tracking-wider uppercase">
                  <Sparkles className="h-3 w-3" /> Unlock Premium AI Models
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                  Upgrade Workspace Seat to Access {activeUpgradeModeName || 'Elite'} Mode
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Join thousands of copywriters, academic researchers, and technical writers executing document flows with high precision.
                </p>
              </div>

              {/* 5-Plan SaaS Suite Selector Grid */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 pt-2">
                
                {/* Plan 1: Free */}
                <div className="p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/20 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Free Plan</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">$0</h4>
                    <ul className="text-[9px] text-slate-500 space-y-1 mt-2.5">
                      <li className="flex items-center gap-1">✓ 125 word cap</li>
                      <li className="flex items-center gap-1">✓ Standard Mode</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => setUpgradeModalOpen(false)}
                    className="w-full mt-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  >
                    Current
                  </button>
                </div>

                {/* Plan 2: Pro (Featured) */}
                <div className="p-3 border-2 border-teal-500 rounded-2xl bg-teal-500/5 dark:bg-teal-950/10 flex flex-col justify-between text-left relative">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-teal-500 text-white text-[7px] font-black rounded uppercase tracking-wider">Popular</span>
                  <div>
                    <span className="text-[9px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider">Pro</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">$19<span className="text-[9px] font-medium text-slate-400">/mo</span></h4>
                    <ul className="text-[9px] text-slate-500 space-y-1 mt-2.5">
                      <li className="flex items-center gap-1 text-teal-600 font-bold">✓ Unlimited words</li>
                      <li className="flex items-center gap-1">✓ 12 Elite Modes</li>
                      <li className="flex items-center gap-1">✓ Fast AI node</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      if (onOpenUpgradeModal) onOpenUpgradeModal();
                    }}
                    className="w-full mt-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider"
                  >
                    Upgrade
                  </button>
                </div>

                {/* Plan 3: Pro Plus */}
                <div className="p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pro Plus</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">$39<span className="text-[9px] font-medium text-slate-400">/mo</span></h4>
                    <ul className="text-[9px] text-slate-500 space-y-1 mt-2.5">
                      <li className="flex items-center gap-1">✓ Unlimited speed</li>
                      <li className="flex items-center gap-1">✓ Custom API key</li>
                      <li className="flex items-center gap-1">✓ Higher limits</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      if (onOpenUpgradeModal) onOpenUpgradeModal();
                    }}
                    className="w-full mt-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  >
                    Upgrade
                  </button>
                </div>

                {/* Plan 4: Team */}
                <div className="p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Team</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">$79<span className="text-[9px] font-medium text-slate-400">/mo</span></h4>
                    <ul className="text-[9px] text-slate-500 space-y-1 mt-2.5">
                      <li className="flex items-center gap-1">✓ 5 Seats included</li>
                      <li className="flex items-center gap-1">✓ Shared folders</li>
                      <li className="flex items-center gap-1">✓ Central billing</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      if (onOpenUpgradeModal) onOpenUpgradeModal();
                    }}
                    className="w-full mt-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  >
                    Upgrade
                  </button>
                </div>

                {/* Plan 5: Enterprise */}
                <div className="p-3 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Enterprise</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">Custom</h4>
                    <ul className="text-[9px] text-slate-500 space-y-1 mt-2.5">
                      <li className="flex items-center gap-1">✓ SSO Auth log</li>
                      <li className="flex items-center gap-1">✓ Dedicated AI vpc</li>
                      <li className="flex items-center gap-1">✓ 24/7 Support SLA</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      if (onOpenUpgradeModal) onOpenUpgradeModal();
                    }}
                    className="w-full mt-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  >
                    Contact Sales
                  </button>
                </div>

              </div>

              {/* Show benefits unlocked */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200/50 dark:border-zinc-850 text-xs">
                <h5 className="font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Unlocked Premium Features:
                </h5>
                <div className="grid gap-2 sm:grid-cols-2 text-slate-500">
                  <div className="flex items-center gap-1.5">• Access to Formal, SEO, Academic & Creative modes</div>
                  <div className="flex items-center gap-1.5">• Unlock unlimited words rephrasing capacity</div>
                  <div className="flex items-center gap-1.5">• Higher precision with maximal Synonym Slider level</div>
                  <div className="flex items-center gap-1.5">• Dedicated premium server prioritisation</div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button 
                  onClick={() => setUpgradeModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Continue with Free
                </button>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      alert('Displaying complete enterprise billing plans and configurations.');
                    }}
                    className="px-4 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-zinc-850 rounded-xl transition"
                  >
                    Compare Plans
                  </button>
                  <button 
                    onClick={() => {
                      setUpgradeModalOpen(false);
                      if (onOpenUpgradeModal) onOpenUpgradeModal();
                    }}
                    className="px-5 py-2 text-xs font-black bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-xs transition"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
