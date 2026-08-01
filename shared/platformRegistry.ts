export type PlanId = 'free' | 'pro' | 'pro_plus' | 'business-pro' | 'team' | 'enterprise';
export type TenantType = 'personal' | 'organization';

export const PLATFORM_PERMISSIONS = [
  'organization.view', 'organization.update', 'organization.delete',
  'members.view', 'members.invite', 'members.update', 'members.remove',
  'teams.view', 'teams.manage', 'billing.view', 'billing.manage',
  'projects.create', 'projects.view', 'projects.update', 'projects.delete',
  'documents.create', 'documents.view', 'documents.update', 'documents.delete',
  'brandkits.manage', 'glossaries.manage', 'templates.manage', 'assets.manage',
  'automations.manage', 'api_keys.manage', 'webhooks.manage', 'audit_logs.view',
  'usage.view', 'exports.manage', 'settings.manage',
] as const;

export type PlatformPermission = typeof PLATFORM_PERMISSIONS[number];
export type OrganizationRoleId = 'owner' | 'admin' | 'manager' | 'editor' | 'member' | 'viewer' | 'billing_admin' | 'developer';
export type AdminRoleId = 'super_admin' | 'platform_admin' | 'billing_admin' | 'support_admin' | 'security_admin' | 'moderation_admin' | 'analyst';

const all = [...PLATFORM_PERMISSIONS];
const contentRead: PlatformPermission[] = ['organization.view', 'members.view', 'teams.view', 'projects.view', 'documents.view'];
const contentWrite: PlatformPermission[] = [...contentRead, 'projects.create', 'projects.update', 'documents.create', 'documents.update', 'brandkits.manage', 'glossaries.manage', 'templates.manage', 'assets.manage'];

export const ORGANIZATION_ROLES: Record<OrganizationRoleId, { name: string; description: string; permissions: PlatformPermission[]; system: true }> = {
  owner: { name: 'Owner', description: 'Owns the organization and all administrative controls.', permissions: all, system: true },
  admin: { name: 'Admin', description: 'Manages members, teams, resources and settings without ownership transfer.', permissions: all.filter(item => item !== 'organization.delete' && item !== 'billing.manage'), system: true },
  manager: { name: 'Manager', description: 'Manages members, teams and shared resources.', permissions: [...contentWrite, 'members.invite', 'members.update', 'teams.manage', 'automations.manage', 'usage.view'], system: true },
  editor: { name: 'Editor', description: 'Creates and edits shared content.', permissions: [...contentWrite, 'automations.manage'], system: true },
  member: { name: 'Member', description: 'Creates and works with shared resources.', permissions: contentWrite, system: true },
  viewer: { name: 'Viewer', description: 'Reads resources shared with the organization.', permissions: contentRead, system: true },
  billing_admin: { name: 'Billing Admin', description: 'Reviews and manages organization billing.', permissions: ['organization.view', 'billing.view', 'billing.manage', 'usage.view'], system: true },
  developer: { name: 'Developer', description: 'Manages API keys, webhooks and automations.', permissions: [...contentRead, 'api_keys.manage', 'webhooks.manage', 'automations.manage', 'usage.view'], system: true },
};
export const ADMIN_ROLES: Record<AdminRoleId, { name: string; scopes: string[] }> = {
  super_admin: { name: 'Super Admin', scopes: ['*'] },
  platform_admin: { name: 'Platform Admin', scopes: ['users.read', 'organizations.read', 'organizations.manage', 'plans.manage', 'providers.read', 'flags.manage', 'audit.read', 'health.read'] },
  billing_admin: { name: 'Billing Admin', scopes: ['users.read', 'organizations.read', 'subscriptions.read', 'subscriptions.manage', 'billing.read', 'audit.read'] },
  support_admin: { name: 'Support Admin', scopes: ['users.read', 'organizations.read', 'support.manage', 'sessions.revoke', 'audit.read'] },
  security_admin: { name: 'Security Admin', scopes: ['security.read', 'sessions.revoke', 'api_keys.revoke', 'audit.read', 'health.read'] },
  moderation_admin: { name: 'Content Moderation Admin', scopes: ['moderation.read', 'moderation.manage', 'audit.read'] },
  analyst: { name: 'Read-Only Analyst', scopes: ['users.read', 'organizations.read', 'subscriptions.read', 'usage.read', 'audit.read', 'health.read'] },
};

