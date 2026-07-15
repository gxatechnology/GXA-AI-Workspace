import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  FileText, 
  ArrowLeftRight, 
  CheckSquare, 
  ShieldAlert, 
  ArrowRight, 
  Upload, 
  Clipboard, 
  ChevronRight, 
  Bookmark, 
  MessageSquare,
  Zap,
  MoreHorizontal,
  Plus,
  Clock,
  ExternalLink,
  Bot,
  Trash2,
  CheckCircle,
  Search,
  Star,
  User,
  Scan,
  Cpu,
  Languages,
  Layout,
  Users,
  File,
  X,
  PlusCircle,
  FolderPlus,
  HelpCircle,
  Heart,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import { WorkspaceId } from '../../types';

// Core tools database with categories
interface ToolItem {
  id: WorkspaceId;
  name: string;
  desc: string;
  icon: string;
  category: 'writing' | 'editing' | 'reading' | 'documents' | 'productivity';
}

const TOOLS_LIST: ToolItem[] = [
  { id: 'ai-writing', name: 'AI Writer', desc: 'Generate papers, essays, and articles', icon: 'Sparkles', category: 'writing' },
  { id: 'paraphrasing', name: 'Paraphraser', desc: 'Rephrase paragraphs with custom styles', icon: 'ArrowLeftRight', category: 'writing' },
  { id: 'grammar', name: 'Grammar Checker', desc: 'Identify syntax faults and style issues', icon: 'CheckSquare', category: 'editing' },
  { id: 'ai-humanizer', name: 'AI Humanizer', desc: 'Make robotic AI text sound natural', icon: 'User', category: 'editing' },
  { id: 'ai-detection', name: 'AI Detector', desc: 'Check text for machine-generated signals', icon: 'ShieldAlert', category: 'editing' },
  { id: 'ai-chat', name: 'AI Chat Assistant', desc: 'Brainstorm and chat with your co-pilot', icon: 'MessageSquare', category: 'writing' },
  { id: 'summarizer', name: 'Summarizer', desc: 'Condense dense papers into reports', icon: 'Clock', category: 'reading' },
  { id: 'translation', name: 'Translator', desc: 'Translate copy across 30+ languages', icon: 'Languages', category: 'reading' },
  { id: 'pdf-intelligence', name: 'PDF Intelligence', desc: 'Chat and query your PDF documents', icon: 'FileText', category: 'documents' },
  { id: 'ocr', name: 'Neural OCR', desc: 'Extract editable text from images/scans', icon: 'Scan', category: 'documents' },
  { id: 'prompts', name: 'Prompts Studio', desc: 'Craft and store custom prompt models', icon: 'Cpu', category: 'productivity' },
  { id: 'templates', name: 'Document Templates', desc: 'Standard business and research forms', icon: 'Layout', category: 'productivity' },
  { id: 'collaboration', name: 'Team Space', desc: 'Manage project sharing with team seats', icon: 'Users', category: 'productivity' }
];

// Document templates definitions
interface TemplateItem {
  id: string;
  name: string;
  desc: string;
  category: 'Writing' | 'Business' | 'Academic' | 'Marketing' | 'Career';
  targetWorkspace: WorkspaceId;
}

const TEMPLATES_LIST: TemplateItem[] = [
  { id: 'resume', name: 'Resume Outline', desc: 'ATS-optimized professional curriculum vitae structure', category: 'Career', targetWorkspace: 'ai-writing' },
  { id: 'blog', name: 'SEO Blog Article', desc: 'SEO-driven high-engagement blog post structure', category: 'Writing', targetWorkspace: 'ai-writing' },
  { id: 'presentation', name: 'SaaS Pitch Deck', desc: 'SaaS pitch deck slides and sequence notes', category: 'Business', targetWorkspace: 'templates' },
  { id: 'proposal', name: 'B2B Client Proposal', desc: 'B2B outreach outline, goals and terms contract', category: 'Business', targetWorkspace: 'templates' },
  { id: 'email', name: 'Cold Sales Outreach', desc: 'High-conversion cold email sequence drafts', category: 'Writing', targetWorkspace: 'ai-writing' },
  { id: 'research-paper', name: 'Scientific Abstract', desc: 'Academic outline, citations and abstract formats', category: 'Academic', targetWorkspace: 'ai-writing' },
  { id: 'meeting-notes', name: 'Executive Meeting Notes', desc: 'Action points, owners, and key decision log outlines', category: 'Business', targetWorkspace: 'summarizer' },
  { id: 'social-media', name: 'LinkedIn Carousel Draft', desc: 'High-authority professional thought-leadership post', category: 'Marketing', targetWorkspace: 'ai-writing' },
  { id: 'marketing', name: 'Landing Page Hero Copy', desc: 'Persuasive AIDA landing page headers and copy outlines', category: 'Marketing', targetWorkspace: 'ai-writing' },
  { id: 'cover-letter', name: 'Executive Cover Letter', desc: 'Tailored application pitches presenting premium metrics', category: 'Career', targetWorkspace: 'ai-writing' }
];

