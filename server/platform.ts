import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import {
  ADMIN_ROLES, API_SCOPES, AUTOMATION_ACTIONS, AUTOMATION_TRIGGERS,
  DEFAULT_FEATURE_FLAGS, EntitlementKey, ORGANIZATION_ROLES, PLAN_REGISTRY, PLATFORM_PERMISSIONS,
  PlatformPermission, PlanId, TenantType, WEBHOOK_EVENTS, normalizePlanId,
} from '../shared/platformRegistry.js';

export class PlatformError extends Error {
  constructor(message: string, public status = 400, public code = 'PLATFORM_ERROR') { super(message); }
}
export class AuthenticationError extends PlatformError { constructor(message = 'Authentication required.') { super(message, 401, 'AUTHENTICATION_REQUIRED'); } }
export class AuthorizationError extends PlatformError { constructor(message = 'You do not have permission for this action.') { super(message, 403, 'AUTHORIZATION_DENIED'); } }
export class EntitlementError extends PlatformError { constructor(message = 'Your plan does not include this feature.') { super(message, 403, 'ENTITLEMENT_REQUIRED'); } }
export class QuotaError extends PlatformError { constructor(message = 'Configured usage quota reached.') { super(message, 429, 'QUOTA_REACHED'); } }
export class ConflictError extends PlatformError { constructor(message: string) { super(message, 409, 'CONFLICT'); } }

export const nowIso = () => new Date().toISOString();
export const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
export const hashSecret = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = (prefix: string, bytes = 32) => `${prefix}${crypto.randomBytes(bytes).toString('base64url')}`;
const safeText = (value: unknown, max = 200) => String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
const idFor = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  if (password.length < 10 || password.length > 256) throw new PlatformError('Password must contain between 10 and 256 characters.', 400, 'PASSWORD_POLICY');
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith('scrypt$')) { const actual = Buffer.from(password); const expected = Buffer.from(stored); return expected.length > 0 && actual.length === expected.length && crypto.timingSafeEqual(actual, expected); }
  const [, salt, digest] = stored.split('$');
  if (!salt || !digest) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const emptyStores: Record<string, any> = {
  workspaces: {}, organizations: {}, organizationMemberships: {}, teams: {}, teamMemberships: {}, invitations: {},
  sessions: {}, subscriptions: {}, usageEvents: [], quotaReservations: {}, auditEvents: [], securityEvents: [],
  apiKeys: {}, webhookEndpoints: {}, webhookDeliveries: {}, automations: {}, automationExecutions: {},
  featureFlags: {}, dataExports: {}, deletionRequests: {}, idempotencyRecords: {}, providerHealth: {}, jobs: {}, deadLetterJobs: {},
};

export function personalWorkspaceId(userId: string) { return `personal_${hashSecret(userId).slice(0, 20)}`; }

export function ensurePersonalWorkspace(db: any, userId: string) {
  db.workspaces ||= {};
  const id = personalWorkspaceId(userId);
  if (!db.workspaces[id]) db.workspaces[id] = { id, tenantType: 'personal', tenantId: userId, ownerId: userId, name: 'Personal Workspace', status: 'active', createdAt: nowIso(), updatedAt: nowIso() };
  return db.workspaces[id];
}

export function applyPlatformMigration(input: any, options: { dryRun?: boolean } = {}) {
  const db = options.dryRun ? structuredClone(input || {}) : input;
  const changes: string[] = [];
  for (const [key, initial] of Object.entries(emptyStores)) {
    if (db[key] === undefined) { db[key] = structuredClone(initial); changes.push(`add:${key}`); }
  }
  db.users ||= {};
  for (const user of Object.values<any>(db.users)) {
    if (!user?.id) continue;
    ensurePersonalWorkspace(db, user.id);
    if (typeof user.password === 'string' && !user.password.startsWith('scrypt$')) {
      user.password = hashPassword(user.password);
      changes.push(`hash-password:${user.id}`);
    }
    user.status ||= 'active';
    user.createdAt ||= nowIso();
    user.updatedAt ||= user.createdAt;
  }
  for (const flag of DEFAULT_FEATURE_FLAGS) if (!db.featureFlags[flag.key]) db.featureFlags[flag.key] = { ...flag, target: 'global', createdAt: nowIso(), updatedAt: nowIso() };
  const previousVersion = Number(db.schemaVersion || 0);
  if (previousVersion < 12) { db.schemaVersion = 12; changes.push(`schema:${previousVersion}->12`); }
  return { db, changed: changes.length > 0, changes, fromVersion: previousVersion, toVersion: 12 };
}

export function createSession(db: any, userId: string, meta: { userAgent?: string; ipHash?: string } = {}) {
  const token = randomToken('gxa_sess_');
  const record = { id: idFor('sess'), tokenHash: hashSecret(token), userId, activeWorkspaceId: ensurePersonalWorkspace(db, userId).id, userAgentSummary: safeText(meta.userAgent, 120), ipHash: safeText(meta.ipHash, 80), createdAt: nowIso(), lastActiveAt: nowIso(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), revokedAt: null };
  db.sessions[record.id] = record;
  audit(db, { tenantId: userId, actorId: userId, action: 'session.created', resourceType: 'session', resourceId: record.id });
  return { token, record };
}

