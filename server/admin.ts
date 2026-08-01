import type { Pool } from 'pg';
import { normalizePlanId, PLAN_REGISTRY, type PlanId } from '../shared/platformRegistry.js';
import {
  adminAudit, AuthorizationError, ConflictError, normalizeAccountRole, normalizeAccountStatus,
  normalizeEmail, nowIso, PlatformError, requireSuperAdmin, resolvePlanState,
  type CanonicalAccountRole,
} from './platform.js';

const ADMIN_TIMEZONE = 'Asia/Kolkata';
const PLAN_FILTERS: Record<string, PlanId> = { free: 'free', starter: 'pro', pro: 'pro_plus', 'business-pro': 'business-pro' };
const PLAN_LABELS: Record<string, string> = { free: 'Free', pro: 'Starter', pro_plus: 'Pro', 'business-pro': 'Business Pro', team: 'Team', enterprise: 'Enterprise' };
const SUBSCRIPTION_FILTERS = new Set(['free', 'created', 'authenticated', 'active', 'trialing', 'pending', 'halted', 'paused', 'cancelled', 'canceled', 'completed', 'expired', 'failed', 'past_due', 'inactive']);
const STATUS_FILTERS = new Set(['active', 'suspended', 'deletion_pending', 'deleted']);
const ROLE_FILTERS = new Set(['user', 'admin', 'super_admin']);
const SORTS = new Set(['newest', 'oldest', 'recently_active', 'least_recently_active', 'name', 'plan', 'role']);

const text = (value: unknown, max: number) => String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
const count = (value: unknown) => Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 0;
const dateOrNull = (value: unknown) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};
const latestBy = (records: any[], fields = ['updatedAt', 'createdAt']) => [...records].sort((left, right) => {
  const rightDate = fields.map(field => Date.parse(right?.[field] || '')).find(Number.isFinite) || 0;
  const leftDate = fields.map(field => Date.parse(left?.[field] || '')).find(Number.isFinite) || 0;
  return rightDate - leftDate;
})[0] || null;

export interface AdminUserProjection {
  userId: string; name: string; email: string; emailNormalized: string; avatarUrl: string | null;
  phone: string; company: string; timezone: string; language: string; role: CanonicalAccountRole;
  status: string; emailVerifiedAt: string | null; createdAt: string; updatedAt: string; lastActiveAt: string | null;
  suspendedAt: string | null; suspendedBy: string | null; suspensionReason: string | null;
  selectedPlan: string; effectivePlan: string; subscriptionStatus: string; billingMode: string | null;
  activationDate: string | null; currentPeriodStart: string | null; currentPeriodEnd: string | null;
  nextBillingDate: string | null; cancelAtPeriodEnd: boolean; latestSuccessfulPaymentAt: string | null;
  workspaceId: string | null; workspaceType: string; workspaceRole: string;
  projectsCount: number; documentsCount: number; historyCount: number; savedPromptsCount: number;
}