export const ENTITLEMENT_KEYS = [
  'ai_chat', 'paraphraser', 'grammar_checker', 'ai_writer', 'document_intelligence', 'ai_detector', 'humanizer', 'originality', 'translation', 'resume_builder', 'resume_import', 'ats_guidance', 'cover_letter_tools', 'career_profile', 'linkedin_bio', 'interview_preparation', 'career_library', 'career_studio', 'business_studio', 'professional_studios', 'media_studio', 'premium_templates', 'premium_workflows', 'batch_processing', 'advanced_exports', 'api_access', 'automations', 'organizations', 'team_members', 'audit_logs', 'custom_retention',
] as const;

export type EntitlementKey = typeof ENTITLEMENT_KEYS[number];

const inheritEntitlements = (parent: readonly EntitlementKey[], additions: readonly EntitlementKey[]): EntitlementKey[] =>
  [...new Set([...parent, ...additions])];

const freeEntitlements: EntitlementKey[] = ['ai_chat', 'paraphraser', 'grammar_checker', 'ai_writer', 'ai_detector', 'translation', 'media_studio'];
const starterEntitlements = inheritEntitlements(freeEntitlements, ['document_intelligence', 'humanizer', 'originality', 'advanced_exports']);
const proEntitlements = inheritEntitlements(starterEntitlements, ['batch_processing', 'api_access', 'automations', 'organizations', 'team_members', 'audit_logs']);
const businessProEntitlements = inheritEntitlements(proEntitlements, ['business_studio', 'career_studio', 'resume_builder', 'resume_import', 'ats_guidance', 'cover_letter_tools', 'career_profile', 'linkedin_bio', 'interview_preparation', 'career_library', 'premium_templates', 'premium_workflows', 'professional_studios']);

export const BUSINESS_PRO_PLAN_HIGHLIGHTS = [
  'Everything in Pro',
  'Complete Business Studio',
  'Complete Career Studio',
  'Resume Builder and ATS tools',
  'All premium templates and workflows',
  'Maximum individual limits',
] as const;

export interface PlanDefinition {
  id: PlanId;
  key: PlanId;
  name: string;
  displayName: string;
  description: string;
  currency: 'INR';
  monthlyPriceMinor: number | null;
  annualPriceMinor: null;
  billingType: 'free' | 'fixed' | 'contact';
  billingIntervals: Array<'monthly'>;
  active: boolean;
  public: boolean;
  upgradeable: boolean;
  recommended: boolean;
  contactSales: boolean;
  rank: number;
  audience: string;
  entitlements: EntitlementKey[];
  limits: Record<string, number>;
}