export function bearerToken(headers: Record<string, any>) {
  const header = String(headers.authorization || headers.Authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function resolveSession(db: any, token: string) {
  if (!token) return null;
  const tokenHash = hashSecret(token);
  const session = Object.values<any>(db.sessions || {}).find(item => item.tokenHash === tokenHash);
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return null;
  const user = db.users?.[session.userId];
  if (!user || user.status === 'suspended' || user.status === 'deleted') return null;
  return { session, user };
}

export function publicUser(user: any, token?: string) {
  return { id: user.id, name: user.name, email: user.email, subscription: normalizePlanId(user.subscription), role: user.role || 'User', adminRole: user.adminRole || null, status: user.status || 'active', ...(token ? { sessionToken: token } : {}) };
}

export function rolePermissions(roleId: string): PlatformPermission[] {
  return ORGANIZATION_ROLES[roleId as keyof typeof ORGANIZATION_ROLES]?.permissions || [];
}

export function resolvedPlan(db: any, tenantType: TenantType, tenantId: string, user: any): PlanId {
  const subscription = Object.values<any>(db.subscriptions || {}).find(item => item.tenantType === tenantType && item.tenantId === tenantId && ['active', 'trialing'].includes(item.status));
  return normalizePlanId(subscription?.planId || (tenantType === 'personal' ? user.subscription : db.organizations?.[tenantId]?.planId));
}
const resolvedFeatureFlags = (db: any) => Object.fromEntries(Object.values<any>(db.featureFlags || {}).map(flag => [flag.key, Boolean(flag.enabled)]));
const entitlementsWithFlags = (planId: PlanId, flags: Record<string, boolean>) => PLAN_REGISTRY[planId].entitlements.filter(entitlement => {
  if (['organizations', 'team_members'].includes(entitlement) && flags['platform.organizations'] === false) return false;
  if (entitlement === 'api_access' && flags['platform.developer_api'] === false) return false;
  if (entitlement === 'automations' && flags['platform.automations'] === false) return false;
  return true;
});

export interface TenantContext {
  user: any; session: any; workspace: any; tenantType: TenantType; tenantId: string; organization: any | null;
  membership: any | null; role: string; permissions: PlatformPermission[]; planId: PlanId;
  entitlements: EntitlementKey[]; limits: Record<string, number>; featureFlags: Record<string, boolean>;
}

export function resolveTenantContext(db: any, token: string): TenantContext {
  const auth = resolveSession(db, token);
  if (!auth) throw new AuthenticationError();
  const personal = ensurePersonalWorkspace(db, auth.user.id);
  let workspace = db.workspaces?.[auth.session.activeWorkspaceId] || personal;
  let organization = null;
  let membership = null;
  let role = 'owner';
  let permissions: PlatformPermission[] = [...PLATFORM_PERMISSIONS];
  if (workspace.tenantType === 'organization') {
    organization = db.organizations?.[workspace.tenantId];
    membership = Object.values<any>(db.organizationMemberships || {}).find(item => item.organizationId === workspace.tenantId && item.userId === auth.user.id && item.status === 'active');
    if (!organization || organization.status !== 'active' || !membership) { workspace = personal; auth.session.activeWorkspaceId = personal.id; }
    else { role = membership.roleId; permissions = rolePermissions(role); }
  }
  const tenantType: TenantType = workspace.tenantType;
  const tenantId = workspace.tenantId;
  const planId = resolvedPlan(db, tenantType, tenantId, auth.user);
  const plan = PLAN_REGISTRY[planId];
  const featureFlags = resolvedFeatureFlags(db);
  auth.session.lastActiveAt = nowIso();
  return { user: auth.user, session: auth.session, workspace, tenantType, tenantId, organization: tenantType === 'organization' ? organization : null, membership: tenantType === 'organization' ? membership : null, role, permissions, planId, entitlements: entitlementsWithFlags(planId, featureFlags), limits: plan.limits, featureFlags };
}

export const tenantStoreKey = (context: TenantContext) => context.tenantType === 'personal' ? context.user.id : `org:${context.tenantId}`;
export function requirePermission(context: TenantContext, permission: PlatformPermission) { if (context.tenantType === 'organization' && !context.permissions.includes(permission)) throw new AuthorizationError(); }
export function requireEntitlement(context: TenantContext, entitlement: EntitlementKey) { if (!context.entitlements.includes(entitlement)) throw new EntitlementError(); }

export function adminScopes(user: any): string[] {
  if (user.role === 'SuperAdmin') return ['*'];
  return ADMIN_ROLES[user.adminRole as keyof typeof ADMIN_ROLES]?.scopes || [];
}
export function requireAdminScope(user: any, scope: string) { const scopes = adminScopes(user); if (!scopes.includes('*') && !scopes.includes(scope)) throw new AuthorizationError('Administrative permission required.'); }

export function audit(db: any, event: { tenantId: string; actorId: string; actorType?: string; action: string; resourceType: string; resourceId: string; metadata?: Record<string, any>; ipHash?: string; userAgentSummary?: string }) {
  const record = { id: idFor('audit'), tenantId: event.tenantId, actorId: event.actorId, actorType: event.actorType || 'user', action: safeText(event.action, 100), resourceType: safeText(event.resourceType, 80), resourceId: safeText(event.resourceId, 160), metadata: event.metadata || {}, ipHash: safeText(event.ipHash, 80), userAgentSummary: safeText(event.userAgentSummary, 120), createdAt: nowIso() };
  db.auditEvents ||= []; db.auditEvents.push(record); return record;
}
export function securityEvent(db: any, event: { actorId?: string; type: string; outcome: string; metadata?: Record<string, any> }) { const record = { id: idFor('security'), actorId: event.actorId || null, type: safeText(event.type, 100), outcome: safeText(event.outcome, 40), metadata: event.metadata || {}, createdAt: nowIso() }; db.securityEvents ||= []; db.securityEvents.push(record); return record; }

export function setActiveWorkspace(db: any, context: TenantContext, workspaceId: string) {
  const workspace = db.workspaces?.[workspaceId];
  if (!workspace) throw new PlatformError('Workspace not found.', 404, 'WORKSPACE_NOT_FOUND');
  if (workspace.tenantType === 'personal' && workspace.ownerId !== context.user.id) throw new AuthorizationError();
  if (workspace.tenantType === 'organization' && !Object.values<any>(db.organizationMemberships || {}).some(item => item.organizationId === workspace.tenantId && item.userId === context.user.id && item.status === 'active')) throw new AuthorizationError();
  context.session.activeWorkspaceId = workspace.id;
  audit(db, { tenantId: workspace.tenantId, actorId: context.user.id, action: 'workspace.activated', resourceType: 'workspace', resourceId: workspace.id });
  return workspace;
}

export function listAccessibleWorkspaces(db: any, userId: string) {
  const personal = ensurePersonalWorkspace(db, userId);
  const memberships = Object.values<any>(db.organizationMemberships || {}).filter(item => item.userId === userId && item.status === 'active');
  return [personal, ...memberships.map(membership => Object.values<any>(db.workspaces).find(workspace => workspace.tenantType === 'organization' && workspace.tenantId === membership.organizationId)).filter(Boolean)].map((workspace: any) => ({ ...workspace, role: workspace.tenantType === 'personal' ? 'owner' : memberships.find(item => item.organizationId === workspace.tenantId)?.roleId }));
}

export function createOrganization(db: any, context: TenantContext, raw: any) {
  requireEntitlement(context, 'organizations');
  const owned = Object.values<any>(db.organizations || {}).filter(item => item.ownerId === context.user.id && item.status === 'active').length;
  if (owned >= Number(context.limits.organizations || 0)) throw new QuotaError('Organization limit reached for this plan.');
  const name = safeText(raw.name, 100); if (name.length < 2) throw new PlatformError('Organization name is required.', 400, 'INVALID_ORGANIZATION');
  const base = safeText(raw.slug || name, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!base) throw new PlatformError('A valid organization slug is required.', 400, 'INVALID_SLUG');
  let slug = base; let suffix = 2; while (Object.values<any>(db.organizations).some(item => item.slug === slug)) slug = `${base}-${suffix++}`;
  const id = idFor('org'); const workspaceId = idFor('ws');
  const organization = { id, name, slug, logo: '', industry: safeText(raw.industry, 80), website: safeText(raw.website, 200), country: safeText(raw.country, 80), timezone: safeText(raw.timezone || 'UTC', 80), defaultLanguage: safeText(raw.defaultLanguage || 'English', 40), billingEmail: normalizeEmail(raw.billingEmail || context.user.email), ownerId: context.user.id, planId: context.planId, status: 'active', policies: { externalSharing: false, publicLinks: false, apiKeys: true, automations: true, retentionDays: 365 }, createdAt: nowIso(), updatedAt: nowIso() };
  db.organizations[id] = organization;
  db.workspaces[workspaceId] = { id: workspaceId, tenantType: 'organization', tenantId: id, ownerId: context.user.id, name, status: 'active', createdAt: nowIso(), updatedAt: nowIso() };
  const membership = { id: idFor('membership'), organizationId: id, userId: context.user.id, roleId: 'owner', status: 'active', invitedBy: null, joinedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso() };
  db.organizationMemberships[membership.id] = membership;
  audit(db, { tenantId: id, actorId: context.user.id, action: 'organization.created', resourceType: 'organization', resourceId: id });
  return { organization, workspace: db.workspaces[workspaceId], membership };
}

export function createTeam(db: any, context: TenantContext, raw: any) {
  if (context.tenantType !== 'organization') throw new PlatformError('Switch to an organization workspace to create a team.', 400, 'ORGANIZATION_REQUIRED');
  requirePermission(context, 'teams.manage');
  const name = safeText(raw.name, 100); if (!name) throw new PlatformError('Team name is required.', 400, 'INVALID_TEAM');
  const team = { id: idFor('team'), organizationId: context.tenantId, name, description: safeText(raw.description, 500), leadUserId: null, createdBy: context.user.id, status: 'active', createdAt: nowIso(), updatedAt: nowIso() };
  db.teams[team.id] = team; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'team.created', resourceType: 'team', resourceId: team.id }); return team;
}