export function projectAdminUser(db: any, user: any): AdminUserProjection {
  const subscriptions = Object.values<any>(db.subscriptions || {}).filter(item => item.userId === user.id || (item.tenantType === 'personal' && item.tenantId === user.id));
  const latestSubscription = latestBy(subscriptions);
  const planState = resolvePlanState(db, 'personal', user.id, user);
  const payments = [
    ...Object.values<any>(db.subscriptionPayments || {}),
    ...Object.values<any>(db.processedPayments || {}),
  ].filter(item => (item.userId === user.id || item.tenantId === user.id) && ['captured', 'paid', 'success', 'active'].includes(String(item.status || '').toLowerCase()));
  const latestPayment = latestBy(payments, ['paidAt', 'capturedAt', 'createdAt']);
  const sessions = Object.values<any>(db.sessions || {}).filter(item => item.userId === user.id);
  const latestSession = latestBy(sessions, ['lastActiveAt', 'createdAt']);
  const workspace = Object.values<any>(db.workspaces || {}).find(item => item.tenantType === 'personal' && (item.ownerId === user.id || item.tenantId === user.id));
  const avatar = String(user.profile?.avatar || '');
  const effectivePlan = normalizePlanId(planState.planId);
  const selectedPlan = normalizePlanId(user.subscription);
  return {
    userId: user.id,
    name: text(user.name, 100),
    email: normalizeEmail(user.email || user.id),
    emailNormalized: normalizeEmail(user.email || user.id),
    avatarUrl: /^https:\/\/[^\s]+$/i.test(avatar) ? avatar.slice(0, 2000) : null,
    phone: text(user.profile?.phone, 40), company: text(user.profile?.company, 120),
    timezone: text(user.preferences?.timezone, 80) || ADMIN_TIMEZONE, language: text(user.preferences?.language, 80) || 'English',
    role: normalizeAccountRole(user.role, user.adminRole), status: normalizeAccountStatus(user.status),
    emailVerifiedAt: dateOrNull(user.emailVerifiedAt), createdAt: dateOrNull(user.createdAt) || nowIso(),
    updatedAt: dateOrNull(user.updatedAt) || dateOrNull(user.createdAt) || nowIso(),
    lastActiveAt: dateOrNull(user.lastActiveAt || latestSession?.lastActiveAt || latestSession?.createdAt),
    suspendedAt: dateOrNull(user.suspendedAt), suspendedBy: text(user.suspendedBy, 160) || null,
    suspensionReason: text(user.suspensionReason, 500) || null,
    selectedPlan, effectivePlan, subscriptionStatus: String(planState.status || (effectivePlan === 'free' ? 'free' : 'active')).toLowerCase(),
    billingMode: text(planState.subscription?.billingMode || latestSubscription?.billingMode, 80) || null,
    activationDate: dateOrNull(planState.subscription?.activatedAt || latestSubscription?.activatedAt || latestSubscription?.sourcePaymentCapturedAt),
    currentPeriodStart: dateOrNull(planState.subscription?.currentPeriodStart || latestSubscription?.currentPeriodStart),
    currentPeriodEnd: dateOrNull(planState.subscription?.currentPeriodEnd || latestSubscription?.currentPeriodEnd),
    nextBillingDate: dateOrNull(planState.subscription?.nextChargeAt || latestSubscription?.nextChargeAt),
    cancelAtPeriodEnd: Boolean(planState.subscription?.cancelAtPeriodEnd || latestSubscription?.cancelAtPeriodEnd),
    latestSuccessfulPaymentAt: dateOrNull(latestPayment?.paidAt || latestPayment?.capturedAt || latestPayment?.createdAt || latestSubscription?.latestPaymentAt),
    workspaceId: workspace?.id || null, workspaceType: workspace?.tenantType || 'personal', workspaceRole: 'owner',
    projectsCount: count(db.projects?.[user.id]), documentsCount: count(db.documents?.[user.id]),
    historyCount: count(db.chats?.[user.id]) + count(db.analyses?.[user.id]) + count(db.translations?.[user.id]),
    savedPromptsCount: count(db.savedPrompts?.[user.id]),
  };
}

export interface AdminListQuery {
  search: string; status: string; verified: '' | 'true' | 'false'; plan: string; subscriptionStatus: string;
  role: string; signupFrom: string; signupTo: string; activeFrom: string; activeTo: string;
  sort: string; page: number; pageSize: 25 | 50 | 100;
}

function queryValue(value: unknown) { return Array.isArray(value) ? value[0] : value; }
function validatedDate(value: unknown, field: string) {
  const raw = text(queryValue(value), 40); if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z?)?$/.test(raw) || !Number.isFinite(Date.parse(raw))) throw new PlatformError(`${field} is invalid.`, 422, 'VALIDATION_FAILED');
  return new Date(raw).toISOString();
}

