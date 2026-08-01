import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { WorkspaceId } from '../types';
import { PublicPlan, UpgradeRequest } from '../types/pricing';
import { canonicalPlanKey } from '../utils/pricing';
import StudioPlanGate from './pricing/StudioPlanGate';
import UniversalHome from './workspaces/UniversalHome';

const Dashboard = lazy(() => import('./workspaces/UserDashboard'));
const Profile = lazy(() => import('./workspaces/Profile'));
const AccountSettings = lazy(() => import('./workspaces/AccountSettings'));
const AccountPlan = lazy(() => import('./workspaces/AccountPlan'));
const AIWriting = lazy(() => import('./workspaces/AIWriting'));
const Grammar = lazy(() => import('./workspaces/Grammar'));
const Paraphrasing = lazy(() => import('./workspaces/Paraphrasing'));
const AIDetection = lazy(() => import('./workspaces/AIDetection'));
const AIHumanizer = lazy(() => import('./workspaces/AIHumanizer'));
const AIChat = lazy(() => import('./workspaces/AIChat'));
const Translation = lazy(() => import('./workspaces/Translation'));
const CareerStudio = lazy(() => import('./workspaces/CareerStudio'));
const BusinessStudio = lazy(() => import('./workspaces/BusinessStudio'));
const Summarizer = lazy(() => import('./workspaces/Summarizer'));
const PDFIntelligence = lazy(() => import('./workspaces/PDFIntelligence'));
const OCR = lazy(() => import('./workspaces/OCR'));
const Documents = lazy(() => import('./workspaces/Documents'));
const PromptEngineering = lazy(() => import('./workspaces/PromptEngineering'));
const Templates = lazy(() => import('./workspaces/Templates'));
const Pricing = lazy(() => import('./workspaces/Pricing'));
const AllTools = lazy(() => import('./workspaces/AllTools'));
const Projects = lazy(() => import('./workspaces/Projects'));
const TrashView = lazy(() => import('./workspaces/Trash'));
const StorageView = lazy(() => import('./workspaces/Storage'));
const FavoritesView = lazy(() => import('./workspaces/Favorites'));
const ImagesView = lazy(() => import('./workspaces/Images'));
const HistoryView = lazy(() => import('./workspaces/History'));
const PinnedView = lazy(() => import('./workspaces/Pinned'));
const CollectionsView = lazy(() => import('./workspaces/Collections'));
const EnterprisePlatform = lazy(() => import('./workspaces/EnterprisePlatform'));

interface Props { activeWorkspace: WorkspaceId; onSelectWorkspace: (id: WorkspaceId) => void; onOpenUpgradeModal: (request?: Partial<UpgradeRequest>) => void; onPlanSelected: (plan: PublicPlan, sourceTool: string, returnRoute: string) => Promise<void>; onOpenTools: () => void; onRequireAuth: (mode: 'login' | 'register', returnTo: WorkspaceId) => void; sharedText: string; setSharedText: (text: string) => void; currentUser?: any; isAuthenticated: boolean }