// Icon mapper helper
const renderIcon = (name: string, className: string = 'h-4 w-4') => {
  const map: Record<string, any> = {
    Sparkles: <Sparkles className={className} />,
    ArrowLeftRight: <ArrowLeftRight className={className} />,
    CheckSquare: <CheckSquare className={className} />,
    User: <User className={className} />,
    ShieldAlert: <ShieldAlert className={className} />,
    MessageSquare: <MessageSquare className={className} />,
    Clock: <Clock className={className} />,
    Languages: <Languages className={className} />,
    FileText: <FileText className={className} />,
    Scan: <Scan className={className} />,
    Cpu: <Cpu className={className} />,
    Layout: <Layout className={className} />,
    Users: <Users className={className} />
  };
  return map[name] || <Sparkles className={className} />;
};

interface DashboardProps {
  onSelectWorkspace: (id: WorkspaceId) => void;
  onSelectTool: (workspaceId: WorkspaceId, toolId: string) => void;
  sharedText: string;
  setSharedText: (text: string) => void;
  onOpenUpgradeModal: () => void;
  currentUser?: any;
}

export default function Dashboard({ 
  onSelectWorkspace, 
  onSelectTool,
  sharedText,
  setSharedText,
  onOpenUpgradeModal,
  currentUser
}: DashboardProps) {
  // Mode configuration
  const isGuestUser = !currentUser || currentUser.guest || currentUser.role === 'Guest' || currentUser.email === 'guest@gxa.io';
  const userName = isGuestUser ? 'Guest' : (currentUser?.name?.split(' ')[0] || 'User');

  // Interactive local states
  const [dragActive, setDragActive] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isGuestUser);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('success');
  
  // Simulated File Upload states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  // Global search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>('All');

  // Persistence: Pinned & Recent state
  const [pinnedTools, setPinnedTools] = useState<WorkspaceId[]>([]);
  const [recentTools, setRecentTools] = useState<WorkspaceId[]>([]);
  const [lastOpenedProject, setLastOpenedProject] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        createBlankDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sharedText, projects]);

  // Load persistence states on mount
  useEffect(() => {
    try {
      const savedPinned = localStorage.getItem('gxa_pinned_tools');
      if (savedPinned) {
        setPinnedTools(JSON.parse(savedPinned));
      } else {
        // Defaults
        const defaultPinned: WorkspaceId[] = ['ai-writing', 'grammar', 'pdf-intelligence'];
        setPinnedTools(defaultPinned);
        localStorage.setItem('gxa_pinned_tools', JSON.stringify(defaultPinned));
      }

      const savedRecent = localStorage.getItem('gxa_recent_tools');
      if (savedRecent) {
        setRecentTools(JSON.parse(savedRecent));
      }

      const savedLastProj = localStorage.getItem('gxa_last_opened_project');
      if (savedLastProj) {
        setLastOpenedProject(JSON.parse(savedLastProj));
      }
    } catch (e) {
      console.error('Failed to load local Workspace configurations:', e);
    }
  }, []);

  // Fetch real authenticated projects and files
  const fetchWorkspaceData = async () => {
    if (isGuestUser) {
      setLoading(false);
      return;
    }
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    try {
      const user = JSON.parse(savedUser);
      
      // Projects
      const projRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${user.email}` }
      });
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects || []);
      }

      // Documents
      const docRes = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${user.email}` }
      });
      if (docRes.ok) {
        const data = await docRes.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load authenticated workspace items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [currentUser]);

  // Register Workspace Actions to track recent usage
  const handleAction = (workspace: WorkspaceId) => {
    try {
      // Add to recent tools
      let updatedRecent = [...recentTools];
      updatedRecent = updatedRecent.filter(id => id !== workspace);
      updatedRecent.unshift(workspace);
      updatedRecent = updatedRecent.slice(0, 5); // top 5
      setRecentTools(updatedRecent);
      localStorage.setItem('gxa_recent_tools', JSON.stringify(updatedRecent));
    } catch (e) {
      console.error(e);
    }
    onSelectWorkspace(workspace);
  };

  // Toggle pin/unpin tool
  const togglePinTool = (toolId: WorkspaceId, e: React.MouseEvent) => {
    e.stopPropagation();
    let updatedPinned = [...pinnedTools];
    if (updatedPinned.includes(toolId)) {
      updatedPinned = updatedPinned.filter(id => id !== toolId);
    } else {
      updatedPinned.push(toolId);
    }
    setPinnedTools(updatedPinned);
    localStorage.setItem('gxa_pinned_tools', JSON.stringify(updatedPinned));
    triggerNotification(`Updated favorites shortcut.`, 'info');
  };

  // Utility notification
  const triggerNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMsg(text);
    setStatusType(type);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // Create real Project item
  const createBlankDraft = async () => {
    if (isGuestUser) {
      triggerNotification('Sign In to persist databases!', 'error');
      return;
    }
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    const user = JSON.parse(savedUser);
    
    try {
      const customName = sharedText.trim() 
        ? sharedText.split(' ').slice(0, 3).join(' ') + '...' 
        : `Blank Draft #${projects.length + 1}`;
      
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`
        },
        body: JSON.stringify({
          name: customName,
          type: 'Document Draft',
          toolUsed: 'Workspace Composer',
          previewText: sharedText || 'New document draft created securely in your GXA workspace.',
          status: 'Draft'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => [data.project, ...prev]);
        setLastOpenedProject(data.project);
        localStorage.setItem('gxa_last_opened_project', JSON.stringify(data.project));
        triggerNotification('Draft saved to database!', 'success');
      }
    } catch (err) {
      triggerNotification('Connection error while saving.', 'error');
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuestUser) return;
    const savedUser = localStorage.getItem('gxa_user');
    if (!savedUser) return;
    const user = JSON.parse(savedUser);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.email}`
        }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (lastOpenedProject?.id === id) {
          setLastOpenedProject(null);
          localStorage.removeItem('gxa_last_opened_project');
        }
        triggerNotification('Project deleted.', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileParsing(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileParsing(file);
    }
  };

  const handleFileParsing = (file: File) => {
    setUploadProgress(15);
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + 25;
      });
    }, 150);

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        clearInterval(progressTimer);
        setUploadProgress(100);
        setTimeout(() => {
          if (event.target?.result) {
            setSharedText(event.target.result as string);
            triggerNotification(`Loaded "${file.name}"`, 'success');
          }
          setUploadProgress(null);
        }, 300);
      }, 500);
    };
    reader.onerror = () => {
      clearInterval(progressTimer);
      setUploadProgress(null);
      triggerNotification('Failed to read text file.', 'error');
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    setIsPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSharedText(text);
        triggerNotification('Pasted text from clipboard!', 'success');
      } else {
        triggerNotification('Clipboard is empty.', 'info');
      }
    } catch (err) {
      triggerNotification('Clipboard access denied.', 'error');
    } finally {
      setTimeout(() => setIsPasting(false), 800);
    }
  };

  // Filter templates list
  const filteredTemplates = TEMPLATES_LIST.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) || 
                          t.desc.toLowerCase().includes(templateSearchQuery.toLowerCase());
    const matchesCategory = selectedTemplateCat === 'All' || t.category === selectedTemplateCat;
    return matchesSearch && matchesCategory;
  });

  // Global search filtering across Tools, Templates, Projects, and Documents
  const isSearching = searchQuery.trim() !== '';
  const searchResults = {
    tools: TOOLS_LIST.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase())),
    templates: TEMPLATES_LIST.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase())),
    projects: projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.previewText && p.previewText.toLowerCase().includes(searchQuery.toLowerCase()))),
    documents: documents.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
  };
  const totalSearchCount = searchResults.tools.length + searchResults.templates.length + searchResults.projects.length + searchResults.documents.length;

  // Words & Characters calculation
  const wordsCount = sharedText.trim() === '' ? 0 : sharedText.trim().split(/\s+/).filter(Boolean).length;
  const charsCount = sharedText.length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fade-in text-slate-800 dark:text-zinc-100 text-left">
      
      {/* GLOBAL SEARCH BAR (Only for logged in users) */}
      {!isGuestUser && (
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-500 transition-colors">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, documents, templates, tools... (Press ⌘K or Ctrl+K)"
            className="w-full pl-12 pr-12 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500 shadow-xs transition-all placeholder:text-slate-400/85"
            aria-label="Global Workspace Search"
          />
          {isSearching ? (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition"
              title="Clear Search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 rounded">
              ⌘K
            </kbd>
          )}
        </div>
      )}

      {/* GLOBAL SEARCH RESULTS WINDOW OVERLAY */}
      {isSearching && !isGuestUser && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-2xl p-6 shadow-xl space-y-5 animate-slide-up">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800/60 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Search Results ({totalSearchCount} found)</span>
            <button onClick={() => setSearchQuery('')} className="text-xs font-bold text-teal-500 hover:underline">Clear Search</button>
          </div>

          {totalSearchCount === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Search className="h-7 w-7 text-slate-300 mx-auto animate-bounce" />
              <h5 className="text-xs font-bold text-slate-600 dark:text-zinc-400">No search matches</h5>
              <p className="text-[10px] text-slate-400">We couldn't find matches for "{searchQuery}" in tools, projects or documents.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Category: Tools */}
              {searchResults.tools.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Tools ({searchResults.tools.length})</span>
                  <div className="space-y-1.5">
                    {searchResults.tools.map(tool => (
                      <div 
                        key={tool.id} 
                        onClick={() => { handleAction(tool.id); setSearchQuery(''); }}
                        className="p-2 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-500/10 dark:hover:bg-teal-500/10 border border-slate-200/50 dark:border-zinc-800 rounded-xl flex items-center gap-2.5 cursor-pointer transition text-left"
                      >
                        <div className="p-1.5 bg-white dark:bg-zinc-900 text-teal-500 rounded border">
                          {renderIcon(tool.icon, 'h-3.5 w-3.5')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white block">{tool.name}</span>
                          <span className="text-[9px] text-slate-400 truncate block">{tool.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Templates */}
              {searchResults.templates.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Templates ({searchResults.templates.length})</span>
                  <div className="space-y-1.5">
                    {searchResults.templates.map(tmpl => (
                      <div 
                        key={tmpl.id} 
                        onClick={() => { handleAction(tmpl.targetWorkspace); setSearchQuery(''); }}
                        className="p-2 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-500/10 dark:hover:bg-teal-500/10 border border-slate-200/50 dark:border-zinc-800 rounded-xl flex items-center gap-2.5 cursor-pointer transition text-left"
                      >
                        <Bookmark className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white block">{tmpl.name}</span>
                          <span className="text-[9px] text-slate-400 truncate block">{tmpl.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Projects */}
              {searchResults.projects.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Projects ({searchResults.projects.length})</span>
                  <div className="space-y-1.5">
                    {searchResults.projects.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => { handleAction('projects'); setSearchQuery(''); }}
                        className="p-2 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-500/10 dark:hover:bg-teal-500/10 border border-slate-200/50 dark:border-zinc-800 rounded-xl flex items-center gap-2.5 cursor-pointer transition text-left"
                      >
                        <File className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate">{p.name}</span>
                          <span className="text-[9px] text-slate-400 truncate block">{p.previewText}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: Documents */}
              {searchResults.documents.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Documents ({searchResults.documents.length})</span>
                  <div className="space-y-1.5">
                    {searchResults.documents.map(d => (
                      <div 
                        key={d.id}
                        onClick={() => { handleAction('pdf-intelligence'); setSearchQuery(''); }}
                        className="p-2 bg-slate-50 dark:bg-zinc-950 hover:bg-teal-500/10 dark:hover:bg-teal-500/10 border border-slate-200/50 dark:border-zinc-800 rounded-xl flex items-center gap-2.5 cursor-pointer transition text-left"
                      >
                        <FileText className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate">{d.name}</span>
                          <span className="text-[9px] text-slate-400 truncate block">{d.pages} pages • {d.size}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. GREETING CARD / BANNER AREA */}
      <div className="space-y-2 flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-slate-100 dark:border-zinc-800/70 pb-5">
        <div className="space-y-1">
          {isGuestUser ? (
            <>
              <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                Welcome to GXA AI Workspace
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                AI-powered productivity for writing, documents and creativity.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                Hi, {userName}!
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Create something amazing today.
              </p>
            </>
          )}
        </div>

        {statusMsg && (
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all duration-300 animate-slide-up ${
            statusType === 'success' 
              ? 'bg-teal-50/50 border-teal-200 text-teal-600 dark:bg-teal-950/20 dark:border-teal-900 dark:text-teal-400' 
              : statusType === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400'
              : 'bg-indigo-50 border-indigo-200 text-indigo-500 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400'
          }`}>
            <CheckCircle className="h-4 w-4 shrink-0" /> {statusMsg}
          </div>
        )}
      </div>

      {/* 2. MAIN COMPOSER CENTERPIECE */}
      <div className="max-w-3xl mx-auto w-full">
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative bg-white dark:bg-zinc-900 rounded-3xl border-2 transition duration-300 shadow-md flex flex-col p-6 min-h-[300px] ${
            dragActive 
              ? 'border-teal-500 bg-teal-500/[0.02]' 
              : 'border-slate-200/85 dark:border-zinc-800 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/10'
          }`}
        >
          {/* Main Input Text Area */}
          <div className="flex-1 flex flex-col">
            <label htmlFor="workspace-composer" className="sr-only">AI Composer Area</label>
            <textarea
              id="workspace-composer"
              value={sharedText}
              onChange={(e) => setSharedText(e.target.value)}
              placeholder="Write...&#10;Paste text...&#10;Upload a document...&#10;or choose a tool below."
              className="w-full flex-1 bg-transparent border-none text-slate-800 dark:text-zinc-100 placeholder-slate-400/80 focus:outline-none resize-none text-sm leading-relaxed min-h-[160px]"
              aria-multiline="true"
            />

            {/* Drag and drop overlay visual hint */}
            {dragActive && (
              <div className="absolute inset-0 bg-teal-500/[0.04] backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none rounded-3xl">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-full border border-teal-500/20 shadow-lg mb-2">
                  <Upload className="h-8 w-8 text-teal-500 animate-bounce" />
                </div>
                <p className="text-xs font-bold text-teal-600">Drop text / Markdown file to read instantly</p>
              </div>
            )}

            {/* Parsing progress spinner */}
            {uploadProgress !== null && (
              <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none rounded-3xl">
                <div className="w-48 bg-slate-100 dark:bg-zinc-950 h-1.5 rounded-full overflow-hidden border">
                  <div 
                    className="bg-teal-500 h-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-2 block">Parsing document layers ({uploadProgress}%)</span>
              </div>
            )}
          </div>

          {/* Composer bottom utility control shelf */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/60 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold transition focus:ring-2 focus:ring-teal-500/30 outline-none"
                title="Upload plain text or markdown file"
              >
                <Upload className="h-3.5 w-3.5 text-teal-500" />
                <span>Upload</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".txt,.md,.rtf" 
                className="hidden" 
              />

              <button 
                onClick={handlePaste}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold transition focus:ring-2 focus:ring-teal-500/30 outline-none"
                title="Paste plain text from system clipboard"
              >
                {isPasting ? <Check className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> : <Clipboard className="h-3.5 w-3.5 text-teal-500" />}
                <span>{isPasting ? 'Pasted!' : 'Paste'}</span>
              </button>

              {sharedText.trim() !== '' && (
                <span className="text-[10px] font-mono text-slate-400/90 font-bold transition duration-300">
                  {charsCount} Chars • {wordsCount} Words
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {sharedText.trim() !== '' && (
                <button 
                  onClick={() => setSharedText('')}
                  className="text-xs text-slate-400 hover:text-rose-500 font-bold px-3 py-1.5 rounded-xl transition"
                >
                  Clear
                </button>
              )}
              
              {!isGuestUser && (
                <button 
                  onClick={createBlankDraft}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 active:scale-95 text-white px-4 py-2 text-xs font-bold shadow-xs transition"
                  title="Alt+N to create or save a draft project"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Draft</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTION PILLS */}
      <div className="space-y-2.5">
        <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">Quick Actions</span>
        <div className="flex flex-wrap gap-2 text-left">
          <button 
            onClick={() => handleAction('ai-writing')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <Plus className="h-4 w-4 text-teal-500" /> Create
          </button>
          <button 
            onClick={() => handleAction('paraphrasing')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <ArrowLeftRight className="h-4 w-4 text-teal-500" /> Paraphrase
          </button>
          <button 
            onClick={() => handleAction('grammar')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <CheckSquare className="h-4 w-4 text-teal-500" /> Grammar
          </button>
          <button 
            onClick={() => handleAction('summarizer')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <Clock className="h-4 w-4 text-teal-500" /> Summarize
          </button>
          <button 
            onClick={() => handleAction('translation')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <Languages className="h-4 w-4 text-teal-500" /> Translate
          </button>
          <button 
            onClick={() => handleAction('ai-chat')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <MessageSquare className="h-4 w-4 text-teal-500" /> AI Chat
          </button>
          <button 
            onClick={() => handleAction('ai-humanizer')}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 transition"
          >
            <Sparkles className="h-4 w-4 text-teal-500" /> Humanize
          </button>
          <button 
            onClick={() => handleAction('all-tools')}
            className="inline-flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/45 rounded-xl px-4 py-2 text-xs font-bold text-teal-600 dark:text-teal-400 transition"
          >
            <MoreHorizontal className="h-4 w-4 text-teal-500 animate-pulse" /> More
          </button>
        </div>
      </div>

      {/* STOP GUESTS FROM VIEWING SECONDARY PERSONALIZED DASHBOARDS */}
      {!isGuestUser ? (
        <div className="grid gap-8">
          
          {/* 4. PINNED FAVORITES & RECENT TOOLS */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">My Workspace Tools Shortcuts</span>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {/* Show Pinned tools first */}
              {TOOLS_LIST.filter(tool => pinnedTools.includes(tool.id)).map(tool => (
                <div 
                  key={tool.id}
                  onClick={() => handleAction(tool.id)}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 p-4 hover:border-teal-500/45 dark:hover:border-teal-500/45 transition duration-200 cursor-pointer flex items-start gap-3 relative group"
                >
                  <div className="p-2.5 bg-teal-50/50 dark:bg-teal-950/25 border border-teal-100 dark:border-teal-900 text-teal-500 rounded-xl shrink-0">
                    {renderIcon(tool.icon, 'h-4 w-4')}
                  </div>
                  <div className="flex-1 min-w-0 pr-6 text-left">
                    <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-teal-500 transition">{tool.name}</span>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{tool.desc}</p>
                  </div>
                  <button 
                    onClick={(e) => togglePinTool(tool.id, e)}
                    className="absolute top-3.5 right-3.5 text-amber-500 hover:text-slate-400 transition"
                    title="Remove from favorites list"
                  >
                    <Star className="h-4 w-4 fill-amber-500" />
                  </button>
                </div>
              ))}

              {/* Show unpinned Tools (Frequently used fallback) */}
              {TOOLS_LIST.filter(tool => !pinnedTools.includes(tool.id)).slice(0, 3).map(tool => (
                <div 
                  key={tool.id}
                  onClick={() => handleAction(tool.id)}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 p-4 hover:border-teal-500/45 dark:hover:border-teal-500/45 transition duration-200 cursor-pointer flex items-start gap-3 relative group"
                >
                  <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-400 group-hover:text-teal-500 transition rounded-xl shrink-0">
                    {renderIcon(tool.icon, 'h-4 w-4')}
                  </div>
                  <div className="flex-1 min-w-0 pr-6 text-left">
                    <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-teal-500 transition">{tool.name}</span>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{tool.desc}</p>
                  </div>
                  <button 
                    onClick={(e) => togglePinTool(tool.id, e)}
                    className="absolute top-3.5 right-3.5 text-slate-300 hover:text-amber-500 transition opacity-0 group-hover:opacity-100"
                    title="Add to favorites list"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Recent tools block */}
            <div className="flex flex-wrap items-center gap-2 pt-2.5 text-xs text-slate-400 font-bold">
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Recently Launched:</span>
              {recentTools.length === 0 ? (
                <span className="italic text-slate-400/80 font-medium">No recently used tools.</span>
              ) : (
                recentTools.map(id => {
                  const match = TOOLS_LIST.find(t => t.id === id);
                  if (!match) return null;
                  return (
                    <button 
                      key={id}
                      onClick={() => handleAction(id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-[10px] font-bold text-slate-600 dark:text-zinc-400 transition"
                    >
                      {renderIcon(match.icon, 'h-3 w-3 text-teal-500')} {match.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 5. RECENT PROJECTS SECTION */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">
              My Recent Projects ({projects.length})
            </span>
            {loading ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                <Clock className="h-6 w-6 animate-spin text-teal-500 mx-auto mb-2" />
                <span className="text-xs text-slate-400 font-bold">Synchronizing storage cache...</span>
              </div>
            ) : projects.length === 0 ? (
              /* High Fidelity Empty State with Button */
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-850 p-10 text-center space-y-4 max-w-lg mx-auto">
                <FolderPlus className="h-10 w-10 mx-auto text-slate-300 dark:text-zinc-700 animate-pulse" />
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-zinc-300">No recent projects yet</h5>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed max-w-xs mx-auto">
                    Your document database is currently empty. Start drafting in the main composer and save your work securely.
                  </p>
                </div>
                <button 
                  onClick={createBlankDraft}
                  className="inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 active:scale-95 text-white font-bold text-[10px] px-4 py-2 rounded-xl transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Create First Project
                </button>
              </div>
            ) : (
              /* Dynamic Project List */
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 max-h-[350px] overflow-y-auto pr-1">
                {projects.map((proj) => (
                  <div 
                    key={proj.id}
                    onClick={() => handleAction('projects')}
                    className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/40 dark:hover:border-teal-500/40 transition duration-200 cursor-pointer text-left relative group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate pr-4">{proj.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-950 text-[8px] font-bold text-slate-400 dark:text-zinc-500 border rounded">
                          {proj.toolUsed}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 line-clamp-2 mt-1 leading-relaxed">{proj.previewText}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-850">
                      <span className="text-[8px] text-slate-400 font-bold font-mono">
                        {proj.status || 'Draft'}
                      </span>
                      <button 
                        onClick={(e) => deleteProject(proj.id, e)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition"
                        title="Delete project draft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. TEMPLATES WORKSPACE */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">Recommended Templates Studio</span>
              
              {/* Template Category filter bar */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none bg-slate-100/50 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/40 dark:border-zinc-850">
                {['All', 'Business', 'Writing', 'Marketing', 'Career'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedTemplateCat(cat)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ${
                      selectedTemplateCat === cat 
                        ? 'bg-white dark:bg-zinc-900 text-teal-600 shadow-xs' 
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Template filter search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                placeholder="Search premium templates structures..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-teal-500"
              />
              {templateSearchQuery && (
                <button 
                  onClick={() => setTemplateSearchQuery('')} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-850">
                <span className="text-xs text-slate-400 font-bold block">No matching template found</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Try searching for other categories or words.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {filteredTemplates.map((tmpl) => (
                  <div 
                    key={tmpl.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/40 dark:hover:border-teal-500/40 transition duration-200 text-left"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold font-mono tracking-wider">{tmpl.category}</span>
                        <Bookmark className="h-3.5 w-3.5 text-teal-500" />
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1">{tmpl.name}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{tmpl.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-850 flex justify-end">
                      <button 
                        onClick={() => handleAction(tmpl.targetWorkspace)}
                        className="text-[10px] font-black text-teal-500 hover:text-teal-600 flex items-center gap-0.5 transition"
                      >
                        Launch Template <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7. SECURE ENVIRONMENT STATEMENTS AND ACCESSIBILITY NOTES */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 rounded-2xl">
            <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-teal-500" />
              Keyboard Shortcuts: alt + n (new blank draft), alt + s (save draft), ctrl + k (focus search)
            </span>
            <div className="flex gap-4 text-[9px] font-bold text-slate-400">
              <a href="#accessibility" className="hover:underline" title="Tab-navigation active">Screen Reader Friendly</a>
              <span>•</span>
              <a href="#compliance" className="hover:underline">Secure Cloud Environment</a>
            </div>
          </div>

        </div>
      ) : (
        /* Dynamic message reminding guest that premium lists exist */
        <div className="p-4 bg-slate-100/40 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-850 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-[10px] text-slate-400 font-bold block">
            ⭐ Custom templates, pin tools, and dynamic document persistence are unlocked with your free profile.
          </span>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white font-black text-[9px] rounded-lg uppercase tracking-wider transition"
          >
            Create Profile / Login
          </button>
        </div>
      )}

    </div>
  );
}