export function parseAdminListQuery(raw: Record<string, unknown>): AdminListQuery {
  const search = text(queryValue(raw.search), 120);
  const status = text(queryValue(raw.status), 40).toLowerCase();
  const verified = text(queryValue(raw.verified), 10).toLowerCase() as AdminListQuery['verified'];
  const requestedPlan = text(queryValue(raw.plan), 40).toLowerCase().replaceAll('_', '-');
  const subscriptionStatus = text(queryValue(raw.subscriptionStatus), 40).toLowerCase();
  const role = text(queryValue(raw.role), 40).toLowerCase();
  const sort = text(queryValue(raw.sort), 40).toLowerCase() || 'newest';
  const page = Number(queryValue(raw.page) || 1); const pageSize = Number(queryValue(raw.pageSize) || 25);
  if (status && !STATUS_FILTERS.has(status)) throw new PlatformError('Account status filter is invalid.', 422, 'VALIDATION_FAILED');
  if (verified && !['true', 'false'].includes(verified)) throw new PlatformError('Verification filter is invalid.', 422, 'VALIDATION_FAILED');
  if (requestedPlan && !PLAN_FILTERS[requestedPlan]) throw new PlatformError('Plan filter is invalid.', 422, 'VALIDATION_FAILED');
  if (subscriptionStatus && !SUBSCRIPTION_FILTERS.has(subscriptionStatus)) throw new PlatformError('Subscription status filter is invalid.', 422, 'VALIDATION_FAILED');
  if (role && !ROLE_FILTERS.has(role)) throw new PlatformError('Role filter is invalid.', 422, 'VALIDATION_FAILED');
  if (!SORTS.has(sort)) throw new PlatformError('Sort is invalid.', 422, 'VALIDATION_FAILED');
  if (!Number.isInteger(page) || page < 1 || page > 100_000) throw new PlatformError('Page is invalid.', 422, 'VALIDATION_FAILED');
  if (![25, 50, 100].includes(pageSize)) throw new PlatformError('Page size must be 25, 50, or 100.', 422, 'VALIDATION_FAILED');
  return { search, status, verified, plan: requestedPlan ? PLAN_FILTERS[requestedPlan] : '', subscriptionStatus, role,
    signupFrom: validatedDate(raw.signupFrom, 'Signup start date'), signupTo: validatedDate(raw.signupTo, 'Signup end date'),
    activeFrom: validatedDate(raw.activeFrom, 'Activity start date'), activeTo: validatedDate(raw.activeTo, 'Activity end date'),
    sort, page, pageSize: pageSize as 25 | 50 | 100 };
}

function whereClause(query: AdminListQuery) {
  const conditions = ["status <> 'deleted'"]; const values: unknown[] = [];
  const add = (sql: string, value: unknown) => { values.push(value); conditions.push(sql.replaceAll('?', `$${values.length}`)); };
  if (query.search) add("(name ILIKE '%' || ? || '%' OR email ILIKE '%' || ? || '%' OR company ILIKE '%' || ? || '%' OR phone ILIKE '%' || ? || '%')", query.search);
  if (query.status) add('status = ?', query.status);
  if (query.verified) conditions.push(query.verified === 'true' ? 'email_verified_at IS NOT NULL' : 'email_verified_at IS NULL');
  if (query.plan) add('effective_plan = ?', query.plan);
  if (query.subscriptionStatus) add('subscription_status = ?', query.subscriptionStatus);
  if (query.role) add('role = ?', query.role);
  if (query.signupFrom) add('created_at >= ?::timestamptz', query.signupFrom);
  if (query.signupTo) add('created_at <= ?::timestamptz', query.signupTo);
  if (query.activeFrom) add('last_active_at >= ?::timestamptz', query.activeFrom);
  if (query.activeTo) add('last_active_at <= ?::timestamptz', query.activeTo);
  return { sql: conditions.join(' AND '), values };
}