export default function WorkspaceContent(props: Props) {
  const { activeWorkspace, onSelectWorkspace, onOpenUpgradeModal, onPlanSelected, onOpenTools, onRequireAuth, sharedText, setSharedText, currentUser, isAuthenticated } = props;
  const upgrade = (featureKey: string, featureName: string, sourceTool = activeWorkspace) => () => onOpenUpgradeModal({ featureKey, featureName, sourceTool, returnRoute: activeWorkspace });
  const hasBusinessPro = ['business-pro', 'team', 'enterprise'].includes(canonicalPlanKey(currentUser?.subscription) || '');
  let content: React.ReactNode;
  switch (activeWorkspace) {
    case 'home': content = <UniversalHome sharedText={sharedText} setSharedText={setSharedText} onSelectWorkspace={onSelectWorkspace} onOpenTools={onOpenTools} isAuthenticated={isAuthenticated} />; break;
    case 'dashboard': content = <Dashboard currentUser={currentUser} onSelectWorkspace={onSelectWorkspace} />; break;
    case 'profile': content = <Profile currentUser={currentUser} />; break;
    case 'settings': content = <AccountSettings currentUser={currentUser} />; break;
    case 'ai-writing': content = <AIWriting initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('writer.premium_templates', 'premium writing templates', 'ai-writing')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'grammar': content = <Grammar sharedText={sharedText} setSharedText={setSharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('grammar.advanced', 'advanced grammar suggestions', 'grammar')} />; break;
    case 'paraphrasing': content = <Paraphrasing sharedText={sharedText} setSharedText={setSharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('paraphraser.premium_modes', 'premium paraphrasing modes', 'paraphrasing')} />; break;
    case 'ai-detection': content = <AIDetection initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('originality.advanced', 'advanced originality tools', 'ai-detection')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'ai-humanizer': content = <AIHumanizer initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('humanizer.standard', 'AI Humanizer', 'ai-humanizer')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'ai-chat': content = <AIChat currentUser={currentUser} onOpenUpgradeModal={upgrade('chat.premium_models', 'premium chat capabilities', 'ai-chat')} onSelectWorkspace={onSelectWorkspace} initialText={sharedText} />; break;
    case 'translation': content = <Translation initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('exports.advanced', 'advanced translation exports', 'translation')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'career': content = hasBusinessPro ? <CareerStudio initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('career.basic', 'Career Studio', 'career')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} /> : <StudioPlanGate studio="Career Studio" description="Build and manage verified resumes, applications and professional career content in one complete workspace." benefits={['Resume Builder and Resume Import', 'ATS Guidance and Interview Preparation', 'Career Profile, LinkedIn and Cover Letters', 'Career Library and saved versions']} onUpgrade={upgrade('career.basic', 'Career Studio', 'career')} />; break;
    case 'business': content = hasBusinessPro ? <BusinessStudio initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('business.premium', 'Business Studio', 'business')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} /> : <StudioPlanGate studio="Business Studio" description="Create professional business, marketing, sales, commerce, report and operations content from verified information." benefits={['All registered Business Studio categories', 'Email, marketing and social workflows', 'Proposals, reports and operations tools', 'Planning, campaign and commerce workflows']} onUpgrade={upgrade('business.basic', 'Business Studio', 'business')} />; break;
    case 'summarizer': content = <Summarizer initialText={sharedText} />; break;
    case 'pdf-intelligence': content = <PDFIntelligence currentUser={currentUser} onOpenUpgradeModal={upgrade('documents.intelligence', 'document intelligence', 'pdf-intelligence')} />; break;
    case 'ocr': content = <OCR initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('documents.intelligence', 'document intelligence', 'ocr')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'documents': content = <Documents currentUser={currentUser} />; break;
    case 'prompts': content = <PromptEngineering currentUser={currentUser} />; break;
    case 'templates': content = <Templates />; break;
    case 'collaboration': content = <EnterprisePlatform currentUser={currentUser} initialSection="members" onSelectWorkspace={onSelectWorkspace} />; break;
    case 'billing': content = <AccountPlan currentUser={currentUser} onSelectWorkspace={onSelectWorkspace} />; break;
    case 'pricing': content = <Pricing currentUser={currentUser} onSelectWorkspace={onSelectWorkspace} onPlanSelected={onPlanSelected} />; break;
    case 'administration': content = <EnterprisePlatform currentUser={currentUser} initialSection="admin" onSelectWorkspace={onSelectWorkspace} />; break;
    case 'platform': content = <EnterprisePlatform currentUser={currentUser} onSelectWorkspace={onSelectWorkspace} />; break;
    case 'all-tools': content = <AllTools onSelectWorkspace={onSelectWorkspace} onOpenUpgradeModal={upgrade('writer.premium_templates', 'premium tools', 'all-tools')} />; break;
    case 'projects': content = <Projects currentUser={currentUser} />; break;
    case 'trash': content = <TrashView currentUser={currentUser} />; break;
    case 'storage': content = <StorageView currentUser={currentUser} />; break;
    case 'favorites': content = <FavoritesView currentUser={currentUser} />; break;
    case 'images': content = <ImagesView initialText={sharedText} currentUser={currentUser} onOpenUpgradeModal={upgrade('media.premium', 'premium media tools', 'images')} onSelectWorkspace={onSelectWorkspace} setSharedText={setSharedText} />; break;
    case 'history': content = <HistoryView currentUser={currentUser} />; break;
    case 'pinned': content = <PinnedView currentUser={currentUser} />; break;
    case 'shared': content = <EnterprisePlatform currentUser={currentUser} initialSection="members" onSelectWorkspace={onSelectWorkspace} />; break;
    case 'collections': content = <CollectionsView currentUser={currentUser} />; break;
    default: content = <UniversalHome sharedText={sharedText} setSharedText={setSharedText} onSelectWorkspace={onSelectWorkspace} onOpenTools={onOpenTools} isAuthenticated={isAuthenticated} />;
  }
  return <Suspense fallback={<div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-500" aria-label="Loading workspace" /></div>}>{content}</Suspense>;
}
