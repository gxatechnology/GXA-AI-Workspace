import { WorkspaceId } from './types';

export type ToolCategory =
  | 'Writing and Rewriting'
  | 'AI Content Creation'
  | 'AI Chat and Research'
  | 'PDF and Document Intelligence'
  | 'Originality and Writing Quality'
  | 'Translation and Languages'
  | 'Templates and Workflows'
  | 'Productivity Utilities'
  | 'Team and Enterprise'
  | 'Account and Administration'
  | 'Career and Professional';

export interface ToolDefinition {
  id: string;
  name: string;
  route: WorkspaceId;
  icon: string;
  category: ToolCategory;
  description: string;
  guestAccess: boolean;
  planAccess: 'Free' | 'Pro' | 'Pro Plus' | 'Account' | 'Admin';
  status: 'available' | 'beta';
  keywords: string[];
  primary: boolean;
  more: boolean;
  isNew?: boolean;
}

export const toolRegistry: ToolDefinition[] = [
  { id: 'career', name: 'Career Studio', route: 'career', icon: 'briefcase', category: 'Career and Professional', description: 'Build resumes, review ATS guidance and prepare for interviews.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['resume', 'career', 'ats', 'cover letter', 'interview'], primary: false, more: true, isNew: true },
  { id: 'paraphraser', name: 'Paraphraser', route: 'paraphrasing', icon: 'repeat', category: 'Writing and Rewriting', description: 'Rewrite text while preserving its meaning.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['rewrite', 'rephrase', 'fluency'], primary: true, more: true },
  { id: 'grammar', name: 'Grammar Checker', route: 'grammar', icon: 'check', category: 'Originality and Writing Quality', description: 'Improve grammar, spelling, clarity and structure.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['spelling', 'punctuation', 'proofread'], primary: true, more: true },
  { id: 'chat', name: 'AI Chat', route: 'ai-chat', icon: 'chat', category: 'AI Chat and Research', description: 'Ask questions and work with an AI assistant.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['assistant', 'research', 'conversation'], primary: true, more: true },
  { id: 'writer', name: 'AI Writer', route: 'ai-writing', icon: 'pen', category: 'AI Content Creation', description: 'Create professional, academic and business content.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['article', 'email', 'essay', 'content'], primary: true, more: true },
  { id: 'summarizer', name: 'Summarizer', route: 'summarizer', icon: 'summary', category: 'Writing and Rewriting', description: 'Condense long text into useful takeaways.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['summary', 'shorten', 'key points'], primary: true, more: true },
  { id: 'translator', name: 'Translator', route: 'translation', icon: 'languages', category: 'Translation and Languages', description: 'Translate content while preserving tone.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['language', 'localization', 'translate'], primary: true, more: true },
  { id: 'humanizer', name: 'AI Humanizer', route: 'ai-humanizer', icon: 'sparkles', category: 'Originality and Writing Quality', description: 'Make mechanical writing sound more natural.', guestAccess: true, planAccess: 'Pro', status: 'available', keywords: ['natural', 'tone', 'humanize'], primary: false, more: true },
  { id: 'detector', name: 'AI Detector', route: 'ai-detection', icon: 'shield', category: 'Originality and Writing Quality', description: 'Review stylistic signals in supplied writing.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['detection', 'originality', 'analysis'], primary: false, more: true },
  { id: 'pdf', name: 'PDF Intelligence', route: 'pdf-intelligence', icon: 'file', category: 'PDF and Document Intelligence', description: 'Read, analyze and work with PDF documents.', guestAccess: true, planAccess: 'Pro', status: 'available', keywords: ['pdf', 'document', 'chat', 'extract'], primary: true, more: true },
  { id: 'ocr', name: 'OCR', route: 'ocr', icon: 'scan', category: 'PDF and Document Intelligence', description: 'Extract editable text from images and scans.', guestAccess: true, planAccess: 'Pro Plus', status: 'available', keywords: ['scan', 'image', 'text extraction'], primary: false, more: true },
  { id: 'prompts', name: 'Prompt Studio', route: 'prompts', icon: 'terminal', category: 'AI Content Creation', description: 'Create and manage reusable prompt structures.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['prompt', 'instructions', 'studio'], primary: false, more: true },
  { id: 'templates', name: 'Templates', route: 'templates', icon: 'layout', category: 'Templates and Workflows', description: 'Launch structured document and content workflows.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['template', 'workflow', 'document'], primary: false, more: true },
  { id: 'all-tools', name: 'All AI Tools', route: 'all-tools', icon: 'grid', category: 'Productivity Utilities', description: 'Browse the complete legacy tool collection.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['tools', 'catalog', 'apps'], primary: false, more: true },
  { id: 'images', name: 'Image Studio', route: 'images', icon: 'image', category: 'AI Content Creation', description: 'Create and manage image assets.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['image', 'visual', 'asset'], primary: false, more: true },
  { id: 'projects', name: 'Projects', route: 'projects', icon: 'folder', category: 'Templates and Workflows', description: 'Organize related work and project files.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['project', 'organize', 'workspace'], primary: false, more: true },
  { id: 'documents', name: 'Documents', route: 'documents', icon: 'document', category: 'Templates and Workflows', description: 'Create, save and reopen workspace documents.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['document', 'draft', 'file'], primary: false, more: true },
  { id: 'history', name: 'History', route: 'history', icon: 'history', category: 'Productivity Utilities', description: 'Reopen previous authenticated activity.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['history', 'recent', 'activity'], primary: false, more: true },
  { id: 'favorites', name: 'Favorites', route: 'favorites', icon: 'heart', category: 'Productivity Utilities', description: 'Access starred workspace items.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['favorites', 'starred', 'saved'], primary: false, more: true },
  { id: 'pinned', name: 'Pinned Items', route: 'pinned', icon: 'pin', category: 'Productivity Utilities', description: 'Keep important items close at hand.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['pin', 'important', 'quick'], primary: false, more: true },
  { id: 'shared', name: 'Shared with Me', route: 'shared', icon: 'share', category: 'Team and Enterprise', description: 'Open resources shared with your account.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['shared', 'team', 'collaboration'], primary: false, more: true },
  { id: 'collaboration', name: 'Team Space', route: 'collaboration', icon: 'users', category: 'Team and Enterprise', description: 'Collaborate across workspace seats.', guestAccess: false, planAccess: 'Pro Plus', status: 'available', keywords: ['team', 'collaborate', 'enterprise'], primary: false, more: true },
  { id: 'collections', name: 'Collections', route: 'collections', icon: 'collection', category: 'Productivity Utilities', description: 'Group work into focused collections.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['collection', 'group', 'organize'], primary: false, more: true },
  { id: 'storage', name: 'Storage', route: 'storage', icon: 'database', category: 'Account and Administration', description: 'Review authenticated workspace storage.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['storage', 'quota', 'files'], primary: false, more: true },
  { id: 'trash', name: 'Trash', route: 'trash', icon: 'trash', category: 'Productivity Utilities', description: 'Review deleted workspace items.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['trash', 'deleted', 'restore'], primary: false, more: true },
  { id: 'dashboard', name: 'Legacy Dashboard', route: 'dashboard', icon: 'dashboard', category: 'Productivity Utilities', description: 'Open the original workspace dashboard.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['dashboard', 'legacy', 'workspace'], primary: false, more: true },
  { id: 'settings', name: 'Settings', route: 'settings', icon: 'settings', category: 'Account and Administration', description: 'Manage workspace preferences.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['settings', 'preferences', 'account'], primary: false, more: true },
  { id: 'billing', name: 'Billing', route: 'billing', icon: 'card', category: 'Account and Administration', description: 'Manage subscription and billing details.', guestAccess: false, planAccess: 'Account', status: 'available', keywords: ['billing', 'subscription', 'invoice'], primary: false, more: true },
  { id: 'pricing', name: 'Pricing', route: 'pricing', icon: 'card', category: 'Account and Administration', description: 'Compare Free, Pro and Pro Plus access.', guestAccess: true, planAccess: 'Free', status: 'available', keywords: ['pricing', 'plans', 'upgrade'], primary: false, more: true },
  { id: 'administration', name: 'Administration', route: 'administration', icon: 'shield', category: 'Account and Administration', description: 'Protected workspace configuration.', guestAccess: false, planAccess: 'Admin', status: 'available', keywords: ['admin', 'configuration', 'limits'], primary: false, more: false },
];

export const registryCategories = Array.from(new Set(toolRegistry.filter(tool => tool.more).map(tool => tool.category)));
export const getTool = (route: WorkspaceId) => toolRegistry.find(tool => tool.route === route);
export const isAuthenticatedRoute = (route: WorkspaceId) => Boolean(getTool(route) && !getTool(route)?.guestAccess);
