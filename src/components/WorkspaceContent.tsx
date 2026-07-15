import React from 'react';
import { WorkspaceId } from '../types';
import Dashboard from './workspaces/Dashboard';
import SettingsView from './workspaces/Settings';

// Import New High-Fidelity Enterprise Workspaces
import AIWriting from './workspaces/AIWriting';
import Grammar from './workspaces/Grammar';
import Paraphrasing from './workspaces/Paraphrasing';
import AIDetection from './workspaces/AIDetection';
import Translation from './workspaces/Translation';
import PDFIntelligence from './workspaces/PDFIntelligence';
import OCR from './workspaces/OCR';
import Documents from './workspaces/Documents';
import PromptEngineering from './workspaces/PromptEngineering';
import Templates from './workspaces/Templates';
import Collaboration from './workspaces/Collaboration';
import Billing from './workspaces/Billing';
import Pricing from './workspaces/Pricing';
import Administration from './workspaces/Administration';

// Redesigned additional workspaces
import AllTools from './workspaces/AllTools';
import Projects from './workspaces/Projects';
import AIHumanizer from './workspaces/AIHumanizer';
import AIChat from './workspaces/AIChat';
import Summarizer from './workspaces/Summarizer';

// Workspace Hub Systems
import TrashView from './workspaces/Trash';
import StorageView from './workspaces/Storage';
import FavoritesView from './workspaces/Favorites';
import ImagesView from './workspaces/Images';
import HistoryView from './workspaces/History';
import PinnedView from './workspaces/Pinned';
import SharedView from './workspaces/Shared';
import CollectionsView from './workspaces/Collections';

interface WorkspaceContentProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  onOpenUpgradeModal: () => void;
  sharedText: string;
  setSharedText: (text: string) => void;
  currentUser?: any;
}

export default function WorkspaceContent({ 
  activeWorkspace, 
  onSelectWorkspace,
  onOpenUpgradeModal,
  sharedText,
  setSharedText,
  currentUser
}: WorkspaceContentProps) {
  // Simple tool navigation inside dashboard click handlers
  const handleSelectTool = (workspaceId: WorkspaceId, toolId: string) => {
    onSelectWorkspace(workspaceId);
  };

  switch (activeWorkspace) {
    case 'dashboard':
      return (
        <Dashboard 
          onSelectWorkspace={onSelectWorkspace} 
          onSelectTool={handleSelectTool} 
          sharedText={sharedText}
          setSharedText={setSharedText}
          onOpenUpgradeModal={onOpenUpgradeModal}
          currentUser={currentUser}
        />
      );
    case 'settings':
      return <SettingsView />;
    
    // Switch routing cases for all SaaS workspaces
    case 'ai-writing':
      return (
        <AIWriting 
          currentUser={currentUser}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
    case 'grammar':
      return (
        <Grammar 
          sharedText={sharedText} 
          setSharedText={setSharedText} 
          currentUser={currentUser}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
    case 'paraphrasing':
      return (
        <Paraphrasing 
          sharedText={sharedText} 
          setSharedText={setSharedText} 
          currentUser={currentUser}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
    case 'ai-detection':
      return <AIDetection />;
    case 'translation':
      return <Translation />;
    case 'pdf-intelligence':
      return (
        <PDFIntelligence 
          currentUser={currentUser}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
    case 'ocr':
      return (
        <OCR 
          currentUser={currentUser}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
    case 'documents':
      return <Documents />;
    case 'prompts':
      return <PromptEngineering />;
    case 'templates':
      return <Templates />;
    case 'collaboration':
      return <Collaboration />;
    case 'billing':
      return <Billing />;
    case 'pricing':
      return <Pricing />;
    case 'administration':
      return <Administration />;

    // Redesigned routes
    case 'all-tools':
      return <AllTools onSelectWorkspace={onSelectWorkspace} onOpenUpgradeModal={onOpenUpgradeModal} />;
    case 'projects':
      return <Projects />;
    case 'ai-humanizer':
      return <AIHumanizer />;
    case 'ai-chat':
      return (
        <AIChat 
          currentUser={currentUser}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
    case 'summarizer':
      return <Summarizer />;

    // Workspace Systems Routes
    case 'trash':
      return <TrashView />;
    case 'storage':
      return <StorageView />;
    case 'favorites':
      return <FavoritesView onSelectWorkspace={onSelectWorkspace} />;
    case 'images':
      return <ImagesView />;
    case 'history':
      return <HistoryView />;
    case 'pinned':
      return <PinnedView onSelectWorkspace={onSelectWorkspace} />;
    case 'shared':
      return <SharedView onSelectWorkspace={onSelectWorkspace} />;
    case 'collections':
      return <CollectionsView onSelectWorkspace={onSelectWorkspace} />;

    default:
      return (
        <Dashboard 
          onSelectWorkspace={onSelectWorkspace} 
          onSelectTool={handleSelectTool} 
          sharedText={sharedText}
          setSharedText={setSharedText}
          onOpenUpgradeModal={onOpenUpgradeModal}
        />
      );
  }
}

