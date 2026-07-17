import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Trash2, 
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  ArrowRight,
  FolderPlus,
  Folder,
  Pin,
  Archive,
  Search,
  Plus,
  Share2,
  Trash,
  FileText,
  Paperclip,
  Mic,
  Image as ImageIcon,
  FileDown,
  ChevronRight,
  Maximize2,
  Bookmark,
  Sparkle,
  MoreVertical,
  X,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  Flame,
  Settings,
  Eye,
  ChevronDown,
  Sparkles as SparklesIcon,
  HelpCircle as HelpIcon,
  ShieldAlert,
  Sliders,
  CheckSquare,
  Zap,
  BookOpen,
  CornerDownLeft,
  Share,
  Download,
  Terminal,
  Grid,
  Info,
  ExternalLink,
  Table,
  Cpu
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
// INTERFACES & TYPES
// ==========================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedDocs?: string[];
  isPinned?: boolean;
  isBookmarked?: boolean;
  id: string;
}

export interface ChatThread {
  id: string;
  title: string;
  projectId?: string;
  folderId?: string;
  messages: Message[];
  pinned: boolean;
  archived: boolean;
  trash: boolean;
  isTemporary?: boolean;
  model: string;
  createdAt: number;
  updatedAt: number;
  tokensUsed?: number;
}

export interface FolderType {
  id: string;
  name: string;
  color?: string;
}

export interface ProjectType {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  status: string;
}

export interface ChatFile {
  id: string;
  name: string;
  type: string;
  size: string;
  progress: number;
  content?: string;
  previewUrl?: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: 'Writing' | 'Summarizing' | 'Brainstorming' | 'Coding' | 'Custom';
  isFavorite: boolean;
}

export interface Artifact {
  id: string;
  title: string;
  type: 'document' | 'table' | 'image' | 'code';
  content: string;
  timestamp: string;
}

interface AIChatProps {
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

// Custom simple parser to render basic inline math or markdown
const parseMarkdown = (text: string) => {
  // Simple check for collapsible details
  if (text.includes('<details>')) {
    // Basic formatting of details blocks
  }
  return text;
};

export default function AIChat({ currentUser, onOpenUpgradeModal }: AIChatProps) {
  // ------------------------------------------
  // STATE MANAGEMENT
  // ------------------------------------------
  
  // Threads, Folders, Projects
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  
  // Selected filter states
  const [currentTab, setCurrentTab] = useState<'chats' | 'archived' | 'trash' | 'folders' | 'projects'>('chats');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Input composer state
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [isTemporaryMode, setIsTemporaryMode] = useState(false);
  const [isVoiceRecordingPlaceholder, setIsVoiceRecordingPlaceholder] = useState(false);
  
  // Active streaming state
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStoppingStream, setIsStoppingStream] = useState(false);
  const [streamTimer, setStreamTimer] = useState<NodeJS.Timeout | null>(null);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<ChatFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Saved prompts
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [activePromptCategory, setActivePromptCategory] = useState<'All' | 'Writing' | 'Summarizing' | 'Brainstorming' | 'Coding' | 'Custom'>('All');
  const [searchPromptQuery, setSearchPromptQuery] = useState('');
  
