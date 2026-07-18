export type PlanId = 'free' | 'pro' | 'pro_plus' | 'team' | 'enterprise';
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
  'ai_chat', 'paraphraser', 'grammar_checker', 'ai_writer', 'document_intelligence', 'ai_detector', 'humanizer', 'originality', 'translation', 'resume_builder', 'career_studio', 'business_studio', 'media_studio', 'premium_templates', 'batch_processing', 'advanced_exports', 'api_access', 'automations', 'organizations', 'team_members', 'audit_logs', 'custom_retention',
] as const;

export type EntitlementKey = typeof ENTITLEMENT_KEYS[number];

const coreEntitlements: EntitlementKey[] = ['ai_chat', 'paraphraser', 'grammar_checker', 'ai_writer', 'ai_detector', 'translation', 'resume_builder', 'career_studio', 'business_studio', 'media_studio'];
const proEntitlements: EntitlementKey[] = [...coreEntitlements, 'document_intelligence', 'humanizer', 'originality', 'premium_templates', 'advanced_exports'];

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
  recommended: boolean;
  contactSales: boolean;
  rank: number;
  audience: string;
  entitlements: EntitlementKey[];
  limits: Record<string, number>;
}

export const PLAN_REGISTRY: Record<PlanId, PlanDefinition> = {
  free: { id: 'free', key: 'free', name: 'Free', displayName: 'Free', description: 'Core AI tools for getting started.', currency: 'INR', monthlyPriceMinor: 0, annualPriceMinor: null, billingType: 'free', billingIntervals: [], active: true, public: true, recommended: false, contactSales: false, rank: 0, audience: 'Individuals starting with GXA AI', entitlements: coreEntitlements, limits: { organizations: 0, team_members: 0, api_keys: 0, webhooks: 0, automations: 0, ai_requests_month: 100, storage_mb: 100, history_days: 7 } },
  pro: { id: 'pro', key: 'pro', name: 'Pro', displayName: 'Pro', description: 'Expanded document, originality and export capabilities.', currency: 'INR', monthlyPriceMinor: 9900, annualPriceMinor: null, billingType: 'fixed', billingIntervals: ['monthly'], active: true, public: true, recommended: true, contactSales: false, rank: 10, audience: 'Individual professionals', entitlements: proEntitlements, limits: { organizations: 0, team_members: 0, api_keys: 0, webhooks: 0, automations: 0, ai_requests_month: 1000, storage_mb: 2048, history_days: 90 } },
  pro_plus: { id: 'pro_plus', key: 'pro_plus', name: 'Pro Plus', displayName: 'Pro Plus', description: 'Advanced processing, automation and organization capabilities.', currency: 'INR', monthlyPriceMinor: 14900, annualPriceMinor: null, billingType: 'fixed', billingIntervals: ['monthly'], active: true, public: true, recommended: false, contactSales: false, rank: 20, audience: 'Advanced creators and small teams', entitlements: [...proEntitlements, 'batch_processing', 'api_access', 'automations', 'organizations', 'team_members', 'audit_logs'], limits: { organizations: 1, team_members: 5, api_keys: 2, webhooks: 3, automations: 5, automation_runs_month: 100, api_requests_month: 1000, ai_requests_month: 5000, storage_mb: 10240, history_days: 365 } },
  team: { id: 'team', key: 'team', name: 'Team', displayName: 'Team', description: 'Shared governance and higher configured limits for teams.', currency: 'INR', monthlyPriceMinor: null, annualPriceMinor: null, billingType: 'contact', billingIntervals: [], active: true, public: true, recommended: false, contactSales: true, rank: 30, audience: 'Teams requiring shared governance', entitlements: [...ENTITLEMENT_KEYS].filter(item => item !== 'custom_retention'), limits: { organizations: 5, team_members: 50, api_keys: 20, webhooks: 20, automations: 50, automation_runs_month: 5000, api_requests_month: 50000, ai_requests_month: 50000, storage_mb: 102400, history_days: 730 } },
  enterprise: { id: 'enterprise', key: 'enterprise', name: 'Enterprise', displayName: 'Enterprise', description: 'Custom governance and platform configuration for organizations.', currency: 'INR', monthlyPriceMinor: null, annualPriceMinor: null, billingType: 'contact', billingIntervals: [], active: true, public: true, recommended: false, contactSales: true, rank: 40, audience: 'Organizations with advanced governance requirements', entitlements: [...ENTITLEMENT_KEYS], limits: { organizations: 100, team_members: 10000, api_keys: 500, webhooks: 500, automations: 1000, automation_runs_month: 1000000, api_requests_month: 10000000, ai_requests_month: 10000000, storage_mb: 10485760, history_days: 3650 } },
};

export const PLAN_ALIASES: Readonly<Record<string, PlanId>> = {
  free: 'free', pro: 'pro', pro_monthly: 'pro', premium: 'pro',
  pro_plus: 'pro_plus', proplus: 'pro_plus', premium_plus: 'pro_plus',
  team: 'team', enterprise: 'enterprise',
};

export const PLAN_FEATURE_LABELS: Readonly<Record<EntitlementKey, string>> = {
  ai_chat: 'AI Chat', paraphraser: 'Paraphraser', grammar_checker: 'Grammar Checker', ai_writer: 'AI Writer',
  document_intelligence: 'Document intelligence', ai_detector: 'AI Detector', humanizer: 'AI Humanizer', originality: 'Originality tools',
  translation: 'Translation', resume_builder: 'Resume Builder', career_studio: 'Career Studio', business_studio: 'Business Studio', media_studio: 'Media Studio',
  premium_templates: 'Premium templates', batch_processing: 'Batch processing', advanced_exports: 'Advanced exports',
  api_access: 'API access', automations: 'Automations', organizations: 'Organization workspaces', team_members: 'Team member controls', audit_logs: 'Audit logs',
  custom_retention: 'Custom retention',
};

export const FEATURE_PLAN_REQUIREMENTS = {
  'paraphraser.standard': 'free', 'paraphraser.fluency': 'free', 'paraphraser.premium_modes': 'pro_plus',
  'grammar.basic': 'free', 'grammar.advanced': 'pro', 'chat.basic': 'free', 'chat.premium_models': 'pro_plus',
  'writer.basic': 'free', 'writer.premium_templates': 'pro', 'documents.intelligence': 'pro',
  'documents.batch': 'pro_plus', 'originality.detector': 'free', 'originality.advanced': 'pro', 'humanizer.standard': 'pro',
  'translation.basic': 'free', 'exports.advanced': 'pro', 'platform.api': 'pro_plus', 'platform.automations': 'pro_plus',
  'platform.organizations': 'pro_plus', 'media.basic': 'free', 'media.premium': 'pro', 'media.batch': 'pro_plus',
  'business.basic': 'free', 'business.premium': 'pro', 'career.basic': 'free', 'account.saved_content': 'free',
} as const satisfies Record<string, PlanId>;

export type FeatureKey = keyof typeof FEATURE_PLAN_REQUIREMENTS;

export const resolvePlanKey = (value: unknown): PlanId | null => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || /^\d+(?:\.\d+)?$/.test(raw)) return null;
  const normalized = raw.replace(/[ -]+/g, '_');
  return PLAN_ALIASES[normalized] || null;
};

export const minimumPlanForFeature = (featureKey: string): PlanId | null => FEATURE_PLAN_REQUIREMENTS[featureKey as FeatureKey] || null;

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