export function inviteMember(db: any, context: TenantContext, raw: any) {
  if (context.tenantType !== 'organization') throw new PlatformError('Organization workspace required.', 400, 'ORGANIZATION_REQUIRED');
  requirePermission(context, 'members.invite');
  const email = normalizeEmail(raw.email); const roleId = String(raw.roleId || 'member');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new PlatformError('A valid email is required.', 400, 'INVALID_EMAIL');
  if (!ORGANIZATION_ROLES[roleId as keyof typeof ORGANIZATION_ROLES] || roleId === 'owner') throw new AuthorizationError('This role cannot be assigned by invitation.');
  const occupiedSeats = Object.values<any>(db.organizationMemberships).filter(item => item.organizationId === context.tenantId && item.status === 'active').length + Object.values<any>(db.invitations).filter(item => item.organizationId === context.tenantId && item.status === 'pending' && Date.parse(item.expiresAt) > Date.now()).length;
  if (occupiedSeats >= Number(context.limits.team_members || 0)) throw new QuotaError('Organization seat limit reached for this plan.');
  if (Object.values<any>(db.organizationMemberships).some(item => item.organizationId === context.tenantId && normalizeEmail(db.users?.[item.userId]?.email) === email && item.status === 'active')) throw new ConflictError('This user is already an organization member.');
  const existing = Object.values<any>(db.invitations).find(item => item.organizationId === context.tenantId && item.email === email && item.status === 'pending');
  if (existing) existing.status = 'revoked';
  const token = randomToken('gxa_inv_');
  const invitation = { id: idFor('invite'), organizationId: context.tenantId, email, roleId, invitedBy: context.user.id, tokenHash: hashSecret(token), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'pending', acceptedAt: null, createdAt: nowIso(), updatedAt: nowIso() };
  db.invitations[invitation.id] = invitation; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'member.invited', resourceType: 'invitation', resourceId: invitation.id, metadata: { roleId } }); return { invitation: { ...invitation, tokenHash: undefined }, token };
}

export function resendInvitation(db: any, context: TenantContext, invitationId: string) {
  requirePermission(context, 'members.invite');
  const invitation = db.invitations?.[invitationId];
  if (!invitation || invitation.organizationId !== context.tenantId || invitation.status !== 'pending') throw new PlatformError('Pending invitation not found.', 404, 'INVITATION_NOT_FOUND');
  const token = randomToken('gxa_inv_'); invitation.tokenHash = hashSecret(token); invitation.expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); invitation.updatedAt = nowIso();
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'invitation.resent', resourceType: 'invitation', resourceId: invitation.id });
  return { invitation: { ...invitation, tokenHash: undefined }, token };
}