export const PLAN_REGISTRY: Record<PlanId, PlanDefinition> = {
  free: { id: 'free', key: 'free', name: 'Free', displayName: 'Free', description: 'Essential AI tools for personal use.', currency: 'INR', monthlyPriceMinor: 0, annualPriceMinor: null, billingType: 'free', billingIntervals: [], active: true, public: true, upgradeable: false, recommended: false, contactSales: false, rank: 0, audience: 'Individuals starting with GXA AI', entitlements: freeEntitlements, limits: { organizations: 0, team_members: 0, api_keys: 0, webhooks: 0, automations: 0, ai_requests_month: 100, project_limit: 3, saved_document_limit: 10, max_input_characters: 12000, max_output_tokens: 1200, available_ai_models: 1, storage_mb: 100, history_days: 7 } },
  pro: { id: 'pro', key: 'pro', name: 'Starter', displayName: 'Starter', description: 'Core writing tools with more requests, projects and documents.', currency: 'INR', monthlyPriceMinor: 9900, annualPriceMinor: null, billingType: 'fixed', billingIntervals: ['monthly'], active: true, public: true, upgradeable: true, recommended: false, contactSales: false, rank: 10, audience: 'Individuals using essential AI tools', entitlements: starterEntitlements, limits: { organizations: 0, team_members: 0, api_keys: 0, webhooks: 0, automations: 0, ai_requests_month: 1000, project_limit: 25, saved_document_limit: 100, max_input_characters: 50000, max_output_tokens: 3000, available_ai_models: 2, storage_mb: 2048, history_days: 90 } },
  pro_plus: { id: 'pro_plus', key: 'pro_plus', name: 'Pro', displayName: 'Pro', description: 'Higher limits, premium AI features and more room for individual work.', currency: 'INR', monthlyPriceMinor: 14900, annualPriceMinor: null, billingType: 'fixed', billingIntervals: ['monthly'], active: true, public: true, upgradeable: true, recommended: true, contactSales: false, rank: 20, audience: 'Advanced individual creators and professionals', entitlements: proEntitlements, limits: { organizations: 1, team_members: 5, api_keys: 2, webhooks: 3, automations: 5, automation_runs_month: 100, api_requests_month: 1000, ai_requests_month: 5000, project_limit: 100, saved_document_limit: 1000, max_input_characters: 120000, max_output_tokens: 8000, available_ai_models: 3, storage_mb: 10240, history_days: 365 } },
  'business-pro': { id: 'business-pro', key: 'business-pro', name: 'Business Pro', displayName: 'Business Pro', description: 'Everything in Pro, plus complete Business Studio, Career Studio, premium workflows and maximum individual limits.', currency: 'INR', monthlyPriceMinor: 49900, annualPriceMinor: null, billingType: 'fixed', billingIntervals: ['monthly'], active: true, public: true, upgradeable: true, recommended: false, contactSales: false, rank: 30, audience: 'Business owners, agencies, consultants and professional teams of one', entitlements: businessProEntitlements, limits: { organizations: 1, team_members: 5, api_keys: 5, webhooks: 10, automations: 20, automation_runs_month: 1000, api_requests_month: 10000, ai_requests_month: 20000, project_limit: 500, saved_document_limit: 5000, max_input_characters: 200000, max_output_tokens: 12000, available_ai_models: 3, storage_mb: 51200, history_days: 730 } },
  team: { id: 'team', key: 'team', name: 'Team', displayName: 'Team', description: 'Reserved for a future team-workspace release.', currency: 'INR', monthlyPriceMinor: null, annualPriceMinor: null, billingType: 'contact', billingIntervals: [], active: false, public: false, upgradeable: false, recommended: false, contactSales: true, rank: 40, audience: 'Future team workspaces', entitlements: [...ENTITLEMENT_KEYS].filter(item => item !== 'custom_retention'), limits: { organizations: 5, team_members: 50, api_keys: 20, webhooks: 20, automations: 50, automation_runs_month: 5000, api_requests_month: 50000, ai_requests_month: 50000, project_limit: 1000, saved_document_limit: 10000, max_input_characters: 200000, max_output_tokens: 12000, available_ai_models: 3, storage_mb: 102400, history_days: 730 } },
  enterprise: { id: 'enterprise', key: 'enterprise', name: 'Enterprise', displayName: 'Enterprise', description: 'Reserved for a future enterprise release.', currency: 'INR', monthlyPriceMinor: null, annualPriceMinor: null, billingType: 'contact', billingIntervals: [], active: false, public: false, upgradeable: false, recommended: false, contactSales: true, rank: 50, audience: 'Future enterprise workspaces', entitlements: [...ENTITLEMENT_KEYS], limits: { organizations: 100, team_members: 10000, api_keys: 500, webhooks: 500, automations: 1000, automation_runs_month: 1000000, api_requests_month: 10000000, ai_requests_month: 10000000, project_limit: 100000, saved_document_limit: 1000000, max_input_characters: 500000, max_output_tokens: 32000, available_ai_models: 3, storage_mb: 10485760, history_days: 3650 } },
};

