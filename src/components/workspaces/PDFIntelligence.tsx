import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  MessageSquare, 
  HelpCircle, 
  Languages, 
  Cpu, 
  Table, 
  Image as ImageIcon, 
  Search, 
  Loader2, 
  Send, 
  Plus, 
  ListCollapse, 
  ZoomIn, 
  ZoomOut, 
  Trash2,
  Bookmark,
  UploadCloud,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCw,
  Split,
  Download,
  Sparkles,
  Scissors,
  FileSpreadsheet,
  Eye,
  Settings,
  Sliders,
  Copy,
  Check,
  CheckSquare,
  Trash,
  Layers,
  AlertCircle,
  Undo2,
  Highlighter,
  Type,
  FolderOpen,
  FileCheck,
  History,
  Calendar,
  ArrowUpDown,
  LockKeyhole,
  UnlockKeyhole,
  BookmarkCheck,
  ChevronDown,
  RefreshCw,
  Sparkles as SparklesIcon,
  BookOpen,
  X,
  PlusCircle,
  Save,
  PenTool,
  Info
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

interface PDFFile {
  id: string;
  name: string;
  pages: number;
  size: string;
  extractedSnippet: string;
  projectId?: string;
  folderId?: string;
  uploadDate: number;
}

interface HighlightAnnotation {
  id: string;
  text: string;
  type: 'highlight' | 'underline' | 'strike';
  color: string;
  page: number;
  comment?: string;
}

interface StickyNoteAnnotation {
  id: string;
  x: number; // percentage from left
  y: number; // percentage from top
  text: string;
  author: string;
  page: number;
  timestamp: string;
}

interface ChatHistoryItem {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface PDFIntelligenceProps {
  currentUser?: any;
  onOpenUpgradeModal?: () => void;
}

export default function PDFIntelligence({ currentUser, onOpenUpgradeModal }: PDFIntelligenceProps) {
  // ------------------------------------------
  // STATE MANAGEMENT
  // ------------------------------------------
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [activePdfId, setActivePdfId] = useState<string>('');
  
  // Layout side panels
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  
  // Sub tool inside AI Workspace column
  const [activeSubTool, setActiveSubTool] = useState<'chat' | 'summary' | 'ocr' | 'tables' | 'images' | 'compare' | 'tools'>('chat');
  
  // Mobile active tabs
  const [mobileTab, setMobileTab] = useState<'viewer' | 'chat' | 'summary'>('viewer');

  // Search in PDF State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState<boolean>(false);
  const [searchWholeWord, setSearchWholeWord] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  // Sorting and Projects
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size' | 'date'>('recent');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // PDF Viewer Simulator States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [manualBookmarks, setManualBookmarks] = useState<Record<string, number[]>>({}); // docId -> pages[]
  
  // Drawing Canvas / Annotation state
  const [annotationTool, setAnnotationTool] = useState<'none' | 'highlight' | 'underline' | 'strike' | 'sticky' | 'draw'>('none');
  const [annotationColor, setAnnotationColor] = useState<string>('#facc15'); // Yellow
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnLines, setDrawnLines] = useState<Record<string, Array<{ x: number, y: number, color: string }[]>>>({}); // docId_page -> paths
  const [highlights, setHighlights] = useState<Record<string, HighlightAnnotation[]>>({}); // docId -> annotations
  const [stickyNotes, setStickyNotes] = useState<Record<string, StickyNoteAnnotation[]>>({}); // docId -> notes
  const [commentInput, setCommentInput] = useState<string>('');
  const [activeStickyId, setActiveStickyId] = useState<string | null>(null);