export function acceptInvitation(db: any, context: TenantContext, token: string) {
  const invitation = Object.values<any>(db.invitations).find(item => item.tokenHash === hashSecret(token));
  if (!invitation || invitation.status !== 'pending') throw new PlatformError('Invitation is invalid or already used.', 400, 'INVALID_INVITATION');
  if (Date.parse(invitation.expiresAt) <= Date.now()) { invitation.status = 'expired'; throw new PlatformError('Invitation has expired.', 410, 'INVITATION_EXPIRED'); }
  if (normalizeEmail(context.user.email) !== invitation.email) throw new AuthorizationError('Sign in with the invited email address.');
  let membership = Object.values<any>(db.organizationMemberships).find(item => item.organizationId === invitation.organizationId && item.userId === context.user.id);
  if (!membership) { membership = { id: idFor('membership'), organizationId: invitation.organizationId, userId: context.user.id, roleId: invitation.roleId, status: 'active', invitedBy: invitation.invitedBy, joinedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso() }; db.organizationMemberships[membership.id] = membership; }
  else { membership.status = 'active'; membership.roleId = invitation.roleId; membership.joinedAt = nowIso(); membership.updatedAt = nowIso(); }
  invitation.status = 'accepted'; invitation.acceptedAt = nowIso(); invitation.updatedAt = nowIso(); invitation.tokenHash = hashSecret(randomToken('consumed_'));
  audit(db, { tenantId: invitation.organizationId, actorId: context.user.id, action: 'invitation.accepted', resourceType: 'membership', resourceId: membership.id }); return membership;
}

export function updateMembership(db: any, context: TenantContext, membershipId: string, raw: any) {
  requirePermission(context, raw.status === 'removed' ? 'members.remove' : 'members.update');
  const membership = db.organizationMemberships?.[membershipId];
  if (!membership || membership.organizationId !== context.tenantId) throw new PlatformError('Membership not found.', 404, 'MEMBERSHIP_NOT_FOUND');
  const nextRole = raw.roleId ? String(raw.roleId) : membership.roleId; const nextStatus = raw.status ? String(raw.status) : membership.status;
  if (!ORGANIZATION_ROLES[nextRole as keyof typeof ORGANIZATION_ROLES]) throw new PlatformError('Unknown role.', 400, 'INVALID_ROLE');
  const activeOwners = Object.values<any>(db.organizationMemberships).filter(item => item.organizationId === context.tenantId && item.status === 'active' && item.roleId === 'owner');
  if (membership.roleId === 'owner' && (nextRole !== 'owner' || nextStatus !== 'active') && activeOwners.length <= 1) throw new ConflictError('The last organization owner cannot be removed or demoted.');
  if (nextRole === 'owner' && context.role !== 'owner') throw new AuthorizationError('Only an owner may grant ownership.');
  membership.roleId = nextRole; membership.status = ['active', 'suspended', 'removed'].includes(nextStatus) ? nextStatus : membership.status; membership.updatedAt = nowIso();
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'membership.updated', resourceType: 'membership', resourceId: membership.id, metadata: { roleId: membership.roleId, status: membership.status } }); return membership;
}

export function addTeamMember(db: any, context: TenantContext, teamId: string, membershipId: string) {
  requirePermission(context, 'teams.manage');
  const team = db.teams?.[teamId]; const membership = db.organizationMemberships?.[membershipId];
  if (!team || team.organizationId !== context.tenantId) throw new PlatformError('Team not found.', 404, 'TEAM_NOT_FOUND');
  if (!membership || membership.organizationId !== context.tenantId || membership.status !== 'active') throw new PlatformError('Active organization membership required.', 400, 'MEMBERSHIP_REQUIRED');
  const existing = Object.values<any>(db.teamMemberships).find(item => item.teamId === teamId && item.membershipId === membershipId);
  if (existing) { existing.status = 'active'; existing.updatedAt = nowIso(); return existing; }
  const record = { id: idFor('team_membership'), organizationId: context.tenantId, teamId, membershipId, addedBy: context.user.id, status: 'active', createdAt: nowIso(), updatedAt: nowIso() };
  db.teamMemberships[record.id] = record; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'team.member_added', resourceType: 'team', resourceId: teamId, metadata: { membershipId } }); return record;
}

export function removeTeamMember(db: any, context: TenantContext, teamId: string, teamMembershipId: string) {
  requirePermission(context, 'teams.manage'); const team = db.teams?.[teamId]; const record = db.teamMemberships?.[teamMembershipId];
  if (!team || team.organizationId !== context.tenantId || !record || record.teamId !== teamId || record.organizationId !== context.tenantId) throw new PlatformError('Team membership not found.', 404, 'TEAM_MEMBERSHIP_NOT_FOUND');
  record.status = 'removed'; record.updatedAt = nowIso(); audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'team.member_removed', resourceType: 'team', resourceId: teamId, metadata: { membershipId: record.membershipId } }); return record;
}

export function createApiKey(db: any, context: TenantContext, raw: any) {
  requireEntitlement(context, 'api_access'); requirePermission(context, 'api_keys.manage');
  if (context.organization?.policies?.apiKeys === false) throw new AuthorizationError('API keys are disabled by organization policy.');
  const active = Object.values<any>(db.apiKeys).filter(item => item.tenantId === context.tenantId && item.status === 'active').length;
  if (active >= Number(context.limits.api_keys || 0)) throw new QuotaError('API key limit reached.');
  const requested = Array.isArray(raw.scopes) ? raw.scopes.filter((scope: string) => (API_SCOPES as readonly string[]).includes(scope)) : [];
  if (!requested.length) throw new PlatformError('Select at least one API scope.', 400, 'API_SCOPE_REQUIRED');
  const secret = randomToken('gxa_live_'); const key = { id: idFor('key'), tenantType: context.tenantType, tenantId: context.tenantId, createdBy: context.user.id, name: safeText(raw.name || 'API key', 80), prefix: secret.slice(0, 16), secretHash: hashSecret(secret), scopes: requested, rateLimit: Math.min(600, Math.max(10, Number(raw.rateLimit || 60))), createdAt: nowIso(), lastUsedAt: null, expiresAt: raw.expiresAt || null, status: 'active' };
  db.apiKeys[key.id] = key; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'api_key.created', resourceType: 'api_key', resourceId: key.id, metadata: { scopes: requested } }); return { key: { ...key, secretHash: undefined }, secret };
}

