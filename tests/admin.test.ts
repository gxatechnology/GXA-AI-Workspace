import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseAdminListQuery, projectAdminUser, reactivateAccount, setCanonicalAccountRole,
  suspendAccount, usersCsv,
} from '../server/admin.js';
import { registerAccount } from '../server/account.js';
import {
  applyPlatformMigration, normalizeAccountRole, requireAdminRead, requireSuperAdmin, resolveSession,
  resolveTenantContext,
} from '../server/platform.js';

function fixture() {
  const db = applyPlatformMigration({ users: {}, projects: {}, documents: {}, chats: {}, usage: {}, config: {} }).db;
  const owner = registerAccount(db, { name: 'Owner', email: 'owner@example.test', password: 'secure-password-123' });
  const admin = registerAccount(db, { name: 'Read Admin', email: 'admin@example.test', password: 'secure-password-123' });
  const member = registerAccount(db, { name: '=Formula User', email: 'member@example.test', password: 'secure-password-123' });
  owner.user.role = 'super_admin'; admin.user.role = 'admin'; member.user.role = 'user';
  return { db, owner, admin, member };
}

test('canonical account roles normalize legacy values and ignore client-shaped aliases', () => {
  assert.equal(normalizeAccountRole('User'), 'user');
  assert.equal(normalizeAccountRole('SuperAdmin'), 'super_admin');
  assert.equal(normalizeAccountRole('User', 'platform_admin'), 'admin');
  assert.equal(normalizeAccountRole('owner'), 'user');
});

test('admin is read-only while super admin receives mutation authority', () => {
  const { owner, admin, member } = fixture();
  assert.equal(requireAdminRead(admin.user), 'admin');
  assert.throws(() => requireSuperAdmin(admin.user), /Super Admin/);
  assert.equal(requireSuperAdmin(owner.user), 'super_admin');
  assert.throws(() => requireAdminRead(member.user), /Administrative permission/);
});

test('suspension preserves user data, revokes sessions, and writes sanitized immutable audit input', () => {
  const { db, owner, member } = fixture();
  db.projects[member.user.id] = [{ id: 'project-1', name: 'Preserved' }];
  const result = suspendAccount(db, owner.user, member.user.id, 'Repeated policy violation', { ipHash: 'safe-ip-hash', userAgent: 'Test browser' });
  assert.equal(result.user.status, 'suspended'); assert.ok(result.user.suspendedAt); assert.equal(result.user.suspendedBy, owner.user.id);
  assert.equal(db.projects[member.user.id][0].name, 'Preserved'); assert.ok(result.revokedSessions > 0);
  assert.equal(resolveSession(db, member.session.token), null);
  assert.equal(db.adminAuditEvents.at(-1).action, 'user.suspended');
  assert.deepEqual(Object.keys(db.adminAuditEvents.at(-1).metadata), ['revokedSessions']);
});

test('reactivation requires super admin and does not recreate a session', () => {
  const { db, owner, admin, member } = fixture(); suspendAccount(db, owner.user, member.user.id, 'Temporary review');
  assert.throws(() => reactivateAccount(db, admin.user, member.user.id, 'Review complete'), /Super Admin/);
  const result = reactivateAccount(db, owner.user, member.user.id, 'Review complete');
  assert.equal(result.user.status, 'active'); assert.equal(resolveSession(db, member.session.token), null);
  assert.equal(db.adminAuditEvents.at(-1).action, 'user.reactivated');
});

test('self-suspension and super-admin suspension are blocked', () => {
  const { db, owner } = fixture();
  assert.throws(() => suspendAccount(db, owner.user, owner.user.id, 'Unsafe self action'), /cannot suspend your own/);
  const other = registerAccount(db, { name: 'Other Owner', email: 'other-owner@example.test', password: 'secure-password-123' }); other.user.role = 'super_admin';
  assert.throws(() => suspendAccount(db, owner.user, other.user.id, 'Unsafe privileged action'), /cannot be suspended/);
});

test('CLI role changes require an existing user and cannot demote the final super admin', () => {
  const { db, owner, member } = fixture();
  assert.throws(() => setCanonicalAccountRole(db, 'missing@example.test', 'admin'), /No existing user/);
  assert.throws(() => setCanonicalAccountRole(db, owner.user.email, 'user'), /final Super Admin/);
  const promoted = setCanonicalAccountRole(db, member.user.email.toUpperCase(), 'super_admin');
  assert.equal(promoted.role, 'super_admin'); assert.equal(db.adminAuditEvents.at(-1).action, 'super_admin.promoted_via_cli');
  const demoted = setCanonicalAccountRole(db, owner.user.email, 'admin'); assert.equal(demoted.role, 'admin');
});

test('admin projection uses effective payment state and efficient aggregate counts', () => {
  const { db, member } = fixture();
  db.pendingPlanSelections.selection = { id: 'selection', userId: member.user.id, planKey: 'business-pro', status: 'selected' };
  db.projects[member.user.id] = [{ id: 'p1' }, { id: 'p2' }]; db.documents[member.user.id] = [{ id: 'd1' }]; db.savedPrompts[member.user.id] = [{ id: 'prompt' }];
  const projection = projectAdminUser(db, member.user);
  assert.equal(projection.effectivePlan, 'free'); assert.equal(projection.subscriptionStatus, 'free');
  assert.deepEqual([projection.projectsCount, projection.documentsCount, projection.savedPromptsCount], [2, 1, 1]);
  assert.equal('password' in projection, false); assert.equal('sessionToken' in projection, false);
});

test('last-active tracking is persisted in-memory at most once per 15-minute window', () => {
  const { db, member } = fixture(); const old = new Date(Date.now() - 20 * 60_000).toISOString();
  member.user.lastActiveAt = old; member.session.record.lastActiveAt = old;
  const first = resolveTenantContext(db, member.session.token); assert.equal(first.activityUpdated, true); const activeAt = member.user.lastActiveAt;
  const second = resolveTenantContext(db, member.session.token); assert.equal(second.activityUpdated, false); assert.equal(member.user.lastActiveAt, activeAt);
});

test('query validation allowlists filters, sorting, and pagination', () => {
  const query = parseAdminListQuery({ search: 'GXA', status: 'active', verified: 'false', plan: 'starter', role: 'user', sort: 'recently_active', page: '2', pageSize: '50' });
  assert.deepEqual({ status: query.status, verified: query.verified, plan: query.plan, role: query.role, sort: query.sort, page: query.page, pageSize: query.pageSize }, { status: 'active', verified: 'false', plan: 'pro', role: 'user', sort: 'recently_active', page: 2, pageSize: 50 });
  assert.throws(() => parseAdminListQuery({ sort: 'DROP TABLE users' }), /Sort is invalid/);
  assert.throws(() => parseAdminListQuery({ pageSize: '5000' }), /Page size/);
});

test('CSV export is UTF-8, filter-ready, formula-safe, and excludes secrets', () => {
  const data = fixture(); const projection = projectAdminUser(data.db, data.member.user);
  const csv = usersCsv([{ ...projection, name: '=HYPERLINK("https://unsafe")', company: '+SUM(1,1)', phone: '-10' }]);
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv, /"'=HYPERLINK/); assert.match(csv, /"'\+SUM/); assert.match(csv, /"'-10"/);
  assert.doesNotMatch(csv, /password|tokenHash|sessionToken/i);
});