export const PLAN_ALIASES: Readonly<Record<string, PlanId>> = {
  free: 'free', pro: 'pro', pro_monthly: 'pro', premium: 'pro',
  pro_plus: 'pro_plus', proplus: 'pro_plus', premium_plus: 'pro_plus',
  business_pro: 'business-pro', businesspro: 'business-pro',
  team: 'team', enterprise: 'enterprise',
};

export const PLAN_FEATURE_LABELS: Readonly<Record<EntitlementKey, string>> = {
  ai_chat: 'AI Chat', paraphraser: 'Paraphraser', grammar_checker: 'Grammar Checker', ai_writer: 'AI Writer',
  document_intelligence: 'Document intelligence', ai_detector: 'AI Detector', humanizer: 'AI Humanizer', originality: 'Originality tools',
  translation: 'Translation', resume_builder: 'Resume Builder', resume_import: 'Resume Import', ats_guidance: 'ATS Guidance', cover_letter_tools: 'Cover Letter tools', career_profile: 'Career Profile', linkedin_bio: 'LinkedIn & Bio', interview_preparation: 'Interview Preparation', career_library: 'Career Library', career_studio: 'Career Studio', business_studio: 'Business Studio', professional_studios: 'Future professional studios', media_studio: 'Media Studio',
  premium_templates: 'Premium templates', premium_workflows: 'Premium workflows', batch_processing: 'Batch processing', advanced_exports: 'Advanced exports',
  api_access: 'API access', automations: 'Automations', organizations: 'Organization workspaces', team_members: 'Team member controls', audit_logs: 'Audit logs',
  custom_retention: 'Custom retention',
};

export const FEATURE_PLAN_REQUIREMENTS = {
  'paraphraser.standard': 'free', 'paraphraser.fluency': 'free', 'paraphraser.premium_modes': 'pro_plus',
  'grammar.basic': 'free', 'grammar.advanced': 'pro', 'chat.basic': 'free', 'chat.premium_models': 'pro_plus',
  'writer.basic': 'free', 'writer.premium_templates': 'business-pro', 'documents.intelligence': 'pro',
  'documents.batch': 'pro_plus', 'originality.detector': 'free', 'originality.advanced': 'pro', 'humanizer.standard': 'pro',
  'translation.basic': 'free', 'exports.advanced': 'pro', 'platform.api': 'pro_plus', 'platform.automations': 'pro_plus',
  'platform.organizations': 'pro_plus', 'media.basic': 'free', 'media.premium': 'pro', 'media.batch': 'pro_plus',
  'business.basic': 'business-pro', 'business.premium': 'business-pro', 'career.basic': 'business-pro', 'career.resume_builder': 'business-pro', 'career.ats_guidance': 'business-pro', 'career.cover_letters': 'business-pro', 'career.interview_preparation': 'business-pro', 'studios.professional': 'business-pro', 'account.saved_content': 'free', 'account.upgrade': 'pro',
} as const satisfies Record<string, PlanId>;

export type FeatureKey = keyof typeof FEATURE_PLAN_REQUIREMENTS;

export interface FeatureUpgradePresentation {
  heading: string;
  description: string;
  benefits: string[];
}

const businessStudioBenefits = ['Complete Business Studio', 'Complete Career Studio', 'Resume Builder and ATS tools', 'All premium templates and workflows', 'Maximum individual limits'];
const careerStudioBenefits = ['Complete Career Studio', 'Resume Builder and ATS tools', 'Cover Letter tools', 'Interview Preparation', 'Maximum individual limits'];