  // Artifacts panel
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showArtifactsPanel, setShowArtifactsPanel] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  
  // UI Panels Modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [threadRenameId, setThreadRenameId] = useState<string | null>(null);
  const [threadRenameTitle, setThreadRenameTitle] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Zoom image preview
  const [zoomedFileUrl, setZoomedFileUrl] = useState<string | null>(null);
  
  // Limits and Configuration
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [fetchingLimits, setFetchingLimits] = useState(true);
  
  // Feedback states
  const [showShareToast, setShowShareToast] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  
  // Error states
  const [errorState, setErrorState] = useState<'no-internet' | 'ai-unavailable' | 'timeout' | 'rate-limit' | 'upload-failed' | 'unsupported-file' | null>(null);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Available models controlled by backend
  const availableModels = [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', desc: 'Standard high-speed intelligent reasoning', isPro: false },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', desc: 'Responsive low-overhead general tasking', isPro: false },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', desc: 'Enterprise deep reasoning, coding & analysis', isPro: true },
  ];

  // ------------------------------------------
  // INITIAL LOAD & LOCAL STORAGE SYNC
  // ------------------------------------------

  useEffect(() => {
    loadLimitsData();
    loadWorkspaceState();
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [threads, streamingContent, loading]);

  const loadLimitsData = async () => {
    try {
      const sysConfig = await fetchSystemConfig();
      setConfig(sysConfig);
      const savedUser = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      if (savedUser) {
        setIsPremium(isUserPremium(savedUser));
        const userUsage = await fetchUsage(savedUser.email);
        setUsage(userUsage);
      } else {
        setIsPremium(false);
        const guestUsage = await fetchUsage('guest');
        setUsage(guestUsage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingLimits(false);
    }
  };

  const loadWorkspaceState = () => {
    // Load local threads, folders, projects, prompts
    const cachedThreads = localStorage.getItem('gxa_chat_threads');
    const cachedFolders = localStorage.getItem('gxa_chat_folders');
    const cachedPrompts = localStorage.getItem('gxa_chat_prompts');
    const cachedArtifacts = localStorage.getItem('gxa_chat_artifacts');

    if (cachedThreads) {
      try {
        const parsed = JSON.parse(cachedThreads);
        setThreads(parsed);
        // Set first active thread if available
        if (parsed.length > 0) {
          const firstValid = parsed.find((t: any) => !t.trash && !t.archived);
          if (firstValid) {
            setActiveThreadId(firstValid.id);
          }
        }
      } catch (e) {}
    } else {
      setThreads([]);
    }

    if (cachedFolders) {
      try { setFolders(JSON.parse(cachedFolders)); } catch (e) {}
    } else {
      setFolders([
        { id: 'f-1', name: 'Research & Science', color: 'teal' },
        { id: 'f-2', name: 'Content Marketing', color: 'purple' },
        { id: 'f-3', name: 'Code Snippets', color: 'amber' }
      ]);
    }

    if (cachedPrompts) {
      try { setPrompts(JSON.parse(cachedPrompts)); } catch (e) {}
    } else {
      setPrompts([
        { id: 'p-1', title: 'Write Technical Documentation', content: 'Act as a professional technical content writer. Convert this raw codebase structure and explanations into clean, markdown-supported technical documentation with clear list items and sub-headings:\n\n', category: 'Writing', isFavorite: true },
        { id: 'p-2', title: 'Code Refactoring Review', content: 'Act as an expert software architect. Review the provided source code snippets for memory leaks, TS type safety violations, performance bottlenecks, and structural elegance. Return a tabular summary of the refactored code block:\n\n', category: 'Coding', isFavorite: true },
        { id: 'p-3', title: 'Explain Complex Algorithms Simply', content: 'Act as a friendly, academic coach. Explain the core mathematical principles, performance complexity bounds (Big O), and common application patterns of the following concept inside clean, structured markdown panels:\n\n', category: 'Brainstorming', isFavorite: false },
        { id: 'p-4', title: 'Draft Executive Summaries', content: 'Act as a corporate consultant. Summarize the key operational trends, action steps, risks, and financial impacts contained in the following logs or CSV tables:\n\n', category: 'Summarizing', isFavorite: false }
      ]);
    }

    if (cachedArtifacts) {
      try { setArtifacts(JSON.parse(cachedArtifacts)); } catch (e) {}
    }

    // Sync projects list from backend
    fetchProjects();
  };

  const fetchProjects = async () => {
    const savedUser = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
    if (!savedUser) return;
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${savedUser.email}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error('Failed to load projects from backend database:', e);
    }
  };

  const saveThreadsToCache = (updatedThreads: ChatThread[]) => {
    setThreads(updatedThreads);
    localStorage.setItem('gxa_chat_threads', JSON.stringify(updatedThreads));
  };

  const saveFoldersToCache = (updatedFolders: FolderType[]) => {
    setFolders(updatedFolders);
    localStorage.setItem('gxa_chat_folders', JSON.stringify(updatedFolders));
  };

  const savePromptsToCache = (updatedPrompts: SavedPrompt[]) => {
    setPrompts(updatedPrompts);
    localStorage.setItem('gxa_chat_prompts', JSON.stringify(updatedPrompts));
  };

  const saveArtifactsToCache = (updatedArtifacts: Artifact[]) => {
    setArtifacts(updatedArtifacts);
    localStorage.setItem('gxa_chat_artifacts', JSON.stringify(updatedArtifacts));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ------------------------------------------
  // CORE CHAT ACTIONS & ENGINE
  // ------------------------------------------

  const handleCreateNewChat = (projId?: string, foldId?: string) => {
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      title: isTemporaryMode ? 'Temporary Chat' : 'New AI Session',
      projectId: projId || selectedProjectId || undefined,
      folderId: foldId || selectedFolderId || undefined,
      messages: [],
      pinned: false,
      archived: false,
      trash: false,
      isTemporary: isTemporaryMode,
      model: selectedModel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tokensUsed: 0
    };

    if (!isTemporaryMode) {
      const updated = [newThread, ...threads];
      saveThreadsToCache(updated);
    }
    setActiveThreadId(newThread.id);
    setUploadedFiles([]);
    setErrorState(null);
    setInput('');
    setTimeout(() => composerRef.current?.focus(), 100);
  };

  const handleSend = async (e?: React.FormEvent, directPrompt?: string) => {
    if (e) e.preventDefault();
    setErrorState(null);

    // Limit check for free plan
    const dailyLimit = isPremium ? Infinity : (config?.ai_chats_limit || 5);
    const chatsRunToday = usage?.chats || 0;
    const isDailyExceeded = !isPremium && chatsRunToday >= dailyLimit;

    if (isDailyExceeded && !isTemporaryMode) {
      onOpenUpgradeModal?.();
      return;
    }

    const promptText = directPrompt || input;
    if (!promptText.trim() && uploadedFiles.length === 0) return;
    if (loading) return;

    // Reset composer input
    if (!directPrompt) setInput('');

    // Ensure we have an active thread
    let currentThread = threads.find(t => t.id === activeThreadId);
    if (!currentThread || currentThread.trash || currentThread.archived) {
      // Create new on the fly
      currentThread = {
        id: `thread-${Date.now()}`,
        title: isTemporaryMode ? 'Temporary Chat' : promptText.trim().slice(0, 32) || 'AI Chat Session',
        projectId: selectedProjectId || undefined,
        folderId: selectedFolderId || undefined,
        messages: [],
        pinned: false,
        archived: false,
        trash: false,
        isTemporary: isTemporaryMode,
        model: selectedModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tokensUsed: 0
      };
      if (!isTemporaryMode) {
        saveThreadsToCache([currentThread, ...threads]);
      }
      setActiveThreadId(currentThread.id);
    }

    // Add User Message
    const userMessageId = `msg-${Date.now()}`;
    const fileReferences = uploadedFiles.map(f => f.name);
    const newUserMsg: Message = {
      id: userMessageId,
      role: 'user',
      content: promptText.trim() + (fileReferences.length > 0 ? `\n\n[References: ${fileReferences.join(', ')}]` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      referencedDocs: fileReferences.length > 0 ? fileReferences : undefined
    };

    const updatedMessages = [...currentThread.messages, newUserMsg];
    currentThread.messages = updatedMessages;
    currentThread.updatedAt = Date.now();
    currentThread.model = selectedModel;

    // Auto-title update on first real message
    if (currentThread.title === 'New AI Session' || currentThread.title === 'New AI Chat') {
      currentThread.title = promptText.trim().slice(0, 36) || 'AI Analysis';
    }

    if (!isTemporaryMode) {
      const nextThreads = threads.map(t => t.id === currentThread!.id ? currentThread! : t);
      saveThreadsToCache(nextThreads);
    }

    // Prepare Context & Run AI Model
    setLoading(true);
    setStreamingContent('');
    setIsStoppingStream(false);

    try {
      // Build historical prompt context
      const historyContext = currentThread.messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      let fileExtraContext = '';
      if (uploadedFiles.length > 0) {
        fileExtraContext = `\n\n[USER UPLOADED FILE INJECTS]\n` + uploadedFiles.map(f => `File: ${f.name} (type: ${f.type})\nContent Snippet: ${f.content || 'Binary data or Image reference'}`).join('\n\n');
      }

      const fullPrompt = `${historyContext}${fileExtraContext}\n\nAssistant:`;

      // Trigger Gemini content API
      const systemInst = `You are the central intelligence hub of the GXA AI Workspace. You are friendly, ultra-polished, precise, and writing-focused.
Support formatting with clean markdown, ordered and unordered lists, standard tables, collapsible sections using html details summaries, citations, code blocks with syntax highlight indicators, and Mermaid diagrams styled visually.
Do not use technical or infrastructure jargon. Avoid mock logging. Deliver pristine layouts.`;

      const resultText = await generateContent({
        prompt: fullPrompt,
        systemInstruction: systemInst
      });

      // Simulated realistic high-fidelity streaming typing effect to prevent UI freezing and ensure premium responsive look
      let currentIdx = 0;
      const step = Math.ceil(resultText.length / 55) || 1; // dynamically fast step
      
      const interval = setInterval(() => {
        if (isStoppingStream) {
          clearInterval(interval);
          finalizeResponse(currentThread!, streamingContent);
          return;
        }

        currentIdx += step;
        if (currentIdx >= resultText.length) {
          clearInterval(interval);
          finalizeResponse(currentThread!, resultText);
        } else {
          setStreamingContent(resultText.slice(0, currentIdx));
        }
      }, 15);

      // Save timer ref to clear if stopped
      setStreamTimer(interval);

    } catch (err) {
      console.error(err);
      setErrorState('ai-unavailable');
      setLoading(false);
    }
  };

  const finalizeResponse = async (currentThread: ChatThread, finalContent: string) => {
    // Check if there are generated documents/code/tables to extract as Artifacts
    extractAndAddArtifact(currentThread.title, finalContent);

    const assistantMsgId = `msg-${Date.now()}`;
    const newAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: finalContent || 'Analysis completed successfully.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    currentThread.messages = [...currentThread.messages, newAssistantMsg];
    currentThread.updatedAt = Date.now();
    currentThread.tokensUsed = (currentThread.tokensUsed || 0) + Math.round((finalContent.length + (currentThread.messages[currentThread.messages.length - 2]?.content.length || 0)) / 4);

    if (!isTemporaryMode) {
      const nextThreads = threads.map(t => t.id === currentThread.id ? currentThread : t);
      saveThreadsToCache(nextThreads);

      // Save user & assistant messages to the backend for audit trail & safety
      const savedUser = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
      if (savedUser) {
        try {
          await fetch('/api/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${savedUser.email}`
            },
            body: JSON.stringify({ role: 'user', content: currentThread.messages[currentThread.messages.length - 2]?.content })
          });
          await fetch('/api/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${savedUser.email}`
            },
            body: JSON.stringify({ role: 'assistant', content: finalContent })
          });
          
          // Increment daily limits
          const updatedUsage = await incrementUsage(savedUser.email, 'chats');
          setUsage(updatedUsage);
        } catch (e) {}
      }
    }

    setLoading(false);
    setStreamingContent('');
    setUploadedFiles([]);
  };

  const handleStopStream = () => {
    if (streamTimer) {
      clearInterval(streamTimer);
    }
    setIsStoppingStream(true);
    setLoading(false);
  };

  // Helper to extract tables, markdown docs, or mermaid code blocks into Artifact Panel
  const extractAndAddArtifact = (threadTitle: string, text: string) => {
    let type: 'document' | 'table' | 'image' | 'code' = 'document';
    let content = '';
    let title = '';

    // Check for code blocks
    if (text.includes('```')) {
      const match = text.match(/```(\w*)\n([\s\S]*?)```/);
      if (match) {
        const lang = match[1];
        content = match[2];
        if (lang === 'mermaid') {
          type = 'image';
          title = `Flowchart - ${threadTitle}`;
        } else {
          type = 'code';
          title = `Code Block (${lang || 'Plain text'}) - ${threadTitle}`;
        }
      }
    }
    // Check for tables
    else if (text.includes('|') && text.includes('--')) {
      const lines = text.split('\n');
      const tableLines = lines.filter(l => l.trim().startsWith('|'));
      if (tableLines.length > 1) {
        type = 'table';
        content = tableLines.join('\n');
        title = `Extracted Matrix - ${threadTitle}`;
      }
    }

    if (content && title) {
      const newArt: Artifact = {
        id: `art-${Date.now()}`,
        title,
        type,
        content,
        timestamp: new Date().toLocaleDateString()
      };
      const nextArts = [newArt, ...artifacts];
      saveArtifactsToCache(nextArts);
      // Automatically pop slideout artifact panel
      setArtifacts(nextArts);
      setSelectedArtifact(newArt);
      setShowArtifactsPanel(true);
    }
  };

  // ------------------------------------------
  // SIDEBAR & LIST MANAGEMENT
  // ------------------------------------------

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setErrorState(null);
    setUploadedFiles([]);
    setInput('');
  };

  const handlePinThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t);
    saveThreadsToCache(updated);
  };

  const handleArchiveThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.map(t => t.id === id ? { ...t, archived: !t.archived } : t);
    saveThreadsToCache(updated);
  };

  const handleTrashThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.map(t => t.id === id ? { ...t, trash: true, pinned: false } : t);
    saveThreadsToCache(updated);
    if (activeThreadId === id) {
      const remaining = updated.find(t => !t.trash && !t.archived);
      setActiveThreadId(remaining ? remaining.id : null);
    }
  };

  const handleRestoreThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.map(t => t.id === id ? { ...t, trash: false } : t);
    saveThreadsToCache(updated);
  };

  const handlePermanentDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.filter(t => t.id !== id);
    saveThreadsToCache(updated);
  };

  const handleDuplicateThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = threads.find(t => t.id === id);
    if (!target) return;
    const duplicated: ChatThread = {
      ...target,
      id: `thread-dup-${Date.now()}`,
      title: `${target.title} (Copy)`,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    saveThreadsToCache([duplicated, ...threads]);
    setActiveThreadId(duplicated.id);
  };

  const handleRenameThreadSubmit = (id: string) => {
    if (!threadRenameTitle.trim()) return;
    const updated = threads.map(t => t.id === id ? { ...t, title: threadRenameTitle.trim() } : t);
    saveThreadsToCache(updated);
    setThreadRenameId(null);
  };

  // ------------------------------------------
  // FILE HANDLING & EXTRATORS
  // ------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(f => processUploadedFile(f));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(f => processUploadedFile(f));
    }
  };

  const processUploadedFile = (file: File) => {
    // Validate file size limit on free plan
    const maxSizeBytes = isPremium ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 10MB free limit
    if (file.size > maxSizeBytes) {
      setErrorState('unsupported-file');
      return;
    }

    const newChatFile: ChatFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      type: file.name.split('.').pop()?.toLowerCase() || 'txt',
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      progress: 0
    };

    setUploadedFiles(prev => [...prev, newChatFile]);

    // Handle extraction & mock content based on type
    const reader = new FileReader();
    reader.onload = async (event) => {
      const contentText = event.target?.result as string;
      
      // Simulate file upload progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 20;
        setUploadedFiles(prev => prev.map(f => f.id === newChatFile.id ? { ...f, progress: currentProgress } : f));
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          setUploadedFiles(prev => prev.map(f => f.id === newChatFile.id ? { 
            ...f, 
            progress: 100, 
            content: contentText || 'Extracted structural layout content successfully.',
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
          } : f));
          
          // Save document metadata to backend
          saveDocumentMetadata(file.name, file.size);
        }
      }, 100);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const saveDocumentMetadata = async (name: string, size: number) => {
    const savedUser = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
    if (!savedUser) return;
    try {
      await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedUser.email}`
        },
        body: JSON.stringify({
          name,
          pages: 1,
          size: `${(size / (1024 * 1024)).toFixed(2)} MB`,
          extractedSnippet: `Metadata index for file: ${name}`
        })
      });
    } catch (e) {}
  };

  const handleRemoveUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Helper triggers for PDF actions
  const handlePdfAction = (action: 'summarize' | 'translate' | 'tables' | 'text' | 'images') => {
    const pdfFile = uploadedFiles.find(f => f.type === 'pdf');
    if (!pdfFile) return;

    let targetPrompt = '';
    if (action === 'summarize') {
      targetPrompt = `Read and meticulously summarize the key analytical bullet points of the attached PDF: "${pdfFile.name}"`;
    } else if (action === 'translate') {
      targetPrompt = `Meticulously translate the entire structured text of this PDF: "${pdfFile.name}" into clean French, Spanish, or Hindi preserving technical alignments:`;
    } else if (action === 'tables') {
      targetPrompt = `Extract any embedded data matrices and return them styled inside an elegant, responsive markdown table with columns, from PDF: "${pdfFile.name}"`;
    } else if (action === 'text') {
      targetPrompt = `Extract raw transcription from PDF: "${pdfFile.name}" inside high-fidelity code layout panels:`;
    } else if (action === 'images') {
      targetPrompt = `Analyze and describe any structural blueprints or vector illustrations inside the PDF: "${pdfFile.name}":`;
    }

    handleSend(undefined, targetPrompt);
  };

  // ------------------------------------------
  // CREATING FOLDERS & PROJECTS
  // ------------------------------------------

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFold: FolderType = {
      id: `fold-${Date.now()}`,
      name: newFolderName.trim(),
      color: 'teal'
    };
    const nextFolds = [...folders, newFold];
    saveFoldersToCache(nextFolds);
    setNewFolderName('');
    setShowCreateFolderModal(false);
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFolds = folders.filter(f => f.id !== id);
    saveFoldersToCache(nextFolds);
    if (selectedFolderId === id) setSelectedFolderId(null);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const savedUser = currentUser || JSON.parse(localStorage.getItem('gxa_user') || 'null');
    if (!savedUser) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedUser.email}`
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          type: 'AI Workspace Suite',
          status: 'Active',
          previewText: newProjectDesc.trim() || 'No description provided.'
        })
      });

      if (res.ok) {
        await fetchProjects();
        setNewProjectName('');
        setNewProjectDesc('');
        setShowCreateProjectModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Move thread to specific folder
  const handleMoveThreadToFolder = (threadId: string, folderId: string | undefined) => {
    const updated = threads.map(t => t.id === threadId ? { ...t, folderId } : t);
    saveThreadsToCache(updated);
  };

  // Link thread to project
  const handleLinkThreadToProject = (threadId: string, projectId: string | undefined) => {
    const updated = threads.map(t => t.id === threadId ? { ...t, projectId } : t);
    saveThreadsToCache(updated);
  };

  // ------------------------------------------
  // EXPORT, REGENERATE, SHARING UTILS
  // ------------------------------------------

  const handleShareChat = () => {
    const thread = threads.find(t => t.id === activeThreadId);
    if (!thread) return;
    const shareUrl = `${window.location.origin}/share/chat/${thread.id}`;
    navigator.clipboard.writeText(shareUrl);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  const handleExportChat = (format: 'txt' | 'md' | 'json') => {
    const thread = threads.find(t => t.id === activeThreadId);
    if (!thread) return;

    let text = `# Chat Title: ${thread.title}\nModel: ${thread.model}\nDate: ${new Date(thread.createdAt).toLocaleDateString()}\n\n`;
    let filename = `${thread.title.toLowerCase().replace(/\s+/g, '-')}.${format}`;
    let mime = 'text/plain';

    if (format === 'json') {
      text = JSON.stringify(thread, null, 2);
      mime = 'application/json';
    } else {
      thread.messages.forEach(m => {
        text += `## [${m.role.toUpperCase()}] (${m.timestamp})\n${m.content}\n\n`;
      });
    }

    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRegenerateLast = () => {
    const thread = threads.find(t => t.id === activeThreadId);
    if (!thread || thread.messages.length < 2) return;
    
    // Pop last assistant response
    const lastMsg = thread.messages[thread.messages.length - 1];
    if (lastMsg.role === 'assistant') {
      const popped = thread.messages.slice(0, -1);
      thread.messages = popped;
      const lastUser = popped[popped.length - 1];
      if (lastUser && lastUser.role === 'user') {
        handleSend(undefined, lastUser.content);
      }
    }
  };

  const handleEditMessage = (id: string, text: string) => {
    setEditingMessageId(id);
    setEditMessageText(text);
  };

  const handleSaveEditedMessage = (threadId: string, messageId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const updatedMsgs = thread.messages.map(m => m.id === messageId ? { ...m, content: editMessageText } : m);
    thread.messages = updatedMsgs;
    saveThreadsToCache(threads.map(t => t.id === threadId ? thread : t));
    setEditingMessageId(null);
    setEditMessageText('');
    
    // Regenerate from this edited user message if it is user role
    const idx = updatedMsgs.findIndex(m => m.id === messageId);
    if (idx !== -1 && updatedMsgs[idx].role === 'user') {
      thread.messages = updatedMsgs.slice(0, idx + 1);
      handleSend(undefined, editMessageText);
    }
  };

  // ------------------------------------------
  // FILTERING LOGIC
  // ------------------------------------------

  const filteredThreads = threads.filter(t => {
    // Basic structural checks
    if (t.trash && currentTab !== 'trash') return false;
    if (!t.trash && currentTab === 'trash') return false;
    
    if (t.archived && currentTab !== 'archived') return false;
    if (!t.archived && currentTab === 'archived') return false;

    // Folder and project filters
    if (currentTab === 'folders' && selectedFolderId && t.folderId !== selectedFolderId) return false;
    if (currentTab === 'projects' && selectedProjectId && t.projectId !== selectedProjectId) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesMsg = t.messages.some(m => m.content.toLowerCase().includes(q));
      return matchesTitle || matchesMsg;
    }

    return true;
  });

  const activeThread = threads.find(t => t.id === activeThreadId);

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full h-full flex flex-row overflow-hidden text-slate-800 dark:text-zinc-100 bg-slate-50/20 dark:bg-zinc-950/20 font-sans relative select-text"
    >
      {/* Drag & drop overlay indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-teal-500/10 backdrop-blur-xs border-2 border-dashed border-teal-500 z-50 flex items-center justify-center transition duration-200 pointer-events-none">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3 shadow-2xl max-w-sm">
            <div className="h-14 w-14 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-500 flex items-center justify-center mx-auto">
              <Paperclip className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Drop files to parse instantly</h4>
            <p className="text-xs text-slate-400">PDF, DOCX, TXT, CSV, JSON, Markdown, Images, or Code files</p>
          </div>
        </div>
      )}

      {/* Share Toast Feedback */}
      {showShareToast && (
        <div className="absolute top-5 right-5 bg-teal-500 text-white rounded-xl px-4 py-2.5 shadow-xl text-xs font-bold flex items-center gap-2 z-40 animate-bounce">
          <Check className="h-4 w-4" /> Share URL copied to your clipboard!
        </div>
      )}

      {/* Image zoom preview overlays */}
      {zoomedFileUrl && (
        <div onClick={() => setZoomedFileUrl(null)} className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={zoomedFileUrl} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain animate-fade-in" alt="Zoomed view" referrerPolicy="no-referrer" />
          <button className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* ==========================================
          LEFT SIDEBAR: Conversation Manager
          ========================================== */}
      <aside className={`w-80 shrink-0 border-r border-slate-200/50 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md flex flex-col h-full z-20 transition duration-300 ${
        currentTab === 'chats' ? 'block' : ''
      } hidden md:flex`}>
        
        {/* New Chat Actions */}
        <div className="p-4 shrink-0 space-y-3 border-b border-slate-200/30 dark:border-zinc-800/40">
          <button 
            onClick={() => handleCreateNewChat()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-500 hover:bg-teal-600 active:scale-98 text-white text-xs font-bold rounded-xl transition duration-200 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Chat
          </button>

          {/* Quick Category Tab Toggle */}
          <div className="flex bg-slate-100/80 dark:bg-zinc-950/60 p-1 rounded-lg text-[10px] font-bold">
            <button 
              onClick={() => { setCurrentTab('chats'); setSelectedFolderId(null); setSelectedProjectId(null); }}
              className={`flex-1 py-1 text-center rounded transition ${currentTab === 'chats' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Recent
            </button>
            <button 
              onClick={() => setCurrentTab('folders')}
              className={`flex-1 py-1 text-center rounded transition ${currentTab === 'folders' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Folders
            </button>
            <button 
              onClick={() => setCurrentTab('projects')}
              className={`flex-1 py-1 text-center rounded transition ${currentTab === 'projects' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Projects
            </button>
          </div>
        </div>

        {/* Global Sidebar Search */}
        <div className="px-4 py-2.5 shrink-0 relative border-b border-slate-200/20 dark:border-zinc-800/20">
          <Search className="absolute left-7 top-4.5 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search chats, docs, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/50 dark:bg-zinc-950/40 border-0 rounded-lg pl-8 pr-4 py-1.5 text-[11px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
          />
        </div>

        {/* Main List Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* FOLDERS LIST MODE */}
          {currentTab === 'folders' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1 mb-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Workspace Folders</span>
                <button onClick={() => setShowCreateFolderModal(true)} className="p-1 rounded text-slate-400 hover:text-teal-500 hover:bg-slate-50 dark:hover:bg-zinc-850">
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </div>

              {folders.map(f => (
                <div 
                  key={f.id}
                  onClick={() => { setSelectedFolderId(f.id); }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs font-bold ${selectedFolderId === f.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'}`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className={`h-4 w-4 ${f.color === 'teal' ? 'text-teal-500' : f.color === 'purple' ? 'text-purple-500' : 'text-amber-500'}`} />
                    <span>{f.name}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteFolder(f.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* PROJECTS LIST MODE */}
          {currentTab === 'projects' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1 mb-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Active Projects</span>
                <button onClick={() => setShowCreateProjectModal(true)} className="p-1 rounded text-slate-400 hover:text-teal-500 hover:bg-slate-50 dark:hover:bg-zinc-850">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); }}
                  className={`flex flex-col p-2.5 rounded-xl cursor-pointer transition text-xs font-bold ${selectedProjectId === p.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'}`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-sky-500" />
                    <span>{p.name}</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-500 pl-6 mt-1 truncate">{p.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* CONVERSATIONS THREAD LIST (Filtered dynamically) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                {currentTab === 'archived' ? 'Archived Sessions' : currentTab === 'trash' ? 'Trash Bin' : 'Recent Conversations'}
              </span>
              {currentTab === 'chats' && (
                <div className="flex gap-1.5 text-[9px] text-slate-400 font-bold">
                  <button onClick={() => setCurrentTab('archived')} className="hover:text-teal-500">Archived</button>
                  <span>•</span>
                  <button onClick={() => setCurrentTab('trash')} className="hover:text-teal-500">Trash</button>
                </div>
              )}
              {currentTab !== 'chats' && (
                <button onClick={() => setCurrentTab('chats')} className="text-[9px] text-teal-600 dark:text-teal-400 font-bold hover:underline">Back</button>
              )}
            </div>

            {filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-zinc-600">
                <MessageSquare className="h-8 w-8 mx-auto stroke-1 mb-2 text-slate-300 dark:text-zinc-800" />
                <span className="text-[11px] font-medium block">No conversations found</span>
              </div>
            ) : (
              filteredThreads.map(t => {
                const isSelected = t.id === activeThreadId;
                const isRenaming = t.id === threadRenameId;

                return (
                  <div 
                    key={t.id}
                    onClick={() => handleSelectThread(t.id)}
                    className={`group relative flex flex-col p-2.5 rounded-xl cursor-pointer transition text-left ${isSelected ? 'bg-slate-100 dark:bg-zinc-850 text-teal-600 dark:text-teal-400' : 'hover:bg-slate-100/60 dark:hover:bg-zinc-850/60 text-slate-600 dark:text-zinc-300'}`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      {isRenaming ? (
                        <input 
                          type="text"
                          value={threadRenameTitle}
                          onChange={(e) => setThreadRenameTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameThreadSubmit(t.id); }}
                          onBlur={() => handleRenameThreadSubmit(t.id)}
                          className="flex-1 bg-white dark:bg-zinc-900 text-xs p-1 border border-slate-200 dark:border-zinc-800 rounded font-semibold"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex-1 truncate font-semibold text-xs leading-tight pr-6">
                          {t.title}
                        </div>
                      )}

                      {/* Thread context tags */}
                      {t.pinned && !isRenaming && (
                        <Pin className="h-3 w-3 text-teal-500 absolute right-3 top-3 shrink-0" />
                      )}
                    </div>

                    {/* Metadata snippet */}
                    <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-400 dark:text-zinc-500">
                      <span className="font-medium font-mono uppercase">{t.model.replace('-latest', '').replace('gemini-', '')}</span>
                      <span>{new Date(t.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>

                    {/* Hover inline tools */}
                    {!isRenaming && (
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 pl-2 rounded-lg">
                        {t.trash ? (
                          <>
                            <button 
                              onClick={(e) => handleRestoreThread(t.id, e)}
                              title="Restore Session"
                              className="p-1 text-slate-400 hover:text-emerald-500 transition"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => handlePermanentDeleteThread(t.id, e)}
                              title="Delete Permanently"
                              className="p-1 text-slate-400 hover:text-red-500 transition"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setThreadRenameId(t.id); setThreadRenameTitle(t.title); }}
                              title="Rename Session"
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                            >
                              <FileText className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => handlePinThread(t.id, e)}
                              title={t.pinned ? 'Unpin Session' : 'Pin Session'}
                              className={`p-1 transition ${t.pinned ? 'text-teal-500' : 'text-slate-400 hover:text-teal-500'}`}
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => handleDuplicateThread(t.id, e)}
                              title="Duplicate Session"
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => handleTrashThread(t.id, e)}
                              title="Move to Trash"
                              className="p-1 text-slate-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat preferences footer */}
        <div className="p-4 border-t border-slate-200/40 dark:border-zinc-800/60 bg-slate-100/10 dark:bg-zinc-950/20 shrink-0 space-y-3">
          {/* Temporary Chat switch */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/50 dark:bg-zinc-950/40 border border-slate-200/20 dark:border-zinc-800/30">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-500" /> Temporary Chat
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">No history will be stored</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isTemporaryMode} 
                onChange={(e) => setIsTemporaryMode(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-8 h-4 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500" />
            </label>
          </div>

        </div>
      </aside>

      {/* ==========================================
          CENTER AREA: Modern Large Chat Panel
          ========================================== */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden relative border-r border-slate-200/20 dark:border-zinc-900/60">
        
        {/* Top Header bar with dynamic content */}
        <header className="h-16 shrink-0 border-b flex items-center justify-between px-6 bg-white/50 dark:bg-zinc-950/50 border-slate-200/50 dark:border-zinc-900/60 z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center border border-teal-200/10">
              <Cpu className="h-5 w-5" />
            </div>
            
            <div className="text-left max-w-xs md:max-w-md">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                {activeThread ? activeThread.title : 'AI Writing Companion'}
              </h2>
              <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-mono uppercase tracking-wider">
                <span>Model: {activeThread ? activeThread.model : selectedModel}</span>
                <span>•</span>
                <span>Tokens: {activeThread?.tokensUsed || 0}</span>
              </div>
            </div>
          </div>

          {/* Header Action controls */}
          <div className="flex items-center gap-2">
            {activeThread && (
              <>
                <button 
                  onClick={handleShareChat}
                  title="Share Conversation"
                  className="p-2 text-slate-400 hover:text-teal-500 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition"
                >
                  <Share2 className="h-4 w-4" />
                </button>

                <div className="relative group">
                  <button 
                    title="Export Revision Reports"
                    className="p-2 text-slate-400 hover:text-teal-500 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-1 w-32 shadow-xl z-30">
                    <button onClick={() => handleExportChat('txt')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-300 transition">Plain Text</button>
                    <button onClick={() => handleExportChat('md')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-300 transition">Markdown</button>
                    <button onClick={() => handleExportChat('json')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-300 transition">Raw JSON</button>
                  </div>
                </div>
              </>
            )}

            {/* Model Selection switch */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-200/50 transition">
                <span>Model Switcher</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-2.5 w-64 shadow-2xl z-30 text-left">
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase mb-1.5 tracking-wider px-1">Choose Intelligence Engine</span>
                {availableModels.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      if (activeThread) {
                        const updated = threads.map(t => t.id === activeThread.id ? { ...t, model: m.id } : t);
                        saveThreadsToCache(updated);
                      }
                    }}
                    className={`w-full text-left p-2 rounded-xl transition flex flex-col ${selectedModel === m.id ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-600 dark:text-zinc-300'}`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      {m.name}
                      {m.isPro && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded-full">PRO</span>}
                    </span>
                    <span className="text-[9px] font-normal text-slate-400 dark:text-zinc-500 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Show Artifact drawer button if artifacts exists */}
            {artifacts.length > 0 && (
              <button 
                onClick={() => setShowArtifactsPanel(!showArtifactsPanel)}
                className={`p-2 rounded-lg transition relative ${showArtifactsPanel ? 'bg-teal-500/10 text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}
                title="View Artifacts Panel"
              >
                <Layers className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-teal-500 text-white font-black text-[8px] h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950">
                  {artifacts.length}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Temporary warning banner */}
        {isTemporaryMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-left shrink-0">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500" /> Temporary Chat Enabled — Conversations will not be saved or stored.
            </span>
          </div>
        )}

        {/* Main error layout if present */}
        {errorState && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between text-left shrink-0">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 block">
                  {errorState === 'no-internet' ? 'Connectivity issues' : 'Intelligence Engine Unavailable'}
                </span>
                <span className="text-[10px] text-slate-400">Verify your local network conditions and server secrets.</span>
              </div>
            </div>
            <button onClick={() => handleSend()} className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold px-2.5 py-1 rounded transition">Retry</button>
          </div>
        )}

        {/* Dynamic Chats List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* EMPTY STATE */}
          {!activeThread || activeThread.messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto p-4 space-y-8">
              <div className="space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 text-teal-500 border border-teal-500/10 flex items-center justify-center mx-auto shadow-sm">
                  <Bot className="h-7 w-7" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">GXA Intelligence Workspace</h2>
                <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed max-w-sm">
                  The central intelligence hub. Formulate ideas, summarize blueprints, extract spreadsheet tables, refactor algorithms, and revise document sheets.
                </p>
              </div>

              {/* Initial Action Cards */}
              <div className="w-full text-left space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Choose a framework to begin</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleSend(undefined, "Refactor the following algorithm into optimized TypeScript using ES Module formatting limits:")}
                    className="p-3.5 rounded-xl border border-slate-200/50 dark:border-zinc-900 hover:border-teal-500/50 bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-teal-500/5 text-left transition duration-200 group"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 block">Refactor & Optimize</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Review code blocks for bottlenecks.</span>
                  </button>

                  <button 
                    onClick={() => handleSend(undefined, "Draft a professional follow-up project summary letter for executive directors detailing these items:")}
                    className="p-3.5 rounded-xl border border-slate-200/50 dark:border-zinc-900 hover:border-teal-500/50 bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-teal-500/5 text-left transition duration-200 group"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 block">Professional Draft Builder</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Compose letters, summaries, or proposals.</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION STREAM */
            <div className="space-y-6">
              {activeThread.messages.map((m, index) => {
                const isAssistant = m.role === 'assistant';
                const isEditing = m.id === editingMessageId;

                return (
                  <div 
                    key={m.id || index} 
                    className={`flex gap-4 max-w-4xl ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}
                  >
                    {/* User / Bot Avatar */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold ${
                      isAssistant 
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-100/10 text-teal-600 dark:text-teal-400' 
                        : 'bg-slate-100 dark:bg-zinc-900 border-slate-200/50 dark:border-zinc-800 text-slate-600 dark:text-zinc-300'
                    }`}>
                      {isAssistant ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>

                    {/* Chat Bubble Container */}
                    <div className="space-y-1.5 group text-left max-w-2xl">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-zinc-900 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
                          <textarea 
                            value={editMessageText}
                            onChange={(e) => setEditMessageText(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-800 dark:text-zinc-100 outline-none resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 text-[10px]">
                            <button onClick={() => setEditingMessageId(null)} className="text-slate-400 hover:text-slate-600">Cancel</button>
                            <button onClick={() => handleSaveEditedMessage(activeThread.id, m.id)} className="bg-teal-500 text-white font-bold px-2.5 py-1 rounded">Save & Submit</button>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-2xl px-4 py-3.5 text-xs md:text-sm leading-relaxed border ${
                          isAssistant 
                            ? 'bg-slate-50/50 dark:bg-zinc-950/60 text-slate-800 dark:text-zinc-200 border-slate-200/40 dark:border-zinc-900/60' 
                            : 'bg-teal-500 text-white border-teal-500/10 shadow-xs'
                        } whitespace-pre-wrap select-text`}>
                          
                          {/* Markdown lists / Table structures customized rendering block */}
                          {parseMarkdown(m.content)}

                          {/* Render Document/Image References inline inside the message */}
                          {m.referencedDocs && (
                            <div className="mt-3 pt-3 border-t border-slate-200/20 dark:border-zinc-800/40 flex flex-wrap gap-2">
                              {m.referencedDocs.map((doc, dIdx) => (
                                <span key={dIdx} className="inline-flex items-center gap-1.5 text-[9px] bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-lg border border-slate-200/10 font-bold">
                                  <FileText className="h-3 w-3" /> {doc}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conversation actions */}
                      {!isEditing && (
                        <div className="flex flex-wrap items-center gap-3.5 opacity-0 group-hover:opacity-100 transition duration-200 pl-1">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(m.content);
                              setCopiedMessageId(m.id);
                              setTimeout(() => setCopiedMessageId(null), 2000);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition font-bold"
                          >
                            {copiedMessageId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedMessageId === m.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {!isAssistant && (
                            <button 
                              onClick={() => handleEditMessage(m.id, m.content)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition font-bold"
                            >
                              Edit
                            </button>
                          )}

                          {isAssistant && index === activeThread.messages.length - 1 && (
                            <button 
                              onClick={handleRegenerateLast}
                              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition font-bold"
                            >
                              Regenerate
                            </button>
                          )}

                          <button 
                            onClick={() => {
                              const updated = threads.map(t => t.id === activeThread.id ? {
                                ...t,
                                messages: t.messages.map(msg => msg.id === m.id ? { ...msg, isBookmarked: !msg.isBookmarked } : msg)
                              } : t);
                              saveThreadsToCache(updated);
                            }}
                            className={`inline-flex items-center gap-1 text-[10px] transition font-bold ${m.isBookmarked ? 'text-teal-500' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <Bookmark className="h-3.5 w-3.5 fill-current" />
                            <span>{m.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming AI response panel */}
              {loading && streamingContent && (
                <div className="flex gap-4 max-w-4xl">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border bg-teal-50 dark:bg-teal-950/40 border-teal-100/10 text-teal-600 dark:text-teal-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="space-y-2 text-left max-w-2xl">
                    <div className="bg-slate-50/50 dark:bg-zinc-950/60 text-slate-800 dark:text-zinc-200 border border-slate-200/40 dark:border-zinc-900/60 rounded-2xl px-4 py-3.5 text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {streamingContent}
                    </div>
                    
                    <div className="flex items-center gap-3 pl-1">
                      <button 
                        onClick={handleStopStream}
                        className="inline-flex items-center gap-1 text-[10px] text-red-500 hover:text-red-600 transition font-bold"
                      >
                        <X className="h-3.5 w-3.5" /> Stop generating
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading thinking indicator */}
              {loading && !streamingContent && (
                <div className="flex gap-4 max-w-4xl">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border bg-teal-50 dark:bg-teal-950/40 border-teal-100/10 text-teal-600 dark:text-teal-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-slate-50/50 dark:bg-zinc-950/60 text-slate-500 border border-slate-200/40 dark:border-zinc-900/60 rounded-2xl px-4 py-3.5 text-xs flex items-center gap-2 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-500" /> Co-pilot is reading your context & analyzing metrics...
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ==========================================
            CHAT INPUT: Beautiful Large Composer
            ========================================== */}
        <div className="p-5 border-t border-slate-200/50 dark:border-zinc-900/60 bg-white/50 dark:bg-zinc-950/40 shrink-0">
          
          {/* File Upload Tray Container */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3.5 p-3.5 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-200/30 dark:border-zinc-900/40 rounded-2xl text-left">
              {uploadedFiles.map(file => (
                <div 
                  key={file.id}
                  className="relative flex items-center gap-3 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/60 dark:border-zinc-850 shadow-xs max-w-xs group"
                >
                  {/* File icon or image thumbnail preview */}
                  {file.previewUrl ? (
                    <img 
                      src={file.previewUrl} 
                      onClick={() => setZoomedFileUrl(file.previewUrl || null)}
                      className="h-9 w-9 rounded-lg object-cover cursor-zoom-in" 
                      alt="Thumbnail" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-500 flex items-center justify-center font-black text-[10px] uppercase font-mono border border-teal-200/10 shrink-0">
                      {file.type}
                    </div>
                  )}

                  <div className="flex-1 min-w-[120px] text-left">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate block max-w-[140px]">{file.name}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{file.size}</span>
                  </div>

                  {/* Close & actions */}
                  <button 
                    onClick={() => handleRemoveUploadedFile(file.id)}
                    className="p-1 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-zinc-800 dark:hover:bg-rose-950 text-slate-400 hover:text-red-500 transition shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* PDF Actions Panel buttons if pdf is present */}
              {uploadedFiles.some(f => f.type === 'pdf' && f.progress >= 100) && (
                <div className="w-full flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/20 dark:border-zinc-800/40">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block pr-2">PDF Tools:</span>
                  <button onClick={() => handlePdfAction('summarize')} className="px-2.5 py-1 text-[9px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-500/20 transition">Summarize Document</button>
                  <button onClick={() => handlePdfAction('translate')} className="px-2.5 py-1 text-[9px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-500/20 transition">Translate Sheets</button>
                  <button onClick={() => handlePdfAction('tables')} className="px-2.5 py-1 text-[9px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-500/20 transition">Extract Spreadsheet Matrix</button>
                  <button onClick={() => handlePdfAction('text')} className="px-2.5 py-1 text-[9px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-500/20 transition">OCR Extraction</button>
                </div>
              )}
            </div>
          )}

          {/* Large Composer form */}
          <form onSubmit={handleSend} className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs focus-within:border-teal-500 transition duration-200">
            
            {/* Action attachments header bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-zinc-850">
              <div className="flex items-center gap-2.5">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition"
                  title="Upload PDF, DOCX, CSV, Image..."
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setIsVoiceRecordingPlaceholder(true);
                    setTimeout(() => setIsVoiceRecordingPlaceholder(false), 3000);
                  }}
                  className={`p-1.5 rounded-lg transition ${isVoiceRecordingPlaceholder ? 'bg-red-500/10 text-red-500 animate-pulse' : 'text-slate-400 hover:text-teal-500 hover:bg-slate-50 dark:hover:bg-zinc-850'}`}
                  title="Voice input dictation"
                >
                  <Mic className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Prompt Library quick injection panel trigger */}
              <div className="relative group">
                <button 
                  type="button" 
                  className="flex items-center gap-1 py-1 px-2.5 text-[10px] font-bold text-slate-400 hover:text-teal-500 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-850 transition"
                >
                  <Sparkle className="h-3.5 w-3.5" />
                  <span>Prompts Studio</span>
                </button>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 w-80 shadow-2xl z-30 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Insert Custom Prompt Template</span>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {prompts.map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => { setInput(p.content); }}
                        className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-850 border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 transition flex flex-col"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{p.title}</span>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">{p.content}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <textarea 
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTemporaryMode ? "Temporary session. Ask me anything..." : loading ? "AI processing query..." : "Type your query, upload files, drag & drop code, or insert a custom prompt..."}
              disabled={loading}
              rows={3}
              className="w-full bg-transparent border-0 outline-none focus:ring-0 text-xs md:text-sm text-slate-800 dark:text-zinc-100 p-4 resize-none placeholder-slate-400 dark:placeholder-zinc-600"
            />

            {/* Composer Footer statistics bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-zinc-850">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{input.length} / 8000 characters</span>

              <div className="flex items-center gap-2">
                <button 
                  type="submit"
                  disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
                  className="flex items-center gap-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition duration-200 shadow-xs cursor-pointer"
                >
                  <span>Submit query</span> <CornerDownLeft className="h-3 w-3" />
                </button>
              </div>
            </div>
          </form>

          {/* Inline notification of voice recording */}
          {isVoiceRecordingPlaceholder && (
            <div className="text-center text-[10px] text-red-500 font-bold mt-2 animate-pulse">
              🎤 Voice dictation is capturing your context segment...
            </div>
          )}
        </div>
      </section>

      {/* ==========================================
          RIGHT SIDEBAR: Context Panel & Artifacts
          ========================================== */}
      <aside className="w-80 shrink-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-l border-slate-200/50 dark:border-zinc-800/80 hidden lg:flex flex-col h-full z-10 text-left">
        
        {/* Artifact panel header */}
        <div className="p-4 shrink-0 border-b border-slate-200/30 dark:border-zinc-800/40">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-500" /> Context & Artifacts
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Realtime metadata tracking for active outputs.</p>
        </div>

        {/* Main tabs for Context panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          
          {/* Section: Uploaded files list */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Session Files</span>
            {uploadedFiles.length === 0 ? (
              <span className="text-[11px] text-slate-400 block italic">No documents attached in active loop.</span>
            ) : (
              <div className="space-y-1.5">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="p-2 bg-slate-100/40 dark:bg-zinc-950/40 border border-slate-200/10 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold truncate max-w-[140px]">{file.name}</span>
                    <span className="text-[9px] text-slate-400">{file.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Active Prompts studio insertion list */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Prompt Presets</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">Explore</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {prompts.slice(0, 3).map(p => (
                <div 
                  key={p.id}
                  onClick={() => setInput(p.content)}
                  className="p-2.5 rounded-xl border border-slate-200/40 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 hover:bg-slate-50 dark:hover:bg-zinc-850 cursor-pointer transition text-left"
                >
                  <span className="text-xs font-bold block truncate">{p.title}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block truncate">{p.content}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Project association context */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Associated Project</span>
            {selectedProjectId ? (
              <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 block">{projects.find(p => p.id === selectedProjectId)?.name || 'Project'}</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Every dialogue in this workspace thread aligns with this active project index.</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 block italic">No associated project selected.</span>
            )}
          </div>
        </div>

        {/* Footer: token estimation */}
        <div className="p-4 border-t border-slate-200/40 dark:border-zinc-800/60 bg-slate-100/10 dark:bg-zinc-950/20 text-xs">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
            <span>Session Token Margin</span>
            <span className="font-mono">8K / 1M Limit</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-full transition-all duration-300" style={{ width: '0.8%' }} />
          </div>
        </div>
      </aside>

      {/* ==========================================
          SLIDEOUT PANEL: Beautiful Artifact Drawer
          ========================================== */}
      {showArtifactsPanel && selectedArtifact && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-40 flex flex-col text-left animate-slide-in">
          <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                Generated {selectedArtifact.type}
              </span>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{selectedArtifact.title}</h3>
            </div>
            <button onClick={() => setShowArtifactsPanel(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {selectedArtifact.type === 'table' ? (
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full border-collapse text-left text-xs">
                  <tbody>
                    {selectedArtifact.content.split('\n').map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-100 dark:border-zinc-850">
                        {row.split('|').filter(col => col.trim()).map((col, cIdx) => (
                          <td key={cIdx} className="p-2 bg-slate-50/50 dark:bg-zinc-900/60 font-medium">
                            {col.trim()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-850 rounded-xl p-4 text-xs font-mono text-slate-800 dark:text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {selectedArtifact.content}
              </pre>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40 flex justify-end gap-2.5">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(selectedArtifact.content);
                alert('Copied artifact!');
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-zinc-300 dark:hover:text-white"
            >
              Copy raw
            </button>
            <button 
              onClick={() => {
                const blob = new Blob([selectedArtifact.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `artifact-${selectedArtifact.id}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition shadow-xs"
            >
              Download snippet
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS & SYSTEM DIALOGS
          ========================================== */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Create Workspace Folder</h4>
              <button onClick={() => setShowCreateFolderModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <input 
              type="text" 
              placeholder="Folder Name (e.g. Science Blueprints)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500"
            />
            <button onClick={handleCreateFolder} className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2.5 rounded-xl transition">Create Folder</button>
          </div>
        </div>
      )}

      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Start New Project Association</h4>
              <button onClick={() => setShowCreateProjectModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Project Name (e.g. Q3 Commercial Report)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500"
              />
              <textarea 
                placeholder="Describe your project scope..."
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>
            <button onClick={handleCreateProject} className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2.5 rounded-xl transition">Start Project</button>
          </div>
        </div>
      )}

      {/* SUPERADMIN OVERLAY PANEL */}
      {false && showAdminPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-teal-500" /> SuperAdmin Parameters
              </h4>
              <button onClick={() => setShowAdminPanel(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-zinc-400">
              <div className="p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl flex justify-between items-center">
                <span>Free Tier Chat Allowance:</span>
                <span className="font-mono font-bold">5 Daily API calls</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl flex justify-between items-center">
                <span>OCR Page Extraction Limit:</span>
                <span className="font-mono font-bold">2 Pages</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl flex justify-between items-center">
                <span>Active Routing Port:</span>
                <span className="font-mono font-bold">Ingress Proxy 3000</span>
              </div>
            </div>
            <button onClick={() => setShowAdminPanel(false)} className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2.5 rounded-xl transition">Save configurations</button>
          </div>
        </div>
      )}
    </div>
  );
}