export function rotateApiKey(db: any, context: TenantContext, keyId: string) {
  requirePermission(context, 'api_keys.manage'); const key = db.apiKeys?.[keyId];
  if (!key || key.tenantId !== context.tenantId || key.status !== 'active') throw new PlatformError('Active API key not found.', 404, 'API_KEY_NOT_FOUND');
  const secret = randomToken('gxa_live_'); key.prefix = secret.slice(0, 16); key.secretHash = hashSecret(secret); key.rotatedAt = nowIso(); key.lastUsedAt = null;
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'api_key.rotated', resourceType: 'api_key', resourceId: key.id }); return { key: { ...key, secretHash: undefined }, secret };
}

export function authenticateApiKey(db: any, secret: string, scope: string) {
  const hash = hashSecret(secret); const key = Object.values<any>(db.apiKeys || {}).find(item => item.secretHash === hash && item.status === 'active');
  if (!key || (key.expiresAt && Date.parse(key.expiresAt) <= Date.now())) throw new AuthenticationError('Invalid or expired API key.');
  if (!key.scopes.includes(scope)) throw new AuthorizationError('API key scope does not permit this operation.');
  const now = Date.now(); if (!key.rateLimitResetAt || Date.parse(key.rateLimitResetAt) <= now) { key.rateLimitCount = 0; key.rateLimitResetAt = new Date(now + 60_000).toISOString(); }
  if (Number(key.rateLimitCount || 0) >= Number(key.rateLimit || 60)) throw new PlatformError('API key rate limit reached.', 429, 'API_KEY_RATE_LIMITED');
  key.rateLimitCount = Number(key.rateLimitCount || 0) + 1; key.rateLimitRemaining = Math.max(0, Number(key.rateLimit || 60) - key.rateLimitCount); key.lastUsedAt = nowIso(); return key;
}

export function resolveTrustedTenantContext(db: any, userId: string, tenantType: TenantType, tenantId: string): TenantContext {
  const user = db.users?.[userId]; if (!user || user.status !== 'active') throw new AuthenticationError('Tenant actor is unavailable.');
  let workspace: any; let organization: any = null; let membership: any = null; let role = 'owner'; let permissions: PlatformPermission[] = [...PLATFORM_PERMISSIONS];
  if (tenantType === 'organization') {
    organization = db.organizations?.[tenantId]; membership = Object.values<any>(db.organizationMemberships || {}).find(item => item.organizationId === tenantId && item.userId === user.id && item.status === 'active');
    if (!organization || organization.status !== 'active' || !membership) throw new AuthorizationError('API key tenant membership is unavailable.');
    workspace = Object.values<any>(db.workspaces).find(item => item.tenantType === 'organization' && item.tenantId === tenantId); role = membership.roleId; permissions = rolePermissions(role);
  } else { workspace = ensurePersonalWorkspace(db, user.id); }
  const planId = resolvedPlan(db, tenantType, tenantId, user); const plan = PLAN_REGISTRY[planId]; const featureFlags = resolvedFeatureFlags(db);
  return { user, session: null, workspace, tenantType, tenantId, organization, membership, role, permissions, planId, entitlements: entitlementsWithFlags(planId, featureFlags), limits: plan.limits, featureFlags };
}

export function resolveApiKeyContext(db: any, key: any): TenantContext { const context = resolveTrustedTenantContext(db, key.createdBy, key.tenantType, key.tenantId); requireEntitlement(context, 'api_access'); return context; }

function privateIp(address: string) {
  if (address === '::1' || address === '0.0.0.0' || address === '::') return true;
  if (net.isIPv4(address)) { const [a, b] = address.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); }
  const normalized = address.toLowerCase(); return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

export async function validateWebhookUrl(value: unknown, options: { allowDns?: boolean } = { allowDns: true }) {
  let url: URL; try { url = new URL(String(value || '')); } catch { throw new PlatformError('Enter a valid webhook URL.', 400, 'INVALID_WEBHOOK_URL'); }
  if (url.protocol !== 'https:') throw new PlatformError('Webhooks require HTTPS.', 400, 'WEBHOOK_HTTPS_REQUIRED');
  if (url.username || url.password || ['localhost', 'localhost.localdomain'].includes(url.hostname.toLowerCase())) throw new PlatformError('Webhook destination is not permitted.', 400, 'WEBHOOK_SSRF_BLOCKED');
  if (net.isIP(url.hostname) && privateIp(url.hostname)) throw new PlatformError('Private-network webhook destinations are blocked.', 400, 'WEBHOOK_SSRF_BLOCKED');
  if (options.allowDns !== false && !net.isIP(url.hostname)) { const records = await dns.lookup(url.hostname, { all: true }); if (!records.length || records.some(item => privateIp(item.address))) throw new PlatformError('Webhook destination resolves to a private network.', 400, 'WEBHOOK_SSRF_BLOCKED'); }
  return url.toString();
}

