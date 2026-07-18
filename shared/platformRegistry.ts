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
  'ai_chat', 'paraphraser', 'grammar_checker', 'ai_writer', 'document_intelligence', 'ai_detector', 'humanizer', 'originality', 'translation', 'resume_builder', 'career_studio', 'business_studio', 'media_studio', 'premium_templates', 'large_file_processing', 'batch_processing', 'advanced_exports', 'api_access', 'automations', 'organizations', 'team_members', 'audit_logs', 'custom_retention', 'service_accounts', 'priority_processing',
] as const;

export type EntitlementKey = typeof ENTITLEMENT_KEYS[number];

const coreEntitlements: EntitlementKey[] = ['ai_chat', 'paraphraser', 'grammar_checker', 'ai_writer', 'ai_detector', 'translation', 'resume_builder', 'career_studio', 'business_studio', 'media_studio'];
const proEntitlements: EntitlementKey[] = [...coreEntitlements, 'document_intelligence', 'humanizer', 'originality', 'premium_templates', 'large_file_processing', 'advanced_exports'];

export interface PlanDefinition {
  id: PlanId;
  name: string;
  billingType: 'free' | 'fixed' | 'contact';
  monthlyPrice: number | null;
  annualPrice: number | null;
  currency: 'INR';
  audience: string;
  entitlements: EntitlementKey[];
  limits: Record<string, number>;
  active: boolean;
  public: boolean;
  sortOrder: number;
}

export const PLAN_REGISTRY: Record<PlanId, PlanDefinition> = {
  free: { id: 'free', name: 'Free', billingType: 'free', monthlyPrice: 0, annualPrice: 0, currency: 'INR', audience: 'Individuals starting with GXA AI', entitlements: coreEntitlements, limits: { organizations: 0, team_members: 0, api_keys: 0, webhooks: 0, automations: 0, ai_requests_month: 100, storage_mb: 100, history_days: 7 }, active: true, public: true, sortOrder: 1 },
  pro: { id: 'pro', name: 'Pro', billingType: 'fixed', monthlyPrice: 99, annualPrice: 1188, currency: 'INR', audience: 'Individual professionals', entitlements: proEntitlements, limits: { organizations: 0, team_members: 0, api_keys: 0, webhooks: 0, automations: 0, ai_requests_month: 1000, storage_mb: 2048, history_days: 90 }, active: true, public: true, sortOrder: 2 },
  pro_plus: { id: 'pro_plus', name: 'Pro Plus', billingType: 'fixed', monthlyPrice: 149, annualPrice: 1788, currency: 'INR', audience: 'Advanced creators and small teams', entitlements: [...proEntitlements, 'batch_processing', 'api_access', 'automations', 'organizations', 'team_members', 'audit_logs', 'priority_processing'], limits: { organizations: 1, team_members: 5, api_keys: 2, webhooks: 3, automations: 5, automation_runs_month: 100, api_requests_month: 1000, ai_requests_month: 5000, storage_mb: 10240, history_days: 365 }, active: true, public: true, sortOrder: 3 },
  team: { id: 'team', name: 'Team', billingType: 'contact', monthlyPrice: null, annualPrice: null, currency: 'INR', audience: 'Teams requiring shared governance', entitlements: [...ENTITLEMENT_KEYS].filter(item => item !== 'service_accounts' && item !== 'custom_retention'), limits: { organizations: 5, team_members: 50, api_keys: 20, webhooks: 20, automations: 50, automation_runs_month: 5000, api_requests_month: 50000, ai_requests_month: 50000, storage_mb: 102400, history_days: 730 }, active: true, public: true, sortOrder: 4 },
  enterprise: { id: 'enterprise', name: 'Enterprise', billingType: 'contact', monthlyPrice: null, annualPrice: null, currency: 'INR', audience: 'Organizations with advanced governance requirements', entitlements: [...ENTITLEMENT_KEYS], limits: { organizations: 100, team_members: 10000, api_keys: 500, webhooks: 500, automations: 1000, automation_runs_month: 1000000, api_requests_month: 10000000, ai_requests_month: 10000000, storage_mb: 10485760, history_days: 3650 }, active: true, public: true, sortOrder: 5 },
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
  const normalized = String(value || 'free').trim().toLowerCase().replace(/[ -]+/g, '_');
  return normalized in PLAN_REGISTRY ? normalized as PlanId : 'free';
};