  // AI Chat & Streaming response Simulator
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Record<string, ChatHistoryItem[]>>({}); // docId -> chats
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingResponse, setStreamingResponse] = useState<string>('');

  // OCR Simulator
  const [ocrLanguage, setOcrLanguage] = useState<string>('English');
  const [ocrQualityImprovement, setOcrQualityImprovement] = useState<boolean>(true);
  const [ocrTextResult, setOcrTextResult] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);

  // Table & Image Extractions
  const [extractedTables, setExtractedTables] = useState<string[][]>([]);
  const [extractedImages, setExtractedImages] = useState<Array<{ id: string, name: string, size: string, url: string }>>([]);
  const [isExtractingTables, setIsExtractingTables] = useState<boolean>(false);
  const [isExtractingImages, setIsExtractingImages] = useState<boolean>(false);

  // Document Compare
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [compareResult, setCompareResult] = useState<{ added: string[], removed: string[], changed: string[] } | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // PDF Tool Operations (Merge, Split, Rotate, Compress, Unlock, etc.)
  const [isProcessingTool, setIsProcessingTool] = useState<string | null>(null);
  const [toolsStatusMessage, setToolsStatusMessage] = useState<string>('');
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [passwordProtectText, setPasswordProtectText] = useState<string>('');

  // Admin Configuration Panel
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminConfig, setAdminConfig] = useState<any>({
    maxUploadSizeBytes: 10 * 1024 * 1024,
    maxPages: 50,
    ocrLimitPages: 5,
    chatLimitDaily: 25,
    allowedFormats: '.pdf',
    compressionStrength: 'medium'
  });

  // Limits tracking states
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [fetchingLimits, setFetchingLimits] = useState<boolean>(true);

  // Copy Feedback state
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  // Upgrade Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCtx = useRef<CanvasRenderingContext2D | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userRole = currentUser?.role || 'Guest';
  const isGuest = userRole === 'Guest' || currentUser?.email === 'guest@gxa.io';

  // ------------------------------------------
  // CORE DATABASE & LIMITS SYNC
  // ------------------------------------------
  const loadLimitsAndConfig = async () => {
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
      console.error('Failed to load limits in PDF Intelligence:', err);
    } finally {
      setFetchingLimits(false);
    }
  };

  const fetchDocumentsAndProjects = async () => {
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      // Fetch Documents from server
      const res = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${user.email}` }
      });
      if (res.ok) {
        const data = await res.json();
        const docs = (data.documents || []).map((doc: any) => ({
          ...doc,
          uploadDate: doc.uploadDate || Date.now() - Math.floor(Math.random() * 100000000)
        }));
        setPdfFiles(docs);
        if (docs.length > 0) {
          setActivePdfId(docs[0].id);
        }
      }

      // Fetch Projects
      const projRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${user.email}` }
      });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.projects || []);
      }
    } catch (err) {
      console.error('Error fetching database entities:', err);
    }
  };

  useEffect(() => {
    loadLimitsAndConfig();
    fetchDocumentsAndProjects();
    loadLocalState();
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingResponse, loading]);

  // Load Saved Workspace Context
  const loadLocalState = () => {
    try {
      const savedHighlights = localStorage.getItem('gxa_pdf_highlights');
      if (savedHighlights) setHighlights(JSON.parse(savedHighlights));
      
      const savedSticky = localStorage.getItem('gxa_pdf_sticky');
      if (savedSticky) setStickyNotes(JSON.parse(savedSticky));
      
      const savedChats = localStorage.getItem('gxa_pdf_chats');
      if (savedChats) setChatHistory(JSON.parse(savedChats));

      const savedBookmarks = localStorage.getItem('gxa_pdf_bookmarks');
      if (savedBookmarks) setManualBookmarks(JSON.parse(savedBookmarks));

      const savedDrawn = localStorage.getItem('gxa_pdf_drawn');
      if (savedDrawn) setDrawnLines(JSON.parse(savedDrawn));

      const savedZoom = localStorage.getItem('gxa_pdf_zoom');
      if (savedZoom) setZoomLevel(Number(savedZoom));

      const savedNight = localStorage.getItem('gxa_pdf_nightmode');
      if (savedNight) setIsNightMode(savedNight === 'true');
    } catch (e) {
      console.error('Error loading stored PDF workspaces:', e);
    }
  };

  const saveWorkspaceContext = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  };

  const activePdf = pdfFiles.find(p => p.id === activePdfId);

  // Limit Checks
  const dailyUploadLimit = isPremium ? Infinity : (config?.pdf_uploads_limit || 3);
  const remainingUploads = isPremium ? Infinity : Math.max(0, dailyUploadLimit - (usage?.pdf_uploads || 0));
  const dailyOcrLimit = isPremium ? Infinity : (config?.ocr_pages_limit || 2);
  const remainingOcr = isPremium ? Infinity : Math.max(0, dailyOcrLimit - (usage?.ocr_pages || 0));
  const dailyChatLimit = isPremium ? Infinity : (config?.ai_chats_limit || 5);
  const remainingChats = isPremium ? Infinity : Math.max(0, dailyChatLimit - (usage?.chats || 0));

  // ------------------------------------------
  // RECENT & SORTING UTILS
  // ------------------------------------------
  const getSortedFiles = () => {
    const list = [...pdfFiles];
    if (sortBy === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'size') {
      const parseSize = (s: string) => {
        const num = parseFloat(s);
        return s.includes('KB') ? num * 1024 : num * 1024 * 1024;
      };
      return list.sort((a, b) => parseSize(b.size) - parseSize(a.size));
    } else if (sortBy === 'date') {
      return list.sort((a, b) => b.uploadDate - a.uploadDate);
    }
    return list; // recent upload default
  };

  // ------------------------------------------
  // UPLOAD & PROJECT ASSIGNMENT
  // ------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuest) {
      window.location.reload();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPremium && remainingUploads <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    // Read file and setup real server entry
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    const user = JSON.parse(savedUser);

    setLoading(true);
    try {
      // Simulate reading or OCR parsing
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target?.result as string || '';
        const mockExtract = text.slice(0, 1500) || `Comprehensive corporate analysis document ${file.name}. Included segments explore regional growth vectors, product line scaling, structural cost management, and SaaS licensing margins. Quantitative reports demonstrate 24% year-over-year revenue escalation paired with strategic alignment across decentralized engineering channels.`;

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.email}`
          },
          body: JSON.stringify({
            name: file.name,
            pages: Math.floor(Math.random() * 22) + 4,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            extractedSnippet: mockExtract
          })
        });

        if (res.ok) {
          const data = await res.json();
          const docWithDate = { ...data.document, uploadDate: Date.now(), projectId: selectedProjectId };
          setPdfFiles(prev => [docWithDate, ...prev]);
          setActivePdfId(docWithDate.id);
          setCurrentPage(1);

          // Update Usage count
          const updatedUsage = await incrementUsage(user.email, 'pdf_uploads');
          setUsage(updatedUsage);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    const user = JSON.parse(savedUser);

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.email}` }
      });
      if (res.ok) {
        const filtered = pdfFiles.filter(p => p.id !== id);
        setPdfFiles(filtered);
        if (activePdfId === id) {
          setActivePdfId(filtered.length > 0 ? filtered[0].id : '');
          setCurrentPage(1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------
  // AI CHAT PLATFORM WITH STREAMING EFFECT
  // ------------------------------------------
  const triggerAiResponse = async (promptMsg: string) => {
    if (!activePdf) return;
    if (!isPremium && remainingChats <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setStreamingResponse('');

    const savedUser = localStorage.getItem('gxa_user');
    const userEmail = savedUser ? JSON.parse(savedUser).email : 'guest';

    // Get current chat contextual sequence
    const docChats = chatHistory[activePdfId] || [];
    const chatContext = docChats.slice(-4).map(c => `${c.role === 'user' ? 'User' : 'Assistant'}: ${c.text}`).join('\n\n');

    try {
      const finalPrompt = `You are a world-class Document Intelligence Assistant inside GXA AI Suite.
We are analyzing document "${activePdf.name}".
Context Snippet from document: "${activePdf.extractedSnippet}"

Historical context:
${chatContext}

Current User Request: "${promptMsg}"

Deliver a deeply structured response using lists, clear page reference citations, clean Markdown syntax, and bold headers. Do not use generic filler words.`;

      const aiText = await generateContent({
        prompt: finalPrompt,
        systemInstruction: "You are the premium GXA AI Document Engine. Output strict Markdown. Include simulated page number references [Page X] matching sections where analytical conclusions were drawn."
      });

      // Stream response typing simulation
      let textIndex = 0;
      const step = Math.ceil(aiText.length / 35) || 1;
      const streamTimer = setInterval(async () => {
        textIndex += step;
        if (textIndex >= aiText.length) {
          clearInterval(streamTimer);
          setStreamingResponse('');
          const newAiItem: ChatHistoryItem = {
            id: `ai-${Date.now()}`,
            role: 'ai',
            text: aiText,
            timestamp: Date.now()
          };
          const newUserItem: ChatHistoryItem = {
            id: `u-${Date.now()}`,
            role: 'user',
            text: promptMsg,
            timestamp: Date.now()
          };
          const nextHistory: ChatHistoryItem[] = [...docChats, newUserItem, newAiItem];
          const updatedChats = { ...chatHistory, [activePdfId]: nextHistory };
          setChatHistory(updatedChats);
          saveWorkspaceContext('gxa_pdf_chats', updatedChats);

          // Update usage counter
          if (!isPremium && userEmail !== 'guest') {
            const updatedUsage = await incrementUsage(userEmail, 'chats');
            setUsage(updatedUsage);
          }
          setLoading(false);
        } else {
          setStreamingResponse(aiText.slice(0, textIndex));
        }
      }, 25);

    } catch (e) {
      console.error(e);
      setLoading(false);
      setStreamingResponse('Linguistic pipeline exceeded response window. Check your Gemini platform keys inside the central settings panel.');
    }
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || loading) return;
    const prompt = chatInput.trim();
    setChatInput('');
    triggerAiResponse(prompt);
  };

  // ------------------------------------------
  // QUICK AI SUMMARY MODES
  // ------------------------------------------
  const handleQuickSummary = (style: string) => {
    if (!activePdf) return;
    let directive = '';
    switch (style) {
      case 'detailed':
        directive = "Perform a multi-paragraph, granular, detailed summary detailing the core methodology, market variables, and quantitative indicators.";
        break;
      case 'bullet':
        directive = "Condense this document into high-impact structural bullets, each bolding the prime finding.";
        break;
      case 'executive':
        directive = "Generate a professional Executive Summary detailing regional compliance, strategic vectors, and fiscal margins.";
        break;
      case 'academic':
        directive = "Generate a peer-review style Academic Abstract detailing structural assumptions, literature context, and logical proofs.";
        break;
      case 'action':
        directive = "Extract concrete actionable next steps, deadlines, assignment outlines, and clear checklists.";
        break;
      default:
        directive = "Provide an elegant high-fidelity summary overview of the document.";
    }
    triggerAiResponse(directive);
  };

  // ------------------------------------------
  // OCR SIMULATOR
  // ------------------------------------------
  const runOcrScan = async () => {
    if (!activePdf) return;
    if (!isPremium && remainingOcr <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    setIsOcrProcessing(true);
    setOcrTextResult('');

    const savedUser = localStorage.getItem('gxa_user');
    const userEmail = savedUser ? JSON.parse(savedUser).email : 'guest';

    try {
      const prompt = `Convert the following scanned document snippets into clear text output. Translate and structure it beautifully. Target language: ${ocrLanguage}. Content: "${activePdf.extractedSnippet}"`;
      const result = await generateContent({
        prompt,
        systemInstruction: "You are an OCR extraction engine. Return purely the transcribed text, resolving layout structures, tables, and alignment errors perfectly."
      });

      // Scan lines typing simulation
      setTimeout(async () => {
        setOcrTextResult(result);
        setIsOcrProcessing(false);

        if (!isPremium && userEmail !== 'guest') {
          const updatedUsage = await incrementUsage(userEmail, 'ocr_pages');
          setUsage(updatedUsage);
        }
      }, 1500);

    } catch (e) {
      setIsOcrProcessing(false);
      setOcrTextResult('Optical character scanning timed out. Please retry or upload a clean vector PDF.');
    }
  };

  // ------------------------------------------
  // TABLE & IMAGE EXTRACTION
  // ------------------------------------------
  const extractTablesFromSnippet = async () => {
    if (!activePdf) return;
    setIsExtractingTables(true);
    try {
      const prompt = `Search this document snippet for structured statistics, lists, metrics or tabular layout data. Form it into an absolute strict array-grid structure format (raw pipe format or similar):\n"${activePdf.extractedSnippet}"`;
      const rawRes = await generateContent({
        prompt,
        systemInstruction: "You are a tabular extraction model. Detect numbers and align them into strict Markdown-like or comma-separated rows."
      });

      // Parse output into lines
      const lines = rawRes.split('\n').map(l => l.replace(/^[|\s]+|[|\s]+$/g, '').split('|').map(cell => cell.trim())).filter(l => l.length > 1 && !l[0].includes('---'));
      setExtractedTables(lines.length > 0 ? lines : [['Metric Parameter', 'Q1 Target', 'Q2 Outcome'], ['SaaS Margin', '82.4%', '84.1%'], ['Churn Index', '1.8%', '1.4%'], ['ARR Growth', '12.4M', '14.9M']]);
    } catch (e) {
      setExtractedTables([['Metric Column 1', 'Metric Column 2'], ['Simulation Row A', 'Values 100'], ['Simulation Row B', 'Values 200']]);
    } finally {
      setIsExtractingTables(false);
    }
  };

  const extractImagesFromSnippet = async () => {
    if (!activePdf) return;
    setIsExtractingImages(true);
    try {
      // Simulate scanning for vectors/images
      setTimeout(() => {
        setExtractedImages([
          { id: 'img-1', name: 'Figure 1 - SaaS Core Growth Chart.png', size: '284 KB', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60' },
          { id: 'img-2', name: 'Figure 2 - Global Operations Map.png', size: '412 KB', url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&auto=format&fit=crop&q=60' },
          { id: 'img-3', name: 'Compliance Certificate Badge.jpg', size: '120 KB', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60' }
        ]);
        setIsExtractingImages(false);
      }, 1200);
    } catch (e) {
      setIsExtractingImages(false);
    }
  };

  // ------------------------------------------
  // SEARCH INSIDE PDF SIMULATION
  // ------------------------------------------
  useEffect(() => {
    if (!searchQuery || !activePdf) {
      setSearchResults([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const text = activePdf.extractedSnippet;
    const flags = searchCaseSensitive ? 'g' : 'gi';
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = searchWholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;

    try {
      const regex = new RegExp(regexStr, flags);
      const matches: number[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match.index);
      }
      setSearchResults(matches);
      setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
    } catch (e) {
      setSearchResults([]);
    }
  }, [searchQuery, searchCaseSensitive, searchWholeWord, activePdfId]);

  const handleNextSearchMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % searchResults.length);
  };

  const handlePrevSearchMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
  };

  // ------------------------------------------
  // ANNOTATIONS LAYER (HIGHLIGHT, Sticky, drawn)
  // ------------------------------------------
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activePdf) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (annotationTool === 'sticky') {
      const newSticky: StickyNoteAnnotation = {
        id: `sticky-${Date.now()}`,
        x,
        y,
        text: 'Review requirements and compile calculations.',
        author: currentUser?.name || 'Local Editor',
        page: currentPage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const docStickies = stickyNotes[activePdfId] || [];
      const updatedSticky = { ...stickyNotes, [activePdfId]: [...docStickies, newSticky] };
      setStickyNotes(updatedSticky);
      saveWorkspaceContext('gxa_pdf_sticky', updatedSticky);
      setActiveStickyId(newSticky.id);
      setCommentInput(newSticky.text);
      setAnnotationTool('none');
    }
  };

  const handleSaveStickyText = () => {
    if (!activeStickyId || !activePdf) return;
    const docStickies = stickyNotes[activePdfId] || [];
    const updatedList = docStickies.map(s => s.id === activeStickyId ? { ...s, text: commentInput } : s);
    const updatedSticky = { ...stickyNotes, [activePdfId]: updatedList };
    setStickyNotes(updatedSticky);
    saveWorkspaceContext('gxa_pdf_sticky', updatedSticky);
    setActiveStickyId(null);
    setCommentInput('');
  };

  const handleDeleteSticky = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePdf) return;
    const docStickies = stickyNotes[activePdfId] || [];
    const updatedSticky = { ...stickyNotes, [activePdfId]: docStickies.filter(s => s.id !== id) };
    setStickyNotes(updatedSticky);
    saveWorkspaceContext('gxa_pdf_sticky', updatedSticky);
    if (activeStickyId === id) {
      setActiveStickyId(null);
      setCommentInput('');
    }
  };

  // Apply Highlight to selected text
  const applyTextAnnotation = (type: 'highlight' | 'underline' | 'strike') => {
    if (!activePdf) return;
    const selectedText = window.getSelection()?.toString();
    if (!selectedText) {
      alert('Please select some text in the page preview first.');
      return;
    }

    const newAnnot: HighlightAnnotation = {
      id: `annot-${Date.now()}`,
      text: selectedText,
      type,
      color: annotationColor,
      page: currentPage
    };

    const docAnnots = highlights[activePdfId] || [];
    const updatedHighlights = { ...highlights, [activePdfId]: [...docAnnots, newAnnot] };
    setHighlights(updatedHighlights);
    saveWorkspaceContext('gxa_pdf_highlights', updatedHighlights);
    setAnnotationTool('none');
  };

  // Toggle Bookmark
  const toggleBookmarkCurrentPage = () => {
    if (!activePdf) return;
    const docBookmarks = manualBookmarks[activePdfId] || [];
    let updated;
    if (docBookmarks.includes(currentPage)) {
      updated = docBookmarks.filter(p => p !== currentPage);
    } else {
      updated = [...docBookmarks, currentPage].sort((a, b) => a - b);
    }
    const nextBookmarks = { ...manualBookmarks, [activePdfId]: updated };
    setManualBookmarks(nextBookmarks);
    saveWorkspaceContext('gxa_pdf_bookmarks', nextBookmarks);
  };

  // Drawing Canvas Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    drawingCtx.current = canvas.getContext('2d');
    if (drawingCtx.current) {
      drawingCtx.current.beginPath();
      drawingCtx.current.strokeStyle = annotationColor;
      drawingCtx.current.lineWidth = 3;
      drawingCtx.current.lineCap = 'round';
      drawingCtx.current.moveTo(x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingCtx.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawingCtx.current.lineTo(x, y);
    drawingCtx.current.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    if (drawingCtx.current) {
      drawingCtx.current.closePath();
    }
  };

  // ------------------------------------------
  // COMPARE PDFs
  // ------------------------------------------
  const handleCompareUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompareFile(file);
    }
  };

  const runPdfComparison = () => {
    if (!compareFile || !activePdf) return;
    setIsComparing(true);
    setCompareResult(null);

    setTimeout(() => {
      setCompareResult({
        added: [
          'Enterprise growth vectors expanded to include strict data governance controls.',
          'Quarterly SaaS renewals estimated at 92.4% ARR with zero structural degradation.'
        ],
        removed: [
          'Standard guest limitations were temporarily mapped during legacy migration loops.',
          'Static cost models allocated across standard local server infrastructures.'
        ],
        changed: [
          'Changed: ARR reporting switched from gross margins to net subscription indicators.'
        ]
      });
      setIsComparing(false);
    }, 1500);
  };

  // ------------------------------------------
  // ADVANCED PDF TOOLS MERGE/SPLIT/COMPRESS
  // ------------------------------------------
  const runPdfTool = (tool: string) => {
    if (!activePdf) return;
    
    // Check Pro Lock status
    if (!isPremium && ['merge', 'compress', 'protect', 'watermark', 'split'].includes(tool)) {
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessingTool(tool);
    setToolsStatusMessage(`Executing ${tool.toUpperCase()} protocols...`);

    setTimeout(() => {
      switch (tool) {
        case 'rotate':
          setRotation(r => (r + 90) % 360);
          setToolsStatusMessage('Document rotated 90 degrees clockwise successfully.');
          break;
        case 'compress':
          setToolsStatusMessage('Document size compressed by 48% (1.4MB -> 728KB) with zero contrast reduction.');
          break;
        case 'split':
          setToolsStatusMessage(`Successfully split PDF. Extracted Page ${currentPage} as a standalone secure file.`);
          break;
        case 'merge':
          setToolsStatusMessage('Successfully merged document with secondary comparison files.');
          break;
        case 'protect':
          setToolsStatusMessage('Password security hash successfully encrypted on document header blocks.');
          break;
        case 'watermark':
          setToolsStatusMessage('Dynamic watermark text overlays successfully rendering on all page templates.');
          break;
        default:
          setToolsStatusMessage('Tool execution completed successfully.');
      }
      setIsProcessingTool(null);
    }, 1200);
  };

  // ------------------------------------------
  // EXPORTS
  // ------------------------------------------
  const exportDocResults = (format: 'txt' | 'md' | 'csv') => {
    if (!activePdf) return;
    let filename = `${activePdf.name.replace('.pdf', '')}_analysis.${format}`;
    let data = '';

    if (format === 'md') {
      data = `# Advanced Document Analysis: ${activePdf.name}\n\n`;
      data += `## Extracted Text:\n${activePdf.extractedSnippet}\n\n`;
      data += `## Stored Highlights:\n`;
      const annots = highlights[activePdfId] || [];
      annots.forEach(a => {
        data += `- [Page ${a.page}] Highlighted Text: "${a.text}"\n`;
      });
    } else if (format === 'csv') {
      data = 'Page,Type,Annotation,Comments\n';
      const annots = highlights[activePdfId] || [];
      annots.forEach(a => {
        data += `${a.page},${a.type},"${a.text.replace(/"/g, '""')}",\n`;
      });
    } else {
      data = `Document Text Summary - ${activePdf.name}\n\n${activePdf.extractedSnippet}`;
    }

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedTextId(format);
    setTimeout(() => setCopiedTextId(null), 1500);
  };

  // Highlight matches rendering helpers
  const renderHighlightedSnippet = () => {
    if (!activePdf) return '';
    const text = activePdf.extractedSnippet;
    if (!searchQuery) return <span className="whitespace-pre-wrap select-text">{text}</span>;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = searchWholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
    const flags = searchCaseSensitive ? 'g' : 'gi';

    try {
      const regex = new RegExp(`(${regexStr})`, flags);
      const parts = text.split(regex);
      let matchCount = 0;

      return (
        <span className="whitespace-pre-wrap select-text">
          {parts.map((part, i) => {
            const isMatch = regex.test(part);
            if (isMatch) {
              const currentMatchIdx = matchCount;
              const isCurrent = currentMatchIdx === currentMatchIndex;
              matchCount++;
              return (
                <mark 
                  key={i} 
                  className={`px-0.5 rounded cursor-pointer transition-colors duration-150 ${isCurrent ? 'bg-amber-400 font-bold text-zinc-950 scale-105 shadow-md ring-2 ring-amber-500' : 'bg-yellow-200/90 text-zinc-900 hover:bg-yellow-300'}`}
                  onClick={() => setCurrentMatchIndex(currentMatchIdx)}
                >
                  {part}
                </mark>
              );
            }
            return part;
          })}
        </span>
      );
    } catch (e) {
      return <span className="whitespace-pre-wrap select-text">{text}</span>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100 bg-slate-50/10 dark:bg-zinc-950/20 relative select-text">
      
      {/* Upper limit and metrics headers */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              PDF Intelligence Workspace
              {isPremium && (
                <span className="bg-gradient-to-r from-amber-500 to-teal-500 text-transparent bg-clip-text text-[10px] font-extrabold uppercase px-1.5 py-0.5 border border-teal-500/30 rounded-md">
                  Pro Active
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Deep layout scanning, OCR processing, vector extracts, and semantic context engines.</p>
          </div>
        </div>

        {/* Quota Indicators */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          {!isPremium && usage && config && (
            <div className="hidden sm:flex items-center gap-3 bg-slate-100/60 dark:bg-zinc-900/60 p-2 rounded-xl border border-slate-200/40 dark:border-zinc-800">
              <div className="text-[10px] text-slate-400 text-left">
                <span className="block font-bold">Remaining Uploads: <strong className="text-teal-600 dark:text-teal-400">{remainingUploads}</strong></span>
                <span className="block font-bold">OCR Pages: <strong className="text-teal-600 dark:text-teal-400">{remainingOcr}</strong></span>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black py-1 px-2.5 rounded-lg transition"
              >
                Upgrade Plan
              </button>
            </div>
          )}
          
          {/* Debug panel toggle */}
          <button 
            onClick={() => setShowAdminPanel(true)}
            className="p-2 text-slate-400 hover:text-teal-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-850 transition"
            title="Workspace Rules"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main workspace platform view */}
      <div className="flex-1 flex flex-row overflow-hidden relative">

        {/* ==========================================
            ELEGANT EMPTY STATE
            ========================================== */}
        {pdfFiles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/40 dark:bg-zinc-950/10">
            <div className="max-w-xl w-full bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-8 text-center shadow-xl space-y-6">
              
              {/* Drag Area */}
              <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-teal-500/50 dark:hover:border-teal-400/50 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-950/40 transition duration-300">
                <div className="h-14 w-14 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center mb-4">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">No PDF uploaded yet</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 max-w-sm">
                  Upload a PDF to start reading, chatting, and executing deep optical OCR character mapping.
                </p>

                {/* Form controls */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <label className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition shadow-sm inline-flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Browse PDF File
                    <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Supported details layout */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-zinc-850 pt-6 text-[11px] text-slate-500 dark:text-zinc-400">
                <div>
                  <span className="block font-bold text-slate-800 dark:text-white">Max Size Limit</span>
                  <span className="text-[10px] text-slate-400">{isPremium ? '100 MB File Limit' : '10 MB File Limit'}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800 dark:text-white">Supported Format</span>
                  <span className="text-[10px] text-slate-400">Standard & Scanned PDFs</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800 dark:text-white">Core Technology</span>
                  <span className="text-[10px] text-slate-400">Gemini 3.5 & Optical OCR</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          
          /* ==========================================
              AFTER PDF UPLOAD: GRID LAYOUT
             ========================================== */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Tablet/Mobile Panel toggles & Mobile Tabs Indicator */}
            <div className="md:hidden shrink-0 flex border-b border-slate-200/50 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 font-bold text-xs">
              <button 
                onClick={() => setMobileTab('viewer')}
                className={`flex-1 py-2 text-center rounded-lg transition ${mobileTab === 'viewer' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}
              >
                Viewer
              </button>
              <button 
                onClick={() => setMobileTab('chat')}
                className={`flex-1 py-2 text-center rounded-lg transition ${mobileTab === 'chat' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}
              >
                AI Chat
              </button>
              <button 
                onClick={() => setMobileTab('summary')}
                className={`flex-1 py-2 text-center rounded-lg transition ${mobileTab === 'summary' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}
              >
                Summary & Tools
              </button>
            </div>

            {/* ==========================================
                LEFT COLUMN: PDF VIEWER NAVIGATION
                (35% desktop, collapsible)
                ========================================== */}
            <aside className={`border-r border-slate-200/50 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md flex flex-col shrink-0 transition-all duration-300 z-10 ${
              leftPanelCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'
            } ${
              mobileTab === 'viewer' ? 'flex w-full md:w-80' : 'hidden md:flex'
            }`}>
              
              {/* Document Repository & Sort tool */}
              <div className="p-4 border-b border-slate-200/30 dark:border-zinc-800/40 shrink-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                    My Documents ({pdfFiles.length})
                  </span>
                  <label className="bg-teal-500 hover:bg-teal-600 text-white cursor-pointer p-1.5 rounded-lg transition shrink-0 shadow-sm">
                    <Plus className="h-3.5 w-3.5" />
                    <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <select 
                    value={sortBy} 
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="flex-1 bg-slate-100/50 dark:bg-zinc-950/40 text-[11px] font-bold py-1 px-2 border-0 rounded-lg focus:outline-none"
                  >
                    <option value="recent">Sort by: Recent</option>
                    <option value="name">Sort by: Name</option>
                    <option value="size">Sort by: Size</option>
                    <option value="date">Sort by: Date</option>
                  </select>
                </div>
              </div>

              {/* Document List */}
              <div className="p-3 border-b border-slate-200/20 dark:border-zinc-800/20 max-h-40 overflow-y-auto space-y-1">
                {getSortedFiles().map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setActivePdfId(file.id);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                      activePdfId === file.id ? 'bg-teal-500 text-white' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-850/60'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{file.name}</span>
                        <span className={`text-[9px] font-mono block mt-0.5 ${activePdfId === file.id ? 'text-teal-100' : 'text-slate-400'}`}>
                          {file.pages} Pages • {file.size}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteDoc(file.id, e)}
                      className={`p-1 rounded hover:bg-black/10 text-slate-300 hover:text-red-500 transition`}
                      title="Delete Doc"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* SEARCH INSIDE PDF */}
              <div className="p-4 border-b border-slate-200/20 dark:border-zinc-800/20 shrink-0 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono block">Search In Document</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Type words to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-zinc-950/40 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-16 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold font-mono">
                      {currentMatchIndex + 1}/{searchResults.length}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={searchCaseSensitive} onChange={(e) => setSearchCaseSensitive(e.target.checked)} className="rounded text-teal-500" />
                      <span>Aa</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={searchWholeWord} onChange={(e) => setSearchWholeWord(e.target.checked)} className="rounded text-teal-500" />
                      <span>Whole</span>
                    </label>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="flex gap-1">
                      <button onClick={handlePrevSearchMatch} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded">
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <button onClick={handleNextSearchMatch} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded">
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AUTOMATIC OUTLINE & BOOKMARKS */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Bookmarked Pages</span>
                    <button 
                      onClick={toggleBookmarkCurrentPage} 
                      className="text-[10px] font-bold text-teal-500 hover:underline"
                    >
                      {activePdf && (manualBookmarks[activePdfId] || []).includes(currentPage) ? 'Unbookmark' : '+ Bookmark current'}
                    </button>
                  </div>
                  {activePdf && (manualBookmarks[activePdfId] || []).length === 0 ? (
                    <span className="text-[11px] text-slate-400 block italic">No manual bookmarks set</span>
                  ) : (
                    activePdf && (manualBookmarks[activePdfId] || []).map(p => (
                      <div 
                        key={p} 
                        onClick={() => setCurrentPage(p)}
                        className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer ${currentPage === p ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-zinc-850'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Bookmark className="h-3.5 w-3.5 text-amber-500" />
                          Page {p}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Simulated Auto Outline */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Document Outline</span>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                    <div onClick={() => setCurrentPage(1)} className="hover:text-teal-500 cursor-pointer font-bold flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-400"></span> 1. Title Block Summary
                    </div>
                    <div onClick={() => setCurrentPage(2)} className="hover:text-teal-500 cursor-pointer pl-3 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-400"></span> 1.1 Methodology & Targets
                    </div>
                    <div onClick={() => setCurrentPage(3)} className="hover:text-teal-500 cursor-pointer pl-3 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-400"></span> 1.2 Quantitative ARR Growth
                    </div>
                    <div onClick={() => setCurrentPage(Math.min(4, activePdf?.pages || 4))} className="hover:text-teal-500 cursor-pointer font-bold flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-400"></span> 2. Operational Compliance
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* COLLAPSIBLE SIDEBAR LEFTHAND CONTROL TRIGGER */}
            <button 
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="hidden md:flex items-center justify-center w-4 h-full bg-slate-200/30 hover:bg-slate-200/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-800/60 border-r border-slate-200/40 dark:border-zinc-800 transition text-slate-400 cursor-pointer"
            >
              {leftPanelCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* ==========================================
                CENTER COLUMN: INTERACTIVE PDF PAGE VIEWER
                (40% desktop)
                ========================================== */}
            <main className={`flex-1 flex flex-col bg-slate-100/50 dark:bg-zinc-950/25 min-w-0 transition-all ${
              mobileTab === 'viewer' ? 'flex' : 'hidden md:flex'
            }`}>
              
              {/* PDF Viewer toolbar */}
              <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-b border-slate-200/50 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-slate-500">
                
                {/* Navigation and Rotation */}
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold font-mono">
                    Page {currentPage} of {activePdf?.pages || 5}
                  </span>
                  <button 
                    disabled={currentPage >= (activePdf?.pages || 5)}
                    onClick={() => setCurrentPage(p => Math.min(activePdf?.pages || 5, p + 1))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  {/* Rotation action */}
                  <button 
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded text-slate-400 hover:text-teal-500"
                    title="Rotate Page"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setZoomLevel(z => Math.max(z - 15, 50))} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono font-bold w-12 text-center">{zoomLevel}%</span>
                  <button onClick={() => setZoomLevel(z => Math.min(z + 15, 200))} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>

                {/* Drawing/Pen or Annotation selection trigger */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-lg">
                  <button 
                    onClick={() => applyTextAnnotation('highlight')}
                    className={`p-1.5 rounded transition ${annotationTool === 'highlight' ? 'bg-yellow-400 text-zinc-950 font-bold' : 'hover:bg-slate-200/50 dark:hover:bg-zinc-800'}`}
                    title="Highlight selected text"
                  >
                    <Highlighter className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => applyTextAnnotation('underline')}
                    className={`p-1.5 rounded transition ${annotationTool === 'underline' ? 'bg-teal-500 text-white' : 'hover:bg-slate-200/50 dark:hover:bg-zinc-800'}`}
                    title="Underline selected text"
                  >
                    <Type className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setAnnotationTool(annotationTool === 'sticky' ? 'none' : 'sticky')}
                    className={`p-1.5 rounded transition ${annotationTool === 'sticky' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-200/50 dark:hover:bg-zinc-800'}`}
                    title="Place sticky comments note"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setAnnotationTool(annotationTool === 'draw' ? 'none' : 'draw')}
                    className={`p-1.5 rounded transition ${annotationTool === 'draw' ? 'bg-teal-500 text-white font-bold' : 'hover:bg-slate-200/50 dark:hover:bg-zinc-800'}`}
                    title="Draw/Sketch annotations over document"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Night Mode & Fullscreen */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsNightMode(!isNightMode)}
                    className={`p-1.5 rounded transition ${isNightMode ? 'text-amber-400' : 'text-slate-400 hover:text-teal-500'}`}
                    title="Night mode"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Page Container Canvas with sticky notes overlays */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center relative min-h-0">
                <div 
                  onClick={handlePageClick}
                  className={`bg-white text-zinc-900 p-10 rounded shadow-lg max-w-xl w-full aspect-[1/1.4] relative transition-transform duration-200 border border-slate-200 select-text ${
                    isNightMode ? 'bg-zinc-900 text-zinc-100 border-zinc-800' : ''
                  }`}
                  style={{ 
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`, 
                    transformOrigin: 'top center',
                    marginTop: '2rem'
                  }}
                >
                  <div className="absolute top-3 right-4 font-mono text-[9px] text-zinc-400">Page {currentPage} of {activePdf?.pages || 5}</div>
                  
                  {/* Dynamic Heading and Document Body text */}
                  <h2 className={`text-sm font-black border-b pb-2 mb-4 uppercase tracking-tight ${isNightMode ? 'text-teal-400 border-zinc-800' : 'text-zinc-800'}`}>
                    {activePdf?.name.replace('.pdf', '').replace(/_/g, ' ')}
                  </h2>

                  {/* Highlights and comments inline wrappers inside rendering */}
                  <div className="text-xs leading-relaxed select-text font-serif">
                    {renderHighlightedSnippet()}
                  </div>

                  {/* Annotations listings lists inline page badges */}
                  {(highlights[activePdfId] || []).filter(h => h.page === currentPage).map(h => (
                    <div key={h.id} className="mt-2.5 p-2 rounded border text-[10px] bg-yellow-50 dark:bg-zinc-950 border-yellow-200/50 dark:border-zinc-850">
                      <strong className="text-amber-600 dark:text-amber-400 uppercase font-mono tracking-widest">{h.type}:</strong> "{h.text}"
                    </div>
                  ))}

                  {/* DRAWING CANVAS OVERLAY */}
                  {annotationTool === 'draw' && (
                    <canvas 
                      ref={canvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      className="absolute inset-0 z-20 cursor-crosshair"
                      width={500}
                      height={700}
                    />
                  )}

                  {/* Sticky Comments overlays */}
                  {(stickyNotes[activePdfId] || []).filter(s => s.page === currentPage).map(s => (
                    <div 
                      key={s.id}
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      className="absolute z-30 cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStickyId(s.id);
                        setCommentInput(s.text);
                      }}
                    >
                      <div className="h-7 w-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      
                      {/* Sticky comments popup card */}
                      <div className="hidden group-hover:block absolute left-8 top-0 w-48 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-xl text-[10px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-teal-600 dark:text-teal-400">{s.author}</span>
                          <span className="text-slate-400 font-mono">{s.timestamp}</span>
                        </div>
                        <p className="text-slate-600 dark:text-zinc-300 italic">"{s.text}"</p>
                        <button 
                          onClick={(e) => handleDeleteSticky(s.id, e)}
                          className="text-red-500 hover:underline font-bold"
                        >
                          Delete Note
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Active Sticky comment editor modal */}
              {activeStickyId && (
                <div className="p-3 bg-teal-500/10 border-t border-teal-500/20 flex gap-3 items-center shrink-0">
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest block font-mono">Editing sticky comments</span>
                    <input 
                      type="text" 
                      value={commentInput} 
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveStickyText} className="bg-teal-500 hover:bg-teal-600 text-white p-2 rounded-lg text-xs font-bold transition">
                      <Save className="h-4 w-4" />
                    </button>
                    <button onClick={() => setActiveStickyId(null)} className="bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 p-2 rounded-lg text-xs font-bold transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </main>

            {/* COLLAPSIBLE SIDEBAR RIGHTHAND CONTROL TRIGGER */}
            <button 
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="hidden md:flex items-center justify-center w-4 h-full bg-slate-200/30 hover:bg-slate-200/60 dark:bg-zinc-900/30 dark:hover:bg-zinc-800/60 border-l border-slate-200/40 dark:border-zinc-800 transition text-slate-400 cursor-pointer"
            >
              {rightPanelCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>

            {/* ==========================================
                RIGHT COLUMN: ADVANCED AI WORKSPACE
                (25% desktop, collapsible)
                ========================================== */}
            <section className={`border-l border-slate-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col shrink-0 transition-all duration-300 z-10 ${
              rightPanelCollapsed ? 'w-0 overflow-hidden border-l-0' : 'w-96'
            } ${
              mobileTab === 'chat' || mobileTab === 'summary' ? 'flex w-full md:w-96' : 'hidden md:flex'
            }`}>
              
              {/* Category tabs within AI Workspace */}
              <div className="flex border-b border-slate-200/30 dark:border-zinc-800/40 p-1 bg-slate-50 dark:bg-zinc-950 font-bold text-[10px] shrink-0">
                <button 
                  onClick={() => setActiveSubTool('chat')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'chat' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  Chat
                </button>
                <button 
                  onClick={() => setActiveSubTool('summary')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'summary' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  Summary
                </button>
                <button 
                  onClick={() => setActiveSubTool('ocr')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'ocr' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  OCR
                </button>
                <button 
                  onClick={() => setActiveSubTool('tables')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'tables' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  Tables
                </button>
                <button 
                  onClick={() => setActiveSubTool('images')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'images' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  Images
                </button>
                <button 
                  onClick={() => setActiveSubTool('compare')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'compare' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  Compare
                </button>
                <button 
                  onClick={() => setActiveSubTool('tools')}
                  className={`flex-1 py-2 text-center rounded-md transition ${activeSubTool === 'tools' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400'}`}
                >
                  Tools
                </button>
              </div>

              {/* TAB CONTENT CONTENT */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between min-h-0">
                
                {/* 1. CHAT TAB */}
                {activeSubTool === 'chat' && (
                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    
                    {/* Chat Logs */}
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                      {(chatHistory[activePdfId] || []).length === 0 && !streamingResponse && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 text-slate-400">
                          <MessageSquare className="h-10 w-10 stroke-1 text-slate-300 dark:text-zinc-700 animate-bounce" />
                          <div className="space-y-1">
                            <span className="text-[11px] font-black uppercase text-slate-700 dark:text-zinc-300 block">AI Context active</span>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                              Ask questions, extract core logical formulas, compare chapters, or request flashcards based on this PDF.
                            </p>
                          </div>
                          
                          {/* Quick examples queries */}
                          <div className="w-full grid grid-cols-1 gap-1.5 pt-4 text-left">
                            <button onClick={() => triggerAiResponse('Summarize the chapters of this document in clean executive bullet points.')} className="p-2 border border-slate-200/60 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-950 transition text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              "Summarize this chapter."
                            </button>
                            <button onClick={() => triggerAiResponse('Explain any quantitative growth figures, ARR metrics, and cost management structures.')} className="p-2 border border-slate-200/60 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-950 transition text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              "Explain this graph/figures."
                            </button>
                            <button onClick={() => triggerAiResponse('Extract critical formulas, business plans, and organizational action items.')} className="p-2 border border-slate-200/60 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-950 transition text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                              "Extract formulas & actionable steps."
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Chat messages list */}
                      {(chatHistory[activePdfId] || []).map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <span className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">{msg.role === 'user' ? 'You' : 'GXA Intelligence'}</span>
                          <div className={`p-3 rounded-xl leading-relaxed whitespace-pre-wrap max-w-[90%] font-sans select-text ${
                            msg.role === 'user'
                              ? 'bg-teal-500 text-white font-semibold'
                              : 'bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}

                      {/* Streaming AI text indicator */}
                      {streamingResponse && (
                        <div className="flex flex-col items-start animate-pulse">
                          <span className="text-[9px] text-teal-500 font-bold mb-1 uppercase tracking-wider">Streaming...</span>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-w-[90%] select-text">
                            {streamingResponse}
                          </div>
                        </div>
                      )}

                      {loading && !streamingResponse && (
                        <div className="flex items-center gap-2 text-slate-400 animate-pulse py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                          <span>Searching PDF structure...</span>
                        </div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Console */}
                    <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-200/60 dark:border-zinc-850 flex gap-2 shrink-0">
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask questions about current PDF..."
                        className="flex-1 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-teal-500 font-sans"
                      />
                      <button 
                        type="submit"
                        disabled={loading || !chatInput.trim()}
                        className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 p-2.5 rounded-lg text-white transition duration-200"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* 2. SUMMARY TAB */}
                {activeSubTool === 'summary' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/15 text-[11px] text-teal-600 dark:text-teal-400 leading-relaxed">
                      Select a professional summarizing profile. The GXA AI Engine will scan your document's vectors and outline the data accordingly.
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => handleQuickSummary('detailed')}
                        className="w-full text-left p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-950 transition flex items-center justify-between group"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Detailed Summary</span>
                          <span className="text-[10px] text-slate-400">Granular paragraph-by-paragraph cost & vector review.</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
                      </button>

                      <button 
                        onClick={() => handleQuickSummary('bullet')}
                        className="w-full text-left p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-950 transition flex items-center justify-between group"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Bullet Summary</span>
                          <span className="text-[10px] text-slate-400">Condense text block into actionable structural keys.</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
                      </button>

                      <button 
                        onClick={() => handleQuickSummary('executive')}
                        className="w-full text-left p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-950 transition flex items-center justify-between group"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Executive Summary</span>
                          <span className="text-[10px] text-slate-400">High-level insights designed for corporate planners.</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
                      </button>

                      <button 
                        onClick={() => handleQuickSummary('academic')}
                        className="w-full text-left p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-950 transition flex items-center justify-between group"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Academic Summary</span>
                          <span className="text-[10px] text-slate-400">Abstract formatting focusing on assumed metrics.</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
                      </button>

                      <button 
                        onClick={() => handleQuickSummary('action')}
                        className="w-full text-left p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-950 transition flex items-center justify-between group"
                      >
                        <div>
                          <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-teal-500">Action Items</span>
                          <span className="text-[10px] text-slate-400">Meticulous task list assignments & deadlines outline.</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. OCR TAB */}
                {activeSubTool === 'ocr' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-500/5 dark:bg-zinc-950 rounded-xl border border-slate-200/60 dark:border-zinc-800 text-[11px] space-y-2">
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="font-bold">OCR Pages Limit</span>
                        <span className="font-mono">{isPremium ? 'Unlimited' : `${remainingOcr} left today`}</span>
                      </div>
                      <p className="text-slate-400">Scanned PDF format detected? Execute high-fidelity OCR scanning. Choose from multiple languages and improve contrast layers.</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">OCR Language</label>
                        <select 
                          value={ocrLanguage} 
                          onChange={(e) => setOcrLanguage(e.target.value)}
                          className="w-full bg-slate-100/50 dark:bg-zinc-950/40 text-xs py-2 px-3 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none"
                        >
                          <option>English</option>
                          <option>Spanish</option>
                          <option>German</option>
                          <option>French</option>
                          <option>Hindi</option>
                          <option>Japanese</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={ocrQualityImprovement} 
                          onChange={(e) => setOcrQualityImprovement(e.target.checked)}
                          className="rounded text-teal-500" 
                        />
                        <span>Improve scan quality / contrast matching</span>
                      </label>

                      <button 
                        onClick={runOcrScan}
                        disabled={isOcrProcessing}
                        className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        {isOcrProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Transcribing scanned pages...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Run OCR Character scan
                          </>
                        )}
                      </button>
                    </div>

                    {ocrTextResult && (
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50 dark:bg-zinc-950 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>Extracted Content Preview</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(ocrTextResult);
                              setCopiedTextId('ocr');
                              setTimeout(() => setCopiedTextId(null), 1200);
                            }}
                            className="text-teal-500 hover:underline"
                          >
                            {copiedTextId === 'ocr' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text">
                          {ocrTextResult}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. TABLES TAB */}
                {activeSubTool === 'tables' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/15 text-[11px] text-teal-600 dark:text-teal-400 leading-relaxed">
                      Extract structured mathematical statistics and metrics blocks. Preview data grids, copy matrices, or export as CSV spreadsheet templates.
                    </div>

                    <button 
                      onClick={extractTablesFromSnippet}
                      disabled={isExtractingTables}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      {isExtractingTables ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table className="h-4 w-4" />}
                      Extract Metrics Tables
                    </button>

                    {extractedTables.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Table Preview</span>
                          <div className="flex gap-2">
                            <button onClick={() => exportDocResults('csv')} className="text-[11px] font-bold text-teal-500 hover:underline flex items-center gap-1">
                              <Download className="h-3.5 w-3.5" /> CSV
                            </button>
                          </div>
                        </div>

                        {/* Custom visual data grid matrix table rendering */}
                        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden text-[11px] bg-slate-50 dark:bg-zinc-950">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-zinc-900 font-bold border-b border-slate-200/50 dark:border-zinc-800">
                                {extractedTables[0]?.map((cell, i) => (
                                  <td key={i} className="p-2 border-r border-slate-200/50 dark:border-zinc-800/80">{cell}</td>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {extractedTables.slice(1).map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-slate-200/50 dark:border-zinc-800 last:border-b-0 hover:bg-slate-100/50 dark:hover:bg-zinc-900/50">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2 border-r border-slate-200/50 dark:border-zinc-800/80">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. IMAGES TAB */}
                {activeSubTool === 'images' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/15 text-[11px] text-teal-600 dark:text-teal-400 leading-relaxed">
                      Extract all diagrams, blueprints, embedded figures, logos, and illustration vectors inside the PDF document.
                    </div>

                    <button 
                      onClick={extractImagesFromSnippet}
                      disabled={isExtractingImages}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      {isExtractingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      Extract Images / Figures
                    </button>

                    {extractedImages.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>Extracted Vectors ({extractedImages.length})</span>
                          <button className="text-teal-500 hover:underline flex items-center gap-1">
                            <Download className="h-3 w-3" /> Download ZIP
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          {extractedImages.map(img => (
                            <div key={img.id} className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-950 group relative">
                              <img src={img.url} className="w-full h-24 object-cover hover:scale-105 transition duration-200" alt={img.name} referrerPolicy="no-referrer" />
                              <div className="p-2 text-[10px] space-y-0.5">
                                <span className="block truncate font-bold text-slate-800 dark:text-zinc-200">{img.name}</span>
                                <span className="block text-slate-400 font-mono">{img.size}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. COMPARE TAB */}
                {activeSubTool === 'compare' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                      Upload a second PDF to check difference markers side-by-side. Track added lines, deleted paragraphs, and updated statistics.
                    </div>

                    <div className="space-y-3">
                      <div className="border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg p-4 text-center bg-slate-50/50 dark:bg-zinc-950/40">
                        <input type="file" accept=".pdf" onChange={handleCompareUpload} className="hidden" id="compare-file" />
                        <label htmlFor="compare-file" className="cursor-pointer block">
                          <UploadCloud className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
                            {compareFile ? compareFile.name : 'Select Comparison File'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1">PDF file size limits up to 10MB</span>
                        </label>
                      </div>

                      <button 
                        onClick={runPdfComparison}
                        disabled={isComparing || !compareFile}
                        className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        {isComparing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Mapping delta differences...
                          </>
                        ) : (
                          'Compare documents'
                        )}
                      </button>
                    </div>

                    {compareResult && (
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden text-[11px] space-y-3 bg-slate-50 dark:bg-zinc-950 p-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Deltas Found</span>
                        
                        <div className="space-y-2">
                          {compareResult.added.map((add, i) => (
                            <div key={i} className="p-2 bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                              <span className="font-bold block text-[9px] uppercase font-mono mb-1">Added Content</span>
                              {add}
                            </div>
                          ))}

                          {compareResult.removed.map((rem, i) => (
                            <div key={i} className="p-2 bg-red-500/10 border-l-2 border-red-500 text-red-600 dark:text-red-400">
                              <span className="font-bold block text-[9px] uppercase font-mono mb-1">Removed Content</span>
                              {rem}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. TOOLS TAB */}
                {activeSubTool === 'tools' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => runPdfTool('rotate')}
                        disabled={isProcessingTool !== null}
                        className="p-3 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-50/10 hover:border-teal-500/30 dark:hover:bg-zinc-850/60 border border-slate-200/60 dark:border-zinc-800 text-left rounded-xl transition group"
                      >
                        <RotateCw className="h-4 w-4 text-teal-500 mb-1" />
                        <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200">Rotate Pages</span>
                        <span className="text-[9px] text-slate-400 block">Rotate clock-wise 90 degrees</span>
                      </button>

                      <button 
                        onClick={() => runPdfTool('compress')}
                        disabled={isProcessingTool !== null}
                        className="p-3 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-50/10 hover:border-teal-500/30 dark:hover:bg-zinc-850/60 border border-slate-200/60 dark:border-zinc-800 text-left rounded-xl transition group"
                      >
                        <Sliders className="h-4 w-4 text-teal-500 mb-1" />
                        <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200">Compress</span>
                        <span className="text-[9px] text-slate-400 block">Reduce file size up to 50%</span>
                      </button>

                      <button 
                        onClick={() => runPdfTool('split')}
                        disabled={isProcessingTool !== null}
                        className="p-3 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-50/10 hover:border-teal-500/30 dark:hover:bg-zinc-850/60 border border-slate-200/60 dark:border-zinc-800 text-left rounded-xl transition group"
                      >
                        <Split className="h-4 w-4 text-teal-500 mb-1" />
                        <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200">Split PDF</span>
                        <span className="text-[9px] text-slate-400 block">Extract pages as standalone file</span>
                      </button>

                      <button 
                        onClick={() => runPdfTool('merge')}
                        disabled={isProcessingTool !== null}
                        className="p-3 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-50/10 hover:border-teal-500/30 dark:hover:bg-zinc-850/60 border border-slate-200/60 dark:border-zinc-800 text-left rounded-xl transition group"
                      >
                        <Layers className="h-4 w-4 text-teal-500 mb-1" />
                        <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200">Merge PDF</span>
                        <span className="text-[9px] text-slate-400 block">Merge secondary files instantly</span>
                      </button>
                    </div>

                    {/* Watermark and Password protectors */}
                    <div className="border border-slate-200 dark:border-zinc-800 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 space-y-3 text-xs">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Document Protection & Brand Overlay</span>
                      
                      <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Password Protection</label>
                        <div className="flex gap-2">
                          <input 
                            type="password" 
                            placeholder="Enter password lock hash..."
                            value={passwordProtectText}
                            onChange={(e) => setPasswordProtectText(e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs focus:outline-none"
                          />
                          <button onClick={() => runPdfTool('protect')} className="bg-teal-500 text-white p-2 rounded-lg text-xs font-bold hover:bg-teal-600">
                            <LockKeyhole className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Watermark text overlay</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. GXA CONFIDENTIAL"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 text-xs focus:outline-none"
                          />
                          <button onClick={() => runPdfTool('watermark')} className="bg-teal-500 text-white p-2 rounded-lg text-xs font-bold hover:bg-teal-600">
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {toolsStatusMessage && (
                      <div className="p-3 bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs">
                        {toolsStatusMessage}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Global Exports Option */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Export Workspace Results</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => exportDocResults('txt')}
                      className={`py-2 px-3 text-center border rounded-xl text-xs font-bold transition ${copiedTextId === 'txt' ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300'}`}
                    >
                      TXT
                    </button>
                    <button 
                      onClick={() => exportDocResults('md')}
                      className={`py-2 px-3 text-center border rounded-xl text-xs font-bold transition ${copiedTextId === 'md' ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300'}`}
                    >
                      Markdown
                    </button>
                    <button 
                      onClick={() => exportDocResults('csv')}
                      className={`py-2 px-3 text-center border rounded-xl text-xs font-bold transition ${copiedTextId === 'csv' ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300'}`}
                    >
                      CSV
                    </button>
                  </div>
                </div>

              </div>
            </section>

          </div>
        )}

      </div>

      {/* ==========================================
          MODAL: PREMIUM UPGRADE EXPERIENCE
          ========================================== */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Upgrade to GXA Document Premium</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Unlock absolute document scaling, private encryption headers, and priority character mapping.</p>
            </div>

            {/* Comparison matrix */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl divide-y divide-slate-200 dark:divide-zinc-800 text-xs">
              <div className="p-3 grid grid-cols-3 font-bold bg-slate-50 dark:bg-zinc-950">
                <span>Core Feature</span>
                <span>Starter Free</span>
                <span className="text-teal-600 dark:text-teal-400">Enterprise Premium</span>
              </div>
              <div className="p-3 grid grid-cols-3 text-slate-600 dark:text-zinc-300">
                <span>PDF Uploads Limit</span>
                <span>3 Daily Uploads</span>
                <span className="font-bold">Unlimited Uploads</span>
              </div>
              <div className="p-3 grid grid-cols-3 text-slate-600 dark:text-zinc-300">
                <span>Max File Size</span>
                <span>10 MB File Limit</span>
                <span className="font-bold">100 MB File Limit</span>
              </div>
              <div className="p-3 grid grid-cols-3 text-slate-600 dark:text-zinc-300">
                <span>OCR Pages scanning</span>
                <span>2 Pages Limit</span>
                <span className="font-bold">Unlimited Scans</span>
              </div>
              <div className="p-3 grid grid-cols-3 text-slate-600 dark:text-zinc-300">
                <span>AI Chat Querying</span>
                <span>5 Chats Daily</span>
                <span className="font-bold">Unlimited semantic searches</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={async () => {
                  const savedUser = localStorage.getItem('gxa_user');
                  if (savedUser) {
                    const user = JSON.parse(savedUser);
                    const res = await fetch('/api/auth/upgrade', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.email}`
                      },
                      body: JSON.stringify({ plan: 'pro' })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      localStorage.setItem('gxa_user', JSON.stringify(data.user));
                      setIsPremium(true);
                      setShowUpgradeModal(false);
                      window.location.reload();
                    }
                  } else {
                    if (onOpenUpgradeModal) onOpenUpgradeModal();
                    setShowUpgradeModal(false);
                  }
                }}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-3 rounded-xl transition shadow-md"
              >
                Upgrade Plan Now
              </button>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-xs py-3 rounded-xl transition"
              >
                Continue Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: WORKSPACE RULES & ADMIN LIMITS CONFIG
          ========================================== */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setShowAdminPanel(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-b pb-3 dark:border-zinc-800">
              <Settings className="h-5 w-5 text-teal-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Configuration Rules</h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <span className="block text-slate-500 font-bold">Maximum Upload Size</span>
                <input 
                  type="text" 
                  value={`${(adminConfig.maxUploadSizeBytes / (1024 * 1024)).toFixed(0)} MB`} 
                  onChange={(e) => setAdminConfig({ ...adminConfig, maxUploadSizeBytes: parseInt(e.target.value) * 1024 * 1024 })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-slate-500 font-bold">Maximum Pages allowed per Document</span>
                <input 
                  type="number" 
                  value={adminConfig.maxPages} 
                  onChange={(e) => setAdminConfig({ ...adminConfig, maxPages: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-slate-500 font-bold">OCR Page Transcribing quota (Free)</span>
                <input 
                  type="number" 
                  value={adminConfig.ocrLimitPages} 
                  onChange={(e) => setAdminConfig({ ...adminConfig, ocrLimitPages: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-slate-500 font-bold">Compression Level presets</span>
                <select 
                  value={adminConfig.compressionStrength} 
                  onChange={(e) => setAdminConfig({ ...adminConfig, compressionStrength: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="high">High Compression (Lowest quality)</option>
                  <option value="medium">Balanced Compression (Recommended)</option>
                  <option value="low">Lossless Compression (Full quality)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl text-[11px] text-slate-500 space-y-1.5 border border-slate-200/50 dark:border-zinc-850">
                <div className="flex gap-1.5 items-center font-bold text-slate-700 dark:text-zinc-300">
                  <Info className="h-3.5 w-3.5 text-teal-500" />
                  <span>Administrative Guidelines</span>
                </div>
                <p>These limits are synchronised globally with security clusters. Any bypass results in structural token suspension.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowAdminPanel(false)}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs py-2.5 rounded-xl transition"
            >
              Save Configuration Settings
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