export async function createWebhook(db: any, context: TenantContext, raw: any, options?: { allowDns?: boolean }) {
  requirePermission(context, 'webhooks.manage'); requireEntitlement(context, 'api_access');
  if (context.organization?.policies?.apiKeys === false) throw new AuthorizationError('Developer integrations are disabled by organization policy.');
  const active = Object.values<any>(db.webhookEndpoints).filter(item => item.tenantId === context.tenantId && item.status === 'active').length;
  if (active >= Number(context.limits.webhooks || 0)) throw new QuotaError('Webhook endpoint limit reached.');
  const url = await validateWebhookUrl(raw.url, options); const events = Array.isArray(raw.events) ? raw.events.filter((event: string) => (WEBHOOK_EVENTS as readonly string[]).includes(event)) : [];
  if (!events.length) throw new PlatformError('Select at least one webhook event.', 400, 'WEBHOOK_EVENT_REQUIRED');
  const secret = randomToken('whsec_'); const endpoint = { id: idFor('webhook'), tenantId: context.tenantId, tenantType: context.tenantType, createdBy: context.user.id, name: safeText(raw.name || 'Webhook', 80), url, events, secretHash: hashSecret(secret), encryptedSecret: sealSecret(secret), status: 'active', failureCount: 0, createdAt: nowIso(), updatedAt: nowIso(), lastDeliveryAt: null };
  db.webhookEndpoints[endpoint.id] = endpoint; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'webhook.created', resourceType: 'webhook', resourceId: endpoint.id, metadata: { events } }); return { endpoint: publicWebhook(endpoint), secret };
}

export function rotateWebhookSecret(db: any, context: TenantContext, endpointId: string) {
  requirePermission(context, 'webhooks.manage'); const endpoint = db.webhookEndpoints?.[endpointId];
  if (!endpoint || endpoint.tenantId !== context.tenantId || endpoint.status !== 'active') throw new PlatformError('Active webhook not found.', 404, 'WEBHOOK_NOT_FOUND');
  const secret = randomToken('whsec_'); endpoint.secretHash = hashSecret(secret); endpoint.encryptedSecret = sealSecret(secret); endpoint.updatedAt = nowIso();
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'webhook.secret_rotated', resourceType: 'webhook', resourceId: endpoint.id }); return { endpoint: publicWebhook(endpoint), secret };
}

