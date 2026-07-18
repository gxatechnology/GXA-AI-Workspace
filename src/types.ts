export type WorkspaceId = 
  | 'home'
  | 'dashboard' 
  | 'ai-writing' 
  | 'grammar' 
  | 'paraphrasing' 
  | 'ai-detection' 
  | 'translation' 
  | 'pdf-intelligence' 
  | 'ocr' 
  | 'documents' 
  | 'prompts' 
  | 'templates' 
  | 'collaboration' 
  | 'billing' 
  | 'administration'
  | 'settings'
  | 'all-tools'
  | 'projects'
  | 'ai-humanizer'
  | 'ai-chat'
  | 'summarizer'
  | 'pricing'
  | 'images'
  | 'history'
  | 'favorites'
  | 'pinned'
  | 'shared'
  | 'trash'
  | 'storage'
  | 'collections'
  | 'career'
  | 'business';

export interface Tool {
  id: string;
  name: string;
  description: string;
  iconName: string;
  workspaceId: WorkspaceId;
}

export interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  color: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  workspace: string;
  action: string;
  status: 'success' | 'warning' | 'error';
  user: string;
}