const ADMIN_USER_COLUMNS = `user_id AS "userId", name, email, avatar_url AS "avatarUrl", phone, company, timezone, language,
  role, status, email_verified_at AS "emailVerifiedAt", created_at AS "createdAt", updated_at AS "updatedAt",
  last_active_at AS "lastActiveAt", suspended_at AS "suspendedAt", suspended_by AS "suspendedBy",
  suspension_reason AS "suspensionReason", selected_plan AS "selectedPlan", effective_plan AS "effectivePlan",
  subscription_status AS "subscriptionStatus", billing_mode AS "billingMode", activation_date AS "activationDate",
  current_period_start AS "currentPeriodStart", current_period_end AS "currentPeriodEnd", next_billing_date AS "nextBillingDate",
  cancel_at_period_end AS "cancelAtPeriodEnd", latest_successful_payment_at AS "latestSuccessfulPaymentAt",
  workspace_id AS "workspaceId", workspace_type AS "workspaceType", workspace_role AS "workspaceRole",
  projects_count AS "projectsCount", documents_count AS "documentsCount", history_count AS "historyCount",
  saved_prompts_count AS "savedPromptsCount"`;

const sortSql: Record<string, string> = {
  newest: 'created_at DESC, user_id', oldest: 'created_at ASC, user_id',
  recently_active: 'last_active_at DESC NULLS LAST, user_id', least_recently_active: 'last_active_at ASC NULLS LAST, user_id',
  name: 'lower(name) ASC, user_id', plan: `CASE effective_plan WHEN 'business-pro' THEN 4 WHEN 'pro_plus' THEN 3 WHEN 'pro' THEN 2 ELSE 1 END DESC, user_id`,
  role: `CASE role WHEN 'super_admin' THEN 3 WHEN 'admin' THEN 2 ELSE 1 END DESC, user_id`,
};

export class PostgresAdminRepository {
  constructor(private readonly pool: Pool) {}

  async summary() {
    const result = await this.pool.query(`SELECT
      count(*) FILTER (WHERE status <> 'deleted')::int AS "totalUsers",
      count(*) FILTER (WHERE status <> 'deleted' AND created_at >= (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1))::int AS "newToday",
      count(*) FILTER (WHERE status <> 'deleted' AND created_at >= (date_trunc('week', now() AT TIME ZONE $1) AT TIME ZONE $1))::int AS "newThisWeek",
      count(*) FILTER (WHERE status <> 'deleted' AND created_at >= (date_trunc('month', now() AT TIME ZONE $1) AT TIME ZONE $1))::int AS "newThisMonth",
      count(*) FILTER (WHERE status = 'active' AND last_active_at >= now() - interval '24 hours')::int AS "active24h",
      count(*) FILTER (WHERE status = 'active' AND last_active_at >= now() - interval '7 days')::int AS "active7d",
      count(*) FILTER (WHERE status <> 'deleted' AND email_verified_at IS NOT NULL)::int AS verified,
      count(*) FILTER (WHERE status = 'active' AND email_verified_at IS NULL)::int AS unverified,
      count(*) FILTER (WHERE status <> 'deleted' AND effective_plan = 'free')::int AS "freeUsers",
      count(*) FILTER (WHERE status <> 'deleted' AND effective_plan = 'pro')::int AS "starterUsers",
      count(*) FILTER (WHERE status <> 'deleted' AND effective_plan = 'pro_plus')::int AS "proUsers",
      count(*) FILTER (WHERE status <> 'deleted' AND effective_plan = 'business-pro')::int AS "businessProUsers",
      count(*) FILTER (WHERE status <> 'deleted' AND effective_plan <> 'free')::int AS "activePaidUsers",
      count(*) FILTER (WHERE status <> 'deleted' AND subscription_status IN ('cancelled','canceled'))::int AS "cancelledSubscriptions",
      count(*) FILTER (WHERE status <> 'deleted' AND effective_plan = 'free' AND subscription_status = 'expired')::int AS "expiredSubscriptions"
      FROM gxa_admin_users`, [ADMIN_TIMEZONE]);
    const recent = await this.pool.query(`SELECT ${ADMIN_USER_COLUMNS} FROM gxa_admin_users WHERE status <> 'deleted' ORDER BY created_at DESC LIMIT 10`);
    return { timezone: ADMIN_TIMEZONE, generatedAt: nowIso(), metrics: result.rows[0], recentSignups: recent.rows, planDistribution: {
      free: result.rows[0].freeUsers, starter: result.rows[0].starterUsers, pro: result.rows[0].proUsers, businessPro: result.rows[0].businessProUsers,
    }, verificationDistribution: { verified: result.rows[0].verified, unverified: result.rows[0].unverified } };
  }