function encryptionKey() {
  const configured = process.env.PLATFORM_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!configured && process.env.NODE_ENV === 'production') throw new PlatformError('PLATFORM_ENCRYPTION_KEY is required in production.', 503, 'ENCRYPTION_KEY_NOT_CONFIGURED');
  return crypto.createHash('sha256').update(configured || 'development-only-key-change-in-production').digest();
}
function sealSecret(value: string) { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv); const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`; }
function openSecret(value: string) { const [iv, tag, encrypted] = value.split('.').map(item => Buffer.from(item, 'base64url')); const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'); }
export const publicWebhook = (endpoint: any) => ({ id: endpoint.id, tenantId: endpoint.tenantId, name: endpoint.name, url: endpoint.url, events: endpoint.events, status: endpoint.status, failureCount: endpoint.failureCount, createdAt: endpoint.createdAt, lastDeliveryAt: endpoint.lastDeliveryAt });

export async function deliverWebhook(db: any, endpoint: any, event: string, data: Record<string, any>, fetcher: typeof fetch = fetch) {
  if (!(WEBHOOK_EVENTS as readonly string[]).includes(event) || !endpoint.events.includes(event)) throw new PlatformError('Webhook is not subscribed to this event.', 400, 'WEBHOOK_EVENT_NOT_SUBSCRIBED');
  await validateWebhookUrl(endpoint.url); const deliveryId = idFor('delivery'); const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = JSON.stringify({ id: deliveryId, event, createdAt: nowIso(), data }); const secret = openSecret(endpoint.encryptedSecret); const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex'); const started = Date.now();
  let state = 'failed'; let responseStatus: number | null = null; let errorCode: string | null = null;
  try { const response = await fetcher(endpoint.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'GXA-Webhook/1.0', 'X-GXA-Event': event, 'X-GXA-Timestamp': timestamp, 'X-GXA-Signature': `v1=${signature}`, 'X-GXA-Delivery': deliveryId }, body: payload, signal: AbortSignal.timeout(10000) }); responseStatus = response.status; state = response.ok ? 'delivered' : 'failed'; if (!response.ok) errorCode = `HTTP_${response.status}`; }
  catch (error: any) { errorCode = error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR'; }
  const delivery = { id: deliveryId, endpointId: endpoint.id, tenantId: endpoint.tenantId, event, status: state, attemptCount: 1, responseStatus, durationMs: Date.now() - started, nextRetryAt: state === 'failed' ? new Date(Date.now() + 60000).toISOString() : null, errorCode, createdAt: nowIso() };
  db.webhookDeliveries[delivery.id] = delivery; endpoint.lastDeliveryAt = nowIso(); endpoint.failureCount = state === 'failed' ? Number(endpoint.failureCount || 0) + 1 : 0; return delivery;
}

export function validateAutomation(raw: any) {
  const name = safeText(raw.name, 100); if (!name) throw new PlatformError('Workflow name is required.', 400, 'INVALID_WORKFLOW');
  const trigger = safeText(raw.trigger, 50); if (!(AUTOMATION_TRIGGERS as readonly any[]).some(item => item.id === trigger && item.available)) throw new PlatformError('Unsupported workflow trigger.', 400, 'INVALID_TRIGGER');
  const steps = Array.isArray(raw.steps) ? raw.steps.slice(0, 20).map((step: any, index: number) => { const action = safeText(step.action, 50); if (!(AUTOMATION_ACTIONS as readonly any[]).some(item => item.id === action && item.available)) throw new PlatformError(`Unsupported action at step ${index + 1}.`, 400, 'INVALID_ACTION'); return { id: safeText(step.id || `step-${index + 1}`, 80), action, config: typeof step.config === 'object' && step.config ? step.config : {}, errorPolicy: ['stop', 'retry', 'skip', 'continue'].includes(step.errorPolicy) ? step.errorPolicy : 'stop' }; }) : [];
  if (!steps.length) throw new PlatformError('Add at least one workflow action.', 400, 'WORKFLOW_STEP_REQUIRED');
  const conditions = Array.isArray(raw.conditions) ? raw.conditions.slice(0, 10).map((condition: any) => ({ field: safeText(condition.field, 80), operator: ['equals', 'contains', 'greater_than'].includes(condition.operator) ? condition.operator : 'equals', value: safeText(condition.value, 200) })) : [];
  return { name, description: safeText(raw.description, 500), trigger, conditions, steps };
}

export function createAutomation(db: any, context: TenantContext, raw: any) {
  requirePermission(context, 'automations.manage'); requireEntitlement(context, 'automations');
  if (context.organization?.policies?.automations === false) throw new AuthorizationError('Automations are disabled by organization policy.');
  const active = Object.values<any>(db.automations).filter(item => item.tenantId === context.tenantId && item.status !== 'archived').length;
  if (active >= Number(context.limits.automations || 0)) throw new QuotaError('Automation limit reached.');
  const validated = validateAutomation(raw); const workflow = { id: idFor('automation'), tenantId: context.tenantId, tenantType: context.tenantType, createdBy: context.user.id, ...validated, status: 'paused', version: 1, createdAt: nowIso(), updatedAt: nowIso() };
  db.automations[workflow.id] = workflow; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'automation.created', resourceType: 'automation', resourceId: workflow.id }); return workflow;
}

function conditionMatches(condition: any, payload: any) { const value = condition.field.split('.').reduce((current: any, key: string) => current?.[key], payload); if (condition.operator === 'contains') return String(value || '').includes(condition.value); if (condition.operator === 'greater_than') return Number(value) > Number(condition.value); return String(value) === String(condition.value); }
export async function executeAutomation(db: any, context: TenantContext, workflow: any, payload: any, fetcher: typeof fetch = fetch) {
  requirePermission(context, 'automations.manage'); requireEntitlement(context, 'automations');
  if (!workflow || workflow.tenantId !== context.tenantId) throw new PlatformError('Automation not found.', 404, 'AUTOMATION_NOT_FOUND');
  const execution = { id: idFor('execution'), workflowId: workflow.id, tenantId: context.tenantId, triggeredBy: context.user.id, status: 'running', steps: [] as any[], startedAt: nowIso(), completedAt: null as string | null };
  db.automationExecutions[execution.id] = execution;
  if (!workflow.conditions.every((condition: any) => conditionMatches(condition, payload))) { execution.status = 'skipped'; execution.completedAt = nowIso(); return execution; }
  for (const step of workflow.steps) {
    const result: any = { id: step.id, action: step.action, status: 'running', startedAt: nowIso(), completedAt: null, errorCode: null }; execution.steps.push(result);
    try {
      if (step.action === 'create_project') { const key = tenantStoreKey(context); db.projects[key] ||= []; db.projects[key].unshift({ id: idFor('project'), ownerId: context.user.id, tenantType: context.tenantType, tenantId: context.tenantId, name: safeText(step.config.name || 'Automation project', 100), type: 'Document', toolUsed: 'Automation', status: 'Draft', previewText: '', createdAt: nowIso(), updatedAt: nowIso() }); }
      else if (step.action === 'record_audit_event') audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: safeText(step.config.action || 'automation.event', 100), resourceType: 'automation', resourceId: workflow.id });
      else if (step.action === 'send_webhook') { const endpoint = db.webhookEndpoints?.[step.config.webhookId]; if (!endpoint || endpoint.tenantId !== context.tenantId) throw new AuthorizationError('Approved webhook is unavailable.'); await deliverWebhook(db, endpoint, step.config.event || 'automation.completed', { workflowId: workflow.id, executionId: execution.id }, fetcher); }
      result.status = 'completed'; result.completedAt = nowIso();
    } catch (error: any) { result.status = 'failed'; result.errorCode = error?.code || 'STEP_FAILED'; result.completedAt = nowIso(); if (step.errorPolicy === 'stop') { execution.status = 'failed'; break; } }
  }
  if (execution.status === 'running') execution.status = execution.steps.some((step: any) => step.status === 'failed') ? 'completed_with_warnings' : 'completed'; execution.completedAt = nowIso();
  audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'automation.executed', resourceType: 'automation', resourceId: workflow.id, metadata: { executionId: execution.id, status: execution.status } }); return execution;
}

export function reserveUsage(db: any, context: TenantContext, dimension: string, quantity: number, idempotencyKey: string) {
  const key = safeText(idempotencyKey, 120); if (!key) throw new PlatformError('Idempotency key is required.', 400, 'IDEMPOTENCY_REQUIRED');
  const existing = Object.values<any>(db.quotaReservations).find(item => item.tenantId === context.tenantId && item.idempotencyKey === key); if (existing) return existing;
  const limit = Number(context.limits[dimension] ?? -1); if (limit < 0) throw new PlatformError('Unknown usage dimension.', 400, 'UNKNOWN_USAGE_DIMENSION');
  const period = nowIso().slice(0, 7); const committed = db.usageEvents.filter((item: any) => item.tenantId === context.tenantId && item.dimension === dimension && item.period === period && item.status === 'committed').reduce((sum: number, item: any) => sum + item.quantity, 0); const reserved = Object.values<any>(db.quotaReservations).filter(item => item.tenantId === context.tenantId && item.dimension === dimension && item.period === period && item.status === 'reserved').reduce((sum: number, item: any) => sum + item.quantity, 0);
  if (committed + reserved + quantity > limit) throw new QuotaError();
  const reservation = { id: idFor('quota'), tenantId: context.tenantId, userId: context.user.id, dimension, quantity: Math.max(0, Number(quantity)), period, idempotencyKey: key, status: 'reserved', createdAt: nowIso(), updatedAt: nowIso() }; db.quotaReservations[reservation.id] = reservation; return reservation;
}
export function commitUsage(db: any, reservationId: string, actualQuantity?: number, metadata: Record<string, any> = {}) { const reservation = db.quotaReservations?.[reservationId]; if (!reservation) throw new PlatformError('Usage reservation not found.', 404, 'RESERVATION_NOT_FOUND'); if (reservation.status === 'committed') return db.usageEvents.find((item: any) => item.reservationId === reservationId); if (reservation.status !== 'reserved') throw new ConflictError('Usage reservation is no longer active.'); reservation.status = 'committed'; reservation.updatedAt = nowIso(); const event = { id: idFor('usage'), reservationId, tenantId: reservation.tenantId, userId: reservation.userId, dimension: reservation.dimension, quantity: Math.min(reservation.quantity, Math.max(0, Number(actualQuantity ?? reservation.quantity))), unit: reservation.dimension.endsWith('_mb') ? 'MB' : 'count', status: 'committed', period: reservation.period, metadata, createdAt: nowIso() }; db.usageEvents.push(event); return event; }
export function releaseUsage(db: any, reservationId: string) { const reservation = db.quotaReservations?.[reservationId]; if (reservation?.status === 'reserved') { reservation.status = 'released'; reservation.updatedAt = nowIso(); } return reservation; }

export function requestDataExport(db: any, context: TenantContext) { requirePermission(context, 'exports.manage'); const record = { id: idFor('export'), tenantId: context.tenantId, tenantType: context.tenantType, requestedBy: context.user.id, status: 'queued', downloadTokenHash: null, expiresAt: null, createdAt: nowIso(), completedAt: null, failureCode: null }; db.dataExports[record.id] = record; const job = { id: idFor('job'), type: 'data_export', tenantId: context.tenantId, tenantType: context.tenantType, actorId: context.user.id, resourceId: record.id, status: 'queued', attempts: 0, maxAttempts: 3, runAfter: nowIso(), createdAt: nowIso(), updatedAt: nowIso(), errorCode: null }; db.jobs[job.id] = job; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: 'data_export.requested', resourceType: 'data_export', resourceId: record.id }); return record; }
export function processDataExport(db: any, exportId: string) { const record = db.dataExports?.[exportId]; if (!record || !['queued', 'processing'].includes(record.status)) return record || null; const job = Object.values<any>(db.jobs).find(item => item.type === 'data_export' && item.resourceId === exportId); if (job) { job.status = 'processing'; job.attempts = Number(job.attempts || 0) + 1; job.updatedAt = nowIso(); } record.status = 'processing'; const context = resolveTrustedTenantContext(db, record.requestedBy, record.tenantType, record.tenantId); (record as any).payload = Buffer.from(JSON.stringify(safeExportPayload(db, context))).toString('base64'); record.status = 'ready'; record.completedAt = nowIso(); if (job) { job.status = 'completed'; job.completedAt = nowIso(); job.updatedAt = nowIso(); } audit(db, { tenantId: record.tenantId, actorId: record.requestedBy, action: 'data_export.completed', resourceType: 'data_export', resourceId: record.id }); return record; }
export function failDataExport(db: any, exportId: string, code = 'EXPORT_FAILED') { const record = db.dataExports?.[exportId]; const job = Object.values<any>(db.jobs).find(item => item.type === 'data_export' && item.resourceId === exportId); if (!record || !job) return null; job.errorCode = code; job.updatedAt = nowIso(); if (job.attempts >= job.maxAttempts) { job.status = 'dead_letter'; record.status = 'failed'; record.failureCode = code; db.deadLetterJobs[job.id] = { ...job }; } else { job.status = 'queued'; job.runAfter = new Date(Date.now() + Math.min(300000, 1000 * (2 ** job.attempts))).toISOString(); record.status = 'queued'; } return record; }
export function completeDataExport(db: any, exportId: string) { const record = db.dataExports?.[exportId]; if (!record || record.status !== 'ready') return null; const token = randomToken('gxa_export_'); record.downloadTokenHash = hashSecret(token); record.expiresAt = new Date(Date.now() + 3600000).toISOString(); return { record, token }; }
export function safeExportPayload(db: any, context: TenantContext) { const key = tenantStoreKey(context); return { generatedAt: nowIso(), workspace: { id: context.workspace.id, name: context.workspace.name, tenantType: context.tenantType }, profile: publicUser(context.user), projects: db.projects?.[key] || [], documents: (db.documents?.[key] || []).map(({ data, ...item }: any) => item), chats: db.chats?.[key] || [], resumes: db.resumes?.[key] || [], brandKits: db.brandKits?.[key] || [], glossaries: db.glossaries?.[key] || [], mediaAssets: (db.mediaAssets?.[key] || []).map(({ image, ...item }: any) => item), usage: db.usageEvents.filter((item: any) => item.tenantId === context.tenantId), audit: context.entitlements.includes('audit_logs') ? db.auditEvents.filter((item: any) => item.tenantId === context.tenantId) : [] }; }

export function requestDeletion(db: any, context: TenantContext, type: 'account' | 'organization', targetId: string) {
  if (type === 'organization') {
    if (context.tenantType !== 'organization' || context.role !== 'owner' || context.tenantId !== targetId) throw new AuthorizationError();
    const owners = Object.values<any>(db.organizationMemberships).filter(item => item.organizationId === targetId && item.status === 'active' && item.roleId === 'owner');
    if (owners.length <= 1) throw new ConflictError('Transfer ownership or add another owner before requesting organization deletion.');
  } else {
    const soleOwnerships = Object.values<any>(db.organizationMemberships).filter(item => item.userId === context.user.id && item.status === 'active' && item.roleId === 'owner').filter(item => Object.values<any>(db.organizationMemberships).filter(candidate => candidate.organizationId === item.organizationId && candidate.status === 'active' && candidate.roleId === 'owner').length <= 1);
    if (soleOwnerships.length) throw new ConflictError('Transfer ownership or add another owner to every organization before requesting account deletion.');
  }
  const record = { id: idFor('deletion'), type, targetId, requestedBy: context.user.id, status: 'scheduled', scheduledFor: new Date(Date.now() + 14 * 86400000).toISOString(), createdAt: nowIso(), canceledAt: null };
  db.deletionRequests[record.id] = record; audit(db, { tenantId: context.tenantId, actorId: context.user.id, action: `${type}.deletion_requested`, resourceType: type, resourceId: targetId }); return record;
}
