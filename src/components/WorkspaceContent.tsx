import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { WorkspaceId } from '../types';
import UniversalHome from './workspaces/UniversalHome';

const Dashboard = lazy(() => import('./workspaces/Dashboard'));
const SettingsView = lazy(() => import('./workspaces/Settings'));
const AIWriting = lazy(() => import('./workspaces/AIWriting'));
const Grammar = lazy(() => import('./workspaces/Grammar'));
const Paraphrasing = lazy(() => import('./workspaces/Paraphrasing'));
const AIDetection = lazy(() => import('./workspaces/AIDetection'));
const AIHumanizer = lazy(() => import('./workspaces/AIHumanizer'));
const AIChat = lazy(() => import('./workspaces/AIChat'));
const Translation = lazy(() => import('./workspaces/Translation'));
const Summarizer = lazy(() => import('./workspaces/Summarizer'));
const PDFIntelligence = lazy(() => import('./workspaces/PDFIntelligence'));
const OCR = lazy(() => import('./workspaces/OCR'));
const Documents = lazy(() => import('./workspaces/Documents'));
const PromptEngineering = lazy(() => import('./workspaces/PromptEngineering'));
const Templates = lazy(() => import('./workspaces/Templates'));
const Collaboration = lazy(() => import('./workspaces/Collaboration'));
const Billing = lazy(() => import('./workspaces/Billing'));
const Pricing = lazy(() => import('./workspaces/Pricing'));
const Administration = lazy(() => import('./workspaces/Administration'));
const AllTools = lazy(() => import('./workspaces/AllTools'));
const Projects = lazy(() => import('./workspaces/Projects'));
const TrashView = lazy(() => import('./workspaces/Trash'));
const StorageView = lazy(() => import('./workspaces/Storage'));
const FavoritesView = lazy(() => import('./workspaces/Favorites'));
const ImagesView = lazy(() => import('./workspaces/Images'));
const HistoryView = lazy(() => import('./workspaces/History'));
const PinnedView = lazy(() => import('./workspaces/Pinned'));
const SharedView = lazy(() => import('./workspaces/Shared'));
const CollectionsView = lazy(() => import('./workspaces/Collections'));

interface Props { activeWorkspace: WorkspaceId; onSelectWorkspace: (id: WorkspaceId) => void; onOpenUpgradeModal: () => void; onOpenTools: () => void; sharedText: string; setSharedText: (text: string) => void; currentUser?: any; isAuthenticated: boolean }

export default function WorkspaceContent(props: Props) {
  const { activeWorkspace, onSelectWorkspace, onOpenUpgradeModal, onOpenTools, sharedText, setSharedText, currentUser, isAuthenticated } = props;
  let content: React.ReactNode;
  switch (activeWorkspace) {
    case 'home': content = <UniversalHome sharedText={sharedText} setSharedText={setSharedText} onSelectWorkspace={onSelectWorkspace} onOpenTools={onOpenTools} isAuthenticated={isAuthenticated} />; break;
    case 'dashboard': content = <Dashboard onSelectWorkspace={onSelectWorkspace} onSelectTool={workspace => onSelectWorkspace(workspace)} sharedText={sharedText} setSharedText={setSharedText} onOpenUpgradeModal={onOpenUpgradeModal} currentUser={currentUser} />; break;
    case 'settings': content = <SettingsView />; break;
    case 'ai-writing': content = <AIWriting currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} />; break;
    case 'grammar': content = <Grammar sharedText={sharedText} setSharedText={setSharedText} currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} />; break;
    case 'paraphrasing': content = <Paraphrasing sharedText={sharedText} setSharedText={setSharedText} currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} />; break;
    case 'ai-detection': content = <AIDetection initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'ai-humanizer': content = <AIHumanizer initialText={sharedText} currentUser={currentUser} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'ai-chat': content = <AIChat currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} onSelectWorkspace={onSelectWorkspace} initialText={sharedText} />; break;
    case 'translation': content = <Translation initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'summarizer': content = <Summarizer initialText={sharedText} />; break;
    case 'pdf-intelligence': content = <PDFIntelligence currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} />; break;
    case 'ocr': content = <OCR currentUser={currentUser} onOpenUpgradeModal={onOpenUpgradeModal} />; break;
    case 'documents': content = <Documents currentUser={currentUser} />; break;
    case 'prompts': content = <PromptEngineering />; break;
    case 'templates': content = <Templates />; break;
    case 'collaboration': content = <Collaboration />; break;
    case 'billing': content = <Billing />; break;
    case 'pricing': content = <Pricing />; break;
    case 'administration': content = <Administration />; break;
    case 'all-tools': content = <AllTools onSelectWorkspace={onSelectWorkspace} onOpenUpgradeModal={onOpenUpgradeModal} />; break;
    case 'projects': content = <Projects />; break;
    case 'trash': content = <TrashView />; break;
    case 'storage': content = <StorageView />; break;
    case 'favorites': content = <FavoritesView onSelectWorkspace={onSelectWorkspace} />; break;
    case 'images': content = <ImagesView />; break;
    case 'history': content = <HistoryView />; break;
    case 'pinned': content = <PinnedView onSelectWorkspace={onSelectWorkspace} />; break;
    case 'shared': content = <SharedView onSelectWorkspace={onSelectWorkspace} />; break;
    case 'collections': content = <CollectionsView onSelectWorkspace={onSelectWorkspace} />; break;
    default: content = <UniversalHome sharedText={sharedText} setSharedText={setSharedText} onSelectWorkspace={onSelectWorkspace} onOpenTools={onOpenTools} isAuthenticated={isAuthenticated} />;
  }
  return <Suspense fallback={<div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-500" aria-label="Loading workspace" /></div>}>{content}</Suspense>;
}