  async signupTrend(range: '7d' | '30d') {
    const days = range === '30d' ? 30 : 7;
    const result = await this.pool.query(`WITH days AS (
      SELECT generate_series((current_date AT TIME ZONE $1)::date - ($2::int - 1), (current_date AT TIME ZONE $1)::date, interval '1 day')::date AS day
    ) SELECT to_char(days.day, 'YYYY-MM-DD') AS date, count(users.user_id)::int AS signups
      FROM days LEFT JOIN gxa_admin_users users ON (users.created_at AT TIME ZONE $1)::date = days.day AND users.status <> 'deleted'
      GROUP BY days.day ORDER BY days.day`, [ADMIN_TIMEZONE, days]);
    return { range, timezone: ADMIN_TIMEZONE, points: result.rows };
  }

  async listUsers(query: AdminListQuery, exportLimit?: number) {
    const where = whereClause(query); const values = [...where.values];
    const countResult = await this.pool.query(`SELECT count(*)::int AS total FROM gxa_admin_users WHERE ${where.sql}`, values);
    const limit = exportLimit || query.pageSize; const offset = exportLimit ? 0 : (query.page - 1) * query.pageSize;
    values.push(limit, offset);
    const rows = await this.pool.query(`SELECT ${ADMIN_USER_COLUMNS} FROM gxa_admin_users WHERE ${where.sql} ORDER BY ${sortSql[query.sort]} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = Number(countResult.rows[0]?.total || 0);
    return { users: rows.rows, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) }, filters: query };
  }

  async userDetail(userId: string) {
    const result = await this.pool.query(`SELECT ${ADMIN_USER_COLUMNS} FROM gxa_admin_users WHERE user_id = $1 AND status <> 'deleted'`, [text(userId, 160)]);
    if (!result.rowCount) return null;
    const state = await this.pool.query("SELECT record_key, value FROM gxa_state_records WHERE namespace='application' AND record_key = ANY($1::text[])", [['projects', 'documents', 'chats', 'savedPrompts']]);
    const stores = Object.fromEntries(state.rows.map(row => [row.record_key, row.value]));
    const recent = (value: any) => (Array.isArray(value) ? value : Object.values(value || {})).sort((a: any, b: any) => Date.parse(b.updatedAt || b.createdAt || '0') - Date.parse(a.updatedAt || a.createdAt || '0')).slice(0, 10).map((item: any) => ({ id: item.id, name: text(item.name || item.title || item.tool, 120), status: text(item.status, 40) || null, createdAt: dateOrNull(item.createdAt), updatedAt: dateOrNull(item.updatedAt) }));
    const activity = await this.pool.query(`SELECT id, actor_user_id AS "actorUserId", actor_role AS "actorRole", action, target_type AS "targetType", target_id AS "targetId", reason, sanitized_metadata_json AS metadata, created_at AS "createdAt" FROM gxa_admin_audit_events WHERE target_id = $1 OR actor_user_id = $1 ORDER BY created_at DESC LIMIT 25`, [userId]);
    return { user: result.rows[0], recentProjects: recent(stores.projects?.[userId]), recentDocuments: recent(stores.documents?.[userId]), recentHistory: recent(stores.chats?.[userId]), recentPrompts: recent(stores.savedPrompts?.[userId]), recentActivity: activity.rows };
  }

  async audit(raw: Record<string, unknown>) {
    const action = text(queryValue(raw.action), 100); const actor = text(queryValue(raw.actor), 160); const target = text(queryValue(raw.target), 160);
    const from = validatedDate(raw.from, 'Audit start date'); const to = validatedDate(raw.to, 'Audit end date');
    const page = Number(queryValue(raw.page) || 1); const pageSize = Number(queryValue(raw.pageSize) || 25);
    if (!Number.isInteger(page) || page < 1 || ![25, 50, 100].includes(pageSize)) throw new PlatformError('Audit pagination is invalid.', 422, 'VALIDATION_FAILED');
    const conditions = ['1=1']; const values: unknown[] = [];
    const add = (sql: string, value: unknown) => { values.push(value); conditions.push(sql.replaceAll('?', `$${values.length}`)); };
    if (action) add('events.action = ?', action); if (actor) add("(events.actor_user_id ILIKE '%' || ? || '%' OR users.email ILIKE '%' || ? || '%')", actor);
    if (target) add("(events.target_id ILIKE '%' || ? || '%' OR events.target_type ILIKE '%' || ? || '%')", target);
    if (from) add('events.created_at >= ?::timestamptz', from); if (to) add('events.created_at <= ?::timestamptz', to);
    const where = conditions.join(' AND '); const total = await this.pool.query(`SELECT count(*)::int AS total FROM gxa_admin_audit_events events LEFT JOIN gxa_admin_users users ON users.user_id=events.actor_user_id WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await this.pool.query(`SELECT events.id, events.actor_user_id AS "actorUserId", events.actor_role AS "actorRole", users.name AS "actorName", users.email AS "actorEmail", events.action, events.target_type AS "targetType", events.target_id AS "targetId", events.reason, events.sanitized_metadata_json AS metadata, events.user_agent AS "userAgent", events.created_at AS "createdAt" FROM gxa_admin_audit_events events LEFT JOIN gxa_admin_users users ON users.user_id=events.actor_user_id WHERE ${where} ORDER BY events.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const countValue = Number(total.rows[0]?.total || 0);
    return { events: rows.rows, pagination: { page, pageSize, total: countValue, totalPages: Math.max(1, Math.ceil(countValue / pageSize)) } };
  }
}

export function suspendAccount(db: any, actor: any, targetId: string, reasonValue: unknown, request: { ipHash?: string; userAgent?: string } = {}) {
  const actorRole = requireSuperAdmin(actor); const reason = text(reasonValue, 500);
  if (!reason) throw new PlatformError('A suspension reason is required.', 422, 'VALIDATION_FAILED');
  const target = db.users?.[targetId]; if (!target) throw new PlatformError('User not found.', 404, 'USER_NOT_FOUND');
  if (target.id === actor.id) throw new ConflictError('You cannot suspend your own Super Admin account.');
  if (normalizeAccountRole(target.role, target.adminRole) === 'super_admin') throw new AuthorizationError('Super Admin accounts cannot be suspended through the admin UI.');
  if (normalizeAccountStatus(target.status) === 'suspended') return { user: target, revokedSessions: 0, duplicate: true };
  const suspendedAt = nowIso(); target.status = 'suspended'; target.suspendedAt = suspendedAt; target.suspendedBy = actor.id; target.suspensionReason = reason; target.updatedAt = suspendedAt;
  let revokedSessions = 0; for (const session of Object.values<any>(db.sessions || {}).filter(item => item.userId === target.id && !item.revokedAt)) { session.revokedAt = suspendedAt; revokedSessions += 1; }
  adminAudit(db, { actorUserId: actor.id, actorRole, action: 'user.suspended', targetType: 'user', targetId: target.id, reason, metadata: { revokedSessions }, ipHash: request.ipHash, userAgent: request.userAgent });
  return { user: target, revokedSessions, duplicate: false };
}

export function reactivateAccount(db: any, actor: any, targetId: string, reasonValue: unknown, request: { ipHash?: string; userAgent?: string } = {}) {
  const actorRole = requireSuperAdmin(actor); const reason = text(reasonValue, 500);
  if (!reason) throw new PlatformError('A reactivation reason is required.', 422, 'VALIDATION_FAILED');
  const target = db.users?.[targetId]; if (!target) throw new PlatformError('User not found.', 404, 'USER_NOT_FOUND');
  if (normalizeAccountStatus(target.status) === 'active') return { user: target, duplicate: true };
  if (normalizeAccountStatus(target.status) !== 'suspended') throw new ConflictError('Only suspended accounts can be reactivated.');
  target.status = 'active'; target.reactivatedAt = nowIso(); target.reactivatedBy = actor.id; target.updatedAt = target.reactivatedAt;
  adminAudit(db, { actorUserId: actor.id, actorRole, action: 'user.reactivated', targetType: 'user', targetId: target.id, reason, ipHash: request.ipHash, userAgent: request.userAgent });
  return { user: target, duplicate: false };
}

export function setCanonicalAccountRole(db: any, emailValue: unknown, roleValue: unknown) {
  const email = normalizeEmail(emailValue); const role = String(roleValue || '').trim().toLowerCase().replaceAll('-', '_') as CanonicalAccountRole;
  if (!ROLE_FILTERS.has(role)) throw new PlatformError('Role must be user, admin, or super_admin.', 422, 'VALIDATION_FAILED');
  const user = Object.values<any>(db.users || {}).find(item => normalizeEmail(item.email) === email);
  if (!user) throw new PlatformError('No existing user matches that email.', 404, 'USER_NOT_FOUND');
  const previousRole = normalizeAccountRole(user.role, user.adminRole);
  if (previousRole === 'super_admin' && role !== 'super_admin') {
    const remaining = Object.values<any>(db.users || {}).filter(item => item.id !== user.id && normalizeAccountRole(item.role, item.adminRole) === 'super_admin' && normalizeAccountStatus(item.status) !== 'deleted');
    if (!remaining.length) throw new ConflictError('The final Super Admin cannot be demoted.');
  }
  user.role = role; delete user.adminRole; user.updatedAt = nowIso();
  const event = adminAudit(db, { actorRole: 'system', action: role === 'super_admin' ? 'super_admin.promoted_via_cli' : 'user.role_changed', targetType: 'user', targetId: user.id, reason: 'Secure administrator CLI', metadata: { previousRole, role } });
  return { userId: user.id, role, previousRole, eventId: event.id, duplicate: previousRole === role };
}

function csvCell(value: unknown) {
  let raw = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(raw.trimStart())) raw = `'${raw}`;
  return `"${raw.replaceAll('"', '""')}"`;
}

export function usersCsv(users: any[]) {
  const columns = ['user_id', 'name', 'email', 'company', 'phone', 'role', 'status', 'email_verified', 'effective_plan', 'subscription_status', 'signup_date', 'last_active', 'projects_count', 'documents_count'];
  const rows = users.map(user => [user.userId, user.name, user.email, user.company, user.phone, user.role, user.status, Boolean(user.emailVerifiedAt), PLAN_LABELS[user.effectivePlan] || user.effectivePlan, user.subscriptionStatus, user.createdAt, user.lastActiveAt, user.projectsCount, user.documentsCount]);
  return `\uFEFF${columns.map(csvCell).join(',')}\r\n${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export const adminPlanLabel = (planId: string) => PLAN_LABELS[planId] || PLAN_REGISTRY[normalizePlanId(planId)]?.name || planId;
