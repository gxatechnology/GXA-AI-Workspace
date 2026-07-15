import React, { useState, useEffect, useRef } from 'react';
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
  FileSignature
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

// ==========================================
// DATA STRUCTURES & DEFINITIONS
// ==========================================

interface TemplateItem {
  id: string;
  name: string;
  desc: string;
  placeholderPrompt: string;
  systemInstruction: string;
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
}

export default function AIWriting({ currentUser, onOpenUpgradeModal }: AIWritingProps) {
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
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('ai-writer');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<string[]>(['ai-writer']);

  // Document Editor State
  const [editorTitle, setEditorTitle] = useState<string>('');
  const [editorContent, setEditorContent] = useState<string>('');
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

  const [promptInput, setPromptInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingOutput, setStreamingOutput] = useState<string>('');
  const [isAborted, setIsAborted] = useState<boolean>(false);

  // Projects State
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-default');

  // Prompt Library State
  const [promptLibrary, setPromptLibrary] = useState<SavedPrompt[]>([
    { id: 'lib-1', title: 'SEO SaaS Outline', prompt: 'Create a highly scannable, detailed blog outline targeting developer tooling and edge caches.', favorite: true },
    { id: 'lib-2', title: 'Technical Thesis Statement', prompt: 'Write a persuasive research statement arguing the scalability of local state-machines in browser-based runtimes.', favorite: false }
  ]);
  const [newPromptTitle, setNewPromptTitle] = useState<string>('');
  const [newPromptText, setNewPromptText] = useState<string>('');
  const [showPromptLibraryModal, setShowPromptLibraryModal] = useState<boolean>(false);

  // Version History State
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [comparingVersionId, setComparingVersionId] = useState<string | null>(null);

  // Copy Feedback state
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Admin Variables
  const [adminConfig, setAdminConfig] = useState({
    defaultModel: 'gemini-3.5-flash',
    maxFreeGenerations: 10,
    maxFreeWordCount: 500,
    rateLimitMinute: 60
  });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<boolean>(false);

  // ==========================================
  // TEMPLATES DATABASE BY CATEGORIES
  // ==========================================
  const [categories] = useState<TemplateCategory[]>([
    {
      id: 'general',
      name: 'General Writing',
      icon: Sparkles,
      templates: [
        { id: 'ai-writer', name: 'AI Writer', desc: 'General-purpose intelligent draft generator.', placeholderPrompt: 'Write a comprehensive guide explaining the foundational mechanics of WebAssembly.', systemInstruction: 'You are an elite, highly clear technical content author. Draft fully formed structural guidelines.' },
        { id: 'blog-writer', name: 'Blog Writer', desc: 'SEO-friendly creative blog drafts with headings.', placeholderPrompt: 'Draft an article titled "The Rise of Local-First Web Frameworks in 2026"', systemInstruction: 'You are a professional technology blogger. Write in an engaging, approachable tone with clean layout blocks, bold terms, and lists.' },
        { id: 'article-writer', name: 'Article Writer', desc: 'Journalistic style analytical long-form articles.', placeholderPrompt: 'Analyze the impact of global decentralized storage standardizations.', systemInstruction: 'You are a veteran staff journalist. Present objective, deeply researched, structured copy.' },
        { id: 'essay-writer', name: 'Essay Writer', desc: 'Persuasive, argumentative, or academic essays.', placeholderPrompt: 'Draft a persuasive essay debating the social implications of automated physical drone logistics.', systemInstruction: 'You are a university humanities professor. Construct rigorous arguments with robust logical flow.' },
        { id: 'story-writer', name: 'Story Writer', desc: 'Immersive creative storytelling.', placeholderPrompt: 'A short atmospheric sci-fi narrative about a subsea colony detecting anomalous geothermal radio codes.', systemInstruction: 'You are an award-winning speculative fiction author. Create rich visual imagery, depth, and suspense.' },
        { id: 'book-writer', name: 'Book Writer', desc: 'Compile rich outline drafts, prologues, and chapter summaries.', placeholderPrompt: 'Draft a outline and prologue for a techno-thriller detailing a decentralized banking hack.', systemInstruction: 'You are an expert novelist. Emphasize pacing, characters, and logical tension.' },
        { id: 'newsletter', name: 'Newsletter Draft', desc: 'Highly engaging email dispatches and circulars.', placeholderPrompt: 'Write a monthly developer newsletter detailing WebGPU integrations and React 19 hooks.', systemInstruction: 'You are a community builder. Create friendly, structured newsletter columns with bold headlines.' },
        { id: 'speech', name: 'Speech Writer', desc: 'Keynote and presentation templates.', placeholderPrompt: 'Write a 5-minute keynote address launching a sustainable green server workspace.', systemInstruction: 'You are an executive speechwriter. Frame concepts with memorable pacing, structural pauses, and strong hooks.' },
        { id: 'script', name: 'Script Writer', desc: 'Audiovisual media, youtube script templates.', placeholderPrompt: 'Draft a detailed technical explainer script for a video about "Why Garbage Collection slow-downs happen".', systemInstruction: 'You are an engaging media producer. Use distinct audio/visual prompts and narrations.' }
      ]
    },
    {
      id: 'academic',
      name: 'Academic Writing',
      icon: GraduationCap,
      templates: [
        { id: 'research-paper', name: 'Research Paper', desc: 'Compile academic structures, methods, or abstracts.', placeholderPrompt: 'Draft the methodology section of a study measuring carbon capture tax elasticities.', systemInstruction: 'You are a principal university investigator. Adopt highly formal, scientifically rigorous structures.' },
        { id: 'academic-abstract', name: 'Abstract Builder', desc: 'Precise summaries of large manuscripts.', placeholderPrompt: 'Synthesize a study testing solid-state battery thermal performance into a 250-word abstract.', systemInstruction: 'You are a peer-review editor. Create concise abstracts specifying context, method, results, and impact.' },
        { id: 'literature-review', name: 'Literature Review', desc: 'Conceptually group and contrast research studies.', placeholderPrompt: 'Create a literature review outlining advancements in LLM reinforcement learning from 2024 to 2026.', systemInstruction: 'You are a materials science academic. Group studies logically and point out current knowledge gaps.' },
        { id: 'assignment', name: 'Academic Assignment', desc: 'Tackle course questions, essays, and problems.', placeholderPrompt: 'Draft a clear solution outline exploring key differences between Keynesian and Monetarist economic models.', systemInstruction: 'You are a senior academic tutor. Supply accurate, well-referenced definitions and arguments.' },
        { id: 'case-study', name: 'Case Study Draft', desc: 'In-depth real-world scenario analysis.', placeholderPrompt: 'Analyze the operational turnaround of a decentralized manufacturing plant during a supply bottleneck.', systemInstruction: 'You are a business school case author. Group data by problem, analysis, and strategic resolution.' },
        { id: 'thesis-gen', name: 'Thesis Statement', desc: 'Construct highly arguable, specific thesis lines.', placeholderPrompt: 'Generate a PhD-level thesis statement evaluating decentralized zero-knowledge identity tokens.', systemInstruction: 'You are a graduate supervisor. Deliver statements that are arguable, specific, and clear.' },
        { id: 'dissertation', name: 'Dissertation Outline', desc: 'Rigorous long-form chapter structures.', placeholderPrompt: 'Formulate a dissertation outline on peer-to-peer latency models in serverless contexts.', systemInstruction: 'You are a technical research committee lead. Draft highly detailed, multi-level chapters.' },
        { id: 'citation-builder', name: 'Citation Builder', desc: 'Format and structure citations cleanly (APA, MLA, Chicago).', placeholderPrompt: 'Format citation: Book by Author J. Watson, title "Decentralized Networks", published 2025 by TechPress.', systemInstruction: 'You are an academic bibliography reference tool. Output exact, pristine academic citation alignments.' }
      ]
    },
    {
      id: 'business',
      name: 'Business Writing',
      icon: Briefcase,
      templates: [
        { id: 'biz-proposal', name: 'Business Proposal', desc: 'Persuasive client project proposals.', placeholderPrompt: 'Formulate a SaaS integration proposal for an enterprise global supply-chain platform.', systemInstruction: 'You are a business development director. Focus on requirements, cost metrics, ROI models, and SLAs.' },
        { id: 'biz-plan', name: 'Business Plan', desc: 'Formal corporate plans for stakeholders and VCs.', placeholderPrompt: 'Create a strategic outline for a cloud-based local storage virtualization company.', systemInstruction: 'You are a startup financial consultant. Synthesize operations, marketing channels, and unit economics.' },
        { id: 'invoice-notes', name: 'Invoice Builder', desc: 'Text-based transaction logs and outlines.', placeholderPrompt: 'Draft professional invoice descriptions for 16 hours of consulting on high-scale database migrations.', systemInstruction: 'You are a corporate accountant. Write clear, detailed, and polite invoice items.' },
        { id: 'meeting-notes', name: 'Meeting Notes', desc: 'Executive summaries of raw call transcripts.', placeholderPrompt: 'Summarize transcript: Discussed deployment delay; team decided to deprecate Node 18, assign Rust to Dave.', systemInstruction: 'You are a project coordinator. Highlight clear milestones, action items, and task owners.' },
        { id: 'minutes', name: 'Minutes of Meeting', desc: 'Official record of executive and board meetings.', placeholderPrompt: 'Record formal decisions from the GXA Technologies annual board sync.', systemInstruction: 'You are an official board secretary. Use a passive, highly objective, and structured layout.' },
        { id: 'company-profile', name: 'Company Profile', desc: 'Polished introductions for brand assets.', placeholderPrompt: 'Write a compelling company profile describing GXA AI Suite’s mission to unify technical writing.', systemInstruction: 'You are a senior brand strategist. Balance technical precision with visionary positioning.' }
      ]
    },
    {
      id: 'career',
      name: 'Career & Resume',
      icon: FileSignature,
      templates: [
        { id: 'resume-builder', name: 'Resume Builder', desc: 'Structured professional CV bullet points.', placeholderPrompt: 'Draft resume entries for a Staff DevOps Engineer with 7 years of AWS and Docker expertise.', systemInstruction: 'You are an executive CV consultant. Write action-oriented bullet points emphasizing quantitative metrics.' },
        { id: 'resume-optimizer', name: 'Resume Optimizer', desc: 'Tailor resume bullets to bypass ATS filters.', placeholderPrompt: 'Align these points to match a Staff Engineer job listing highlighting Kubernetes, Go, and scale.', systemInstruction: 'You are an ATS parser expert. Inject natural keywords, focus on impact, and eliminate empty fluff.' },
        { id: 'cover-letter', name: 'Cover Letter', desc: 'Bespoke, role-specific career letters.', placeholderPrompt: 'Write a cover letter applying for a Principal AI Engineer position focusing on serverless inference.', systemInstruction: 'You are a career advocate. Write high-conversion, highly personalized letter formats.' },
        { id: 'sop-builder', name: 'SOP Builder (SOP)', desc: 'Persuasive Statement of Purpose drafts.', placeholderPrompt: 'Create a Statement of Purpose for admission to a Master’s program in Decentralized Computing.', systemInstruction: 'You are an admissions advisory expert. Construct a compelling narrative of academic milestones and goals.' },
        { id: 'lor-builder', name: 'Letter of Recommendation', desc: 'Structured peer and supervisor recommendations.', placeholderPrompt: 'Write a recommendation letter for a senior software analyst demonstrating outstanding backend design.', systemInstruction: 'You are a senior technology manager. Use authentic, high-praise professional feedback and examples.' }
      ]
    },
    {
      id: 'marketing',
      name: 'Marketing Copy',
      icon: Mail,
      templates: [
        { id: 'landing-page', name: 'Landing Page Copy', desc: 'High-conversion hero sections and sales hooks.', placeholderPrompt: 'Write copy for a developer-centric workspace with secure local vaults and instant compile keys.', systemInstruction: 'You are a premium digital marketing copywriter. Craft high-impact hero titles, value props, and active CTAs.' },
        { id: 'sales-copy', name: 'Sales Copy', desc: 'Persuasive customer acquisition copy.', placeholderPrompt: 'Create a sales script highlighting time savings from local-first AI translation caches.', systemInstruction: 'You are an expert sales marketer. Apply the AIDA (Attention, Interest, Desire, Action) structure.' },
        { id: 'google-ads', name: 'Google Ads', desc: 'High-CTR search titles and descriptions.', placeholderPrompt: 'Create 3 Google Ads promoting GXA AI Suite with 30-char headlines and 90-char descriptions.', systemInstruction: 'You are a certified digital search specialist. Focus strictly on CTR hooks, keywords, and length parameters.' },
        { id: 'seo-article', name: 'SEO Article', desc: 'Structure content specifically to rank on Google search queries.', placeholderPrompt: 'Draft an outline and intro for "How to optimize server-side rendering for complex databases"', systemInstruction: 'You are an SEO optimization authority. Incorporate structural H1/H2 headers and natural keyword clusters.' }
      ]
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: Globe,
      templates: [
        { id: 'linkedin-post', name: 'LinkedIn Post', desc: 'Thought leadership updates and insights.', placeholderPrompt: 'Share a story about debugging a critical race condition under extreme pressure on launch day.', systemInstruction: 'You are a tech CEO. Write spacing-optimized, highly engaging LinkedIn copy encouraging community answers.' },
        { id: 'twitter-x', name: 'Twitter/X Thread', desc: 'Compact, engaging viral information threads.', placeholderPrompt: 'Write a 4-tweet educational thread explaining why local caches outperform centralized endpoints.', systemInstruction: 'You are a modern tech educator. Maintain brevity, clear bullet points, and high educational value.' },
        { id: 'instagram-caption', name: 'Instagram Caption', desc: 'Aesthetic captions with targeted hashtags.', placeholderPrompt: 'Draft a clean caption for a minimalist mechanical keyboard layout.', systemInstruction: 'You are a creative social strategist. Focus on short visual setups, subtle emojis, and clean hashtags.' }
      ]
    },
    {
      id: 'creative',
      name: 'Creative Writing',
      icon: PenTool,
      templates: [
        { id: 'poem', name: 'Poem Generator', desc: 'Rhyming or free-verse classical poetry.', placeholderPrompt: 'A sonnet celebrating the silence of complex data centers in deep underground chambers.', systemInstruction: 'You are a modern poet. Focus on sensory, rich metaphors, timing, and structure.' },
        { id: 'lyrics', name: 'Lyrics Generator', desc: 'Song lyrics matching specific musical themes.', placeholderPrompt: 'Draft synth-wave lyrics exploring lonely highways and futuristic neon horizons.', systemInstruction: 'You are an expert songwriter. Focus on rhythm, verse-chorus balance, and vivid emotional cues.' }
      ]
    },
    {
      id: 'developer',
      name: 'Developer Tools',
      icon: FileCode,
      templates: [
        { id: 'api-doc', name: 'API Documentation', desc: 'Prinstine, clear REST or GraphQL endpoint docs.', placeholderPrompt: 'Document a POST endpoint /api/v1/translate that accepts language, text, and cache flags.', systemInstruction: 'You are a Staff Technical Writer. Write beautiful Markdown API documentation with clear request/response JSON blocks.' },
        { id: 'readme-gen', name: 'README Builder', desc: 'Professional open-source landing files.', placeholderPrompt: 'Write a comprehensive README for a fast client-side SQLite virtualizer.', systemInstruction: 'You are an open-source advocate. Present features, installation, clean code snippet setups, and licensing.' },
        { id: 'prompt-writing', name: 'Prompt Optimizer', desc: 'Transform simple ideas into rich instruction blocks.', placeholderPrompt: 'Optimize a basic prompt: "Summarize this log file"', systemInstruction: 'You are a prompt engineer. Supply rigorous system instructions with role, context, task constraints, and format blocks.' }
      ]
    }
  ]);

  // All templates flat array for quick search and commands
  const allTemplates = categories.flatMap(c => c.templates.map(t => ({ ...t, category: c.name })));

  const activeTemplate = allTemplates.find(t => t.id === activeTemplateId) || allTemplates[0];

  // ------------------------------------------
  // INITIALIZATION & LIMITS
  // ------------------------------------------
  useEffect(() => {
    const loadLimits = async () => {
      try {
        const sysConfig = await fetchSystemConfig();
        setConfig(sysConfig);
        const user = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
        if (user) {
          setIsPremium(isUserPremium(user));
          setPlanType(user.plan || (isUserPremium(user) ? 'pro' : 'free'));
          const userUsage = await fetchUsage(user.email);
          setUsage(userUsage);
        } else {
          setIsPremium(false);
          setPlanType('free');
          const guestUsage = await fetchUsage('guest');
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
          headers: { 'Authorization': `Bearer ${user.email}` }
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

    // Load Local storage states
    try {
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
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  };

  // Undo / Redo mechanics
  const handleEditorChange = (val: string) => {
    setUndoStack(prev => [...prev, editorContent].slice(-50)); // Limit history to 50
    setRedoStack([]);
    setEditorContent(val);
    localStorage.setItem('gxa_writer_active_content', val);

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

    // Update Auto Save indicator
    const now = new Date();
    setLastAutoSaved(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string || '';
      setEditorTitle(file.name.replace(/\.[^/.]+$/, ""));
      handleEditorChange(text);
    };
    reader.readAsText(file);
  };

  // ------------------------------------------
  // AI STREAMING GENERATION CORE
  // ------------------------------------------
  const runAiGeneration = async (mode: 'generate' | 'continue' | 'improve' | 'expand' | 'shorten' | 'rewrite' | 'inline' = 'generate', customPrompt = '') => {
    // Limits Evaluation
    const dailyChatsLimit = isPremium ? Infinity : (config?.ai_chats_limit || 5);
    const chatsExecuted = usage?.chats || 0;
    if (!isPremium && chatsExecuted >= dailyChatsLimit) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setStreamingOutput('');
    cancelRef.current = false;
    setIsAborted(false);

    const savedUser = localStorage.getItem('gxa_user');
    const userEmail = savedUser ? JSON.parse(savedUser).email : 'guest';

    // Build context-rich instructional block
    let instructionContext = `You are a world-class AI Writing Studio Engine inside the elite GXA technologies workspace.
Role: ${activeTemplate.name}
Core instructions: ${activeTemplate.systemInstruction}

Parameter matrix:
- Target Purpose: ${purpose.toUpperCase()}
- Content Tone: ${tone.toUpperCase()}
- Intended Audience: ${audience.toUpperCase()}
- Language Output: ${targetLanguage}
- Creative Temperature: ${creativity.toUpperCase()}
- Professional Expertise Level: ${professionalLevel.toUpperCase()}
- Writing Style: ${writingStyle.toUpperCase()}
- Reading Level: ${readingLevel.toUpperCase()}
- Focus Keywords: ${keywordsInput}
`;

    let activePrompt = promptInput.trim() || activeTemplate.placeholderPrompt;
    let finalPrompt = '';

    if (mode === 'generate') {
      finalPrompt = `${instructionContext}\nTask: Produce a complete, stunning, highly-refined draft based on user prompt: "${activePrompt}". Use clear structure, bullet items, bold headings and rich markdown formatting where necessary. Avoid empty descriptions.`;
    } else if (mode === 'continue') {
      finalPrompt = `${instructionContext}\nTask: Expand upon and continue writing the following existing text smoothly and cohesively. Match the style and vocabulary precisely:\n\n"${editorContent}"`;
    } else if (mode === 'improve') {
      finalPrompt = `${instructionContext}\nTask: Enhance, clarify, fix mechanical syntax errors, and improve vocabulary in this document:\n\n"${editorContent}"`;
    } else if (mode === 'expand') {
      finalPrompt = `${instructionContext}\nTask: Expand this draft significantly, providing granular details, examples, and deep explanation:\n\n"${editorContent}"`;
    } else if (mode === 'shorten') {
      finalPrompt = `${instructionContext}\nTask: Compress this draft into a concise, direct, high-impact version with zero fluff:\n\n"${editorContent}"`;
    } else if (mode === 'rewrite') {
      finalPrompt = `${instructionContext}\nTask: Completely rewrite the following document text, adopting a different structural layout but maintaining the core underlying arguments:\n\n"${editorContent}"`;
    } else if (mode === 'inline') {
      finalPrompt = `${instructionContext}\nTask: Refine and rewrite this specific paragraph based on the instruction: "${customPrompt}". Content: "${highlightedText}"`;
    }

    try {
      const rawResponse = await generateContent({
        prompt: finalPrompt,
        systemInstruction: "You are the premium AI Document Assistant. Return exclusively your written draft or requested refinement. Always output structured, clean, publication-ready Markdown."
      });

      // Streaming typing speed effect simulator
      let textIndex = 0;
      const step = Math.ceil(rawResponse.length / 30) || 2;
      const streamTimer = setInterval(async () => {
        if (cancelRef.current) {
          clearInterval(streamTimer);
          setLoading(false);
          setIsAborted(true);
          return;
        }

        textIndex += step;
        if (textIndex >= rawResponse.length) {
          clearInterval(streamTimer);
          setStreamingOutput('');
          
          if (mode === 'inline') {
            // Replace highlighted selection or place inline
            if (selectionRange && editorRef.current) {
              const start = selectionRange.start;
              const end = selectionRange.end;
              const nextContent = editorContent.substring(0, start) + rawResponse + editorContent.substring(end);
              handleEditorChange(nextContent);
            } else {
              handleEditorChange(editorContent + '\n\n' + rawResponse);
            }
            setShowInlineMenu(false);
          } else {
            handleEditorChange(rawResponse);
          }

          // Create auto Snapshot in Version History
          const newVersion: DocumentVersion = {
            id: `v-${Date.now()}`,
            title: `${activeTemplate.name} Revision (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
            content: rawResponse,
            timestamp: Date.now()
          };
          const updatedVersions = [newVersion, ...versions].slice(0, 30); // Keep up to 30
          setVersions(updatedVersions);
          saveLocalContext('gxa_writer_versions', updatedVersions);

          // Update recent list
          const nextRecent = [activeTemplateId, ...recentTemplates.filter(id => id !== activeTemplateId)].slice(0, 6);
          setRecentTemplates(nextRecent);
          saveLocalContext('gxa_writer_recent', nextRecent);

          // Increment AI usage limit counters
          if (!isPremium && userEmail !== 'guest') {
            const updatedUsage = await incrementUsage(userEmail, 'chats');
            setUsage(updatedUsage);
          }
          setLoading(false);
        } else {
          setStreamingOutput(rawResponse.slice(0, textIndex));
        }
      }, 20);

    } catch (e) {
      setLoading(false);
      setStreamingOutput('Generation timed out. Verify your API Key and workspace limits under the settings menu.');
    }
  };

  const handleCancelGeneration = () => {
    cancelRef.current = true;
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
      setActiveTemplateId(templateId);
      setPromptInput(selected.placeholderPrompt);
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
    const filename = `${editorTitle || activeTemplate.name || 'document'}.${format}`;
    let outputData = '';
    let mimeType = 'text/plain';

    if (format === 'html') {
      mimeType = 'text/html';
      outputData = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${editorTitle || activeTemplate.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1, h2, h3 { color: #111827; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; }
    code { font-family: monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${editorTitle || activeTemplate.name}</h1>
  <div>${editorContent.replace(/\n/g, '<br />')}</div>
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

  // ------------------------------------------
  // SELECTION FILTER
  // ------------------------------------------
  const getFilteredTemplates = () => {
    return allTemplates.filter(t => 
      t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(templateSearchQuery.toLowerCase())
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
                <span className="block font-bold">Remaining Writes: <strong className="text-indigo-600 dark:text-indigo-400">{Math.max(0, (config?.ai_chats_limit || 5) - (usage?.chats || 0))}</strong></span>
                <span className="block font-bold">Word Limit / draft: <strong className="text-indigo-600 dark:text-indigo-400">{adminConfig.maxFreeWordCount} words</strong></span>
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
              ● PROMPT PIPELINES ONLINE
            </span>
            <button 
              onClick={() => setShowAdminModal(true)}
              className="p-2 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-850 transition"
              title="Studio Configuration"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

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
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTemplateId(tool.id);
                      setPromptInput(tool.placeholderPrompt);
                      setMobileTab('editor');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                      activeTemplateId === tool.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'
                    }`}
                  >
                    <span className="truncate">{tool.name}</span>
                    <button 
                      onClick={(e) => toggleFavoriteTemplate(tool.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-amber-500 transition"
                    >
                      <Bookmark className={`h-3 w-3 ${favoritesList.includes(tool.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </button>
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
                            setActiveTemplateId(tool.id);
                            setPromptInput(tool.placeholderPrompt);
                            setMobileTab('editor');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                            activeTemplateId === tool.id 
                              ? 'bg-indigo-600 text-white' 
                              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'
                          }`}
                        >
                          <span className="truncate">{tool.name}</span>
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
                          <button
                            key={tool.id}
                            onClick={() => {
                              setActiveTemplateId(tool.id);
                              setPromptInput(tool.placeholderPrompt);
                              setMobileTab('editor');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                              activeTemplateId === tool.id 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'
                            }`}
                          >
                            <span className="truncate">{tool.name}</span>
                            <span 
                              onClick={(e) => toggleFavoriteTemplate(tool.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-amber-500 transition shrink-0"
                            >
                              <Bookmark className={`h-3 w-3 ${favoritesList.includes(tool.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            </span>
                          </button>
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
                onClick={() => {
                  const name = prompt('Enter new Project Name:');
                  if (name) setProjects(p => [...p, { id: `p-${Date.now()}`, name }]);
                }}
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

            {/* The Main Distraction Free Editor */}
            <div className="flex-1 flex flex-col relative min-h-[250px]">
              {editorContent ? (
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
                      onClick={() => handleEditorChange('# Dynamic Title\nStart writing details here...')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition"
                    >
                      Start Scratchpad
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTemplateId('blog-writer');
                        setPromptInput('Write a detailed article about local-first computing.');
                        setMobileTab('sidebar');
                      }}
                      className="border border-slate-200 dark:border-zinc-800 text-[10px] font-bold py-1.5 px-3 rounded-lg text-slate-500"
                    >
                      Browse Templates
                    </button>
                  </div>
                </div>
              )}

              {/* Streaming Output overlay typing loader */}
              {loading && streamingOutput && (
                <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 p-8 text-xs font-sans leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-zinc-200 overflow-y-auto border border-indigo-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-4 text-indigo-500 font-bold font-mono">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI Generation Streaming...</span>
                  </div>
                  {streamingOutput}
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
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(editorContent);
                      setCopiedFormat('copy');
                      setTimeout(() => setCopiedFormat(null), 1200);
                    }}
                    className="hover:text-indigo-500 p-1 rounded"
                    title="Copy All"
                  >
                    {copiedFormat === 'copy' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => exportDocument('txt')} className="hover:text-indigo-400 p-1 rounded" title="Export Text">TXT</button>
                  <button onClick={() => exportDocument('md')} className="hover:text-indigo-400 p-1 rounded" title="Export Markdown">MD</button>
                  <button onClick={() => exportDocument('html')} className="hover:text-indigo-400 p-1 rounded" title="Export HTML">HTML</button>
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
                <option value="describe">Descriptive (Sensory & Atmosphere)</option>
                <option value="instruct">Instructional (Steps & Guidelines)</option>
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
                <option value="humorous">Humorous (Witty/Engaging)</option>
                <option value="authoritative">Authoritative (Expert outline)</option>
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
                <option value="Japanese">Japanese (日本語)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
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
      {showAdminModal && (
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
                  <span className="text-3xl font-black text-slate-900 dark:text-white">₹999</span>
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