export const FEATURE_UPGRADE_PRESENTATIONS: Readonly<Partial<Record<FeatureKey, FeatureUpgradePresentation>>> = {
  'business.basic': {
    heading: 'Unlock Business Studio',
    description: 'Business Pro is required to access Business Studio and all professional business tools.',
    benefits: businessStudioBenefits,
  },
  'business.premium': {
    heading: 'Unlock Business Studio',
    description: 'Business Pro is required to access Business Studio and all professional business tools.',
    benefits: businessStudioBenefits,
  },
  'career.basic': {
    heading: 'Unlock Career Studio',
    description: 'Business Pro is required to access Resume Builder, ATS Guidance, Cover Letters, Interview Preparation and Career Studio.',
    benefits: careerStudioBenefits,
  },
  'career.resume_builder': { heading: 'Unlock Career Studio', description: 'Business Pro is required to access Resume Builder, ATS Guidance, Cover Letters, Interview Preparation and Career Studio.', benefits: careerStudioBenefits },
  'career.ats_guidance': { heading: 'Unlock Career Studio', description: 'Business Pro is required to access Resume Builder, ATS Guidance, Cover Letters, Interview Preparation and Career Studio.', benefits: careerStudioBenefits },
  'career.cover_letters': { heading: 'Unlock Career Studio', description: 'Business Pro is required to access Resume Builder, ATS Guidance, Cover Letters, Interview Preparation and Career Studio.', benefits: careerStudioBenefits },
  'career.interview_preparation': { heading: 'Unlock Career Studio', description: 'Business Pro is required to access Resume Builder, ATS Guidance, Cover Letters, Interview Preparation and Career Studio.', benefits: careerStudioBenefits },
};

export const resolvePlanKey = (value: unknown): PlanId | null => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || /^\d+(?:\.\d+)?$/.test(raw)) return null;
  const normalized = raw.replace(/[ -]+/g, '_');
  return PLAN_ALIASES[normalized] || null;
};

export const minimumPlanForFeature = (featureKey: string): PlanId | null => FEATURE_PLAN_REQUIREMENTS[featureKey as FeatureKey] || null;

export const upgradePresentationForFeature = (featureKey: string): FeatureUpgradePresentation | null =>
  FEATURE_UPGRADE_PRESENTATIONS[featureKey as FeatureKey] || null;

export const planIncludesFeature = (planKey: PlanId, featureKey: string) => {
  const minimum = minimumPlanForFeature(featureKey);
  return minimum ? PLAN_REGISTRY[planKey].rank >= PLAN_REGISTRY[minimum].rank : false;
};

export const API_SCOPES = ['usage:read', 'translation:write', 'chat:write', 'documents:read', 'documents:write', 'images:generate', 'images:edit', 'automations:run'] as const;
export type ApiScope = typeof API_SCOPES[number];

export const WEBHOOK_EVENTS = ['document.processed', 'document.failed', 'image.generated', 'report.ready', 'automation.completed', 'automation.failed', 'subscription.updated', 'usage.threshold_reached', 'project.updated'] as const;
export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

export const AUTOMATION_TRIGGERS = [
  { id: 'manual', name: 'Manual', available: true },
  { id: 'api_request', name: 'API request', available: true },
  { id: 'document_uploaded', name: 'Document uploaded', available: true },
  { id: 'project_updated', name: 'Project updated', available: true },
  { id: 'usage_threshold', name: 'Usage threshold', available: true },
] as const;

export const AUTOMATION_ACTIONS = [
  { id: 'create_project', name: 'Create project', available: true },
  { id: 'record_audit_event', name: 'Record audit event', available: true },
  { id: 'send_webhook', name: 'Send approved webhook', available: true },
] as const;

export const INTEGRATION_REGISTRY = [
  { id: 'webhooks', name: 'Webhooks', category: 'Developer Tools', authType: 'signing_secret', enabled: true, beta: false, supportedTriggers: ['api_request'], supportedActions: ['send_webhook'] },
] as const;

export const DEFAULT_FEATURE_FLAGS = [
  { key: 'platform.organizations', description: 'Organization and workspace management', enabled: true, securityRelevant: true },
  { key: 'platform.developer_api', description: 'Scoped developer API', enabled: true, securityRelevant: true },
  { key: 'platform.automations', description: 'Structured automation workflows', enabled: true, securityRelevant: true },
  { key: 'platform.service_accounts', description: 'Enterprise service accounts', enabled: false, securityRelevant: true },
  { key: 'platform.sso', description: 'Enterprise SSO enforcement', enabled: false, securityRelevant: true },
  { key: 'platform.mfa', description: 'Multi-factor authentication', enabled: false, securityRelevant: true },
] as const;

export const normalizePlanId = (value: unknown): PlanId => {
  return resolvePlanKey(value) || 'free';
};
