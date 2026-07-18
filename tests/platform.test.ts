import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addTeamMember, applyPlatformMigration, authenticateApiKey, ConflictError, createApiKey, createAutomation,
  completeDataExport, createOrganization, createSession, createTeam, createWebhook, executeAutomation, hashSecret, processDataExport,
  requestDataExport, requestDeletion, reserveUsage, commitUsage, resolveTenantContext, setActiveWorkspace, updateMembership,
  validateWebhookUrl, verifyPassword,
} from '../server/platform.js';

function database(subscription = 'pro_plus') {
  const source: any = {
    users: { 'owner@example.com': { id: 'owner@example.com', email: 'owner@example.com', name: 'Owner', password: 'long-enough-password', subscription, role: 'User' } },
    projects: {}, documents: {}, chats: {}, config: {}, usage: {},
  };
  return applyPlatformMigration(source).db;
}

function sessionContext(db: any) {
  const session = createSession(db, 'owner@example.com');
  return { token: session.token, context: resolveTenantContext(db, session.token) };
}

test('platform migration is additive, password-safe and idempotent', () => {
  const original: any = { users: { 'owner@example.com': { id: 'owner@example.com', email: 'owner@example.com', password: 'long-enough-password' } }, projects: { untouched: [{ id: 'p1' }] } };
  const preview = applyPlatformMigration(original, { dryRun: true });
  assert.equal(original.schemaVersion, undefined);
  assert.deepEqual(original.projects.untouched, [{ id: 'p1' }]);
  assert.equal(preview.toVersion, 13);
  const applied = applyPlatformMigration(original);
  assert.equal(applied.db.schemaVersion, 13);
  assert.notEqual(applied.db.users['owner@example.com'].password, 'long-enough-password');
  assert.ok(applied.db.users['owner@example.com'].password.startsWith('scrypt$'));
  assert.equal(verifyPassword('long-enough-password', applied.db.users['owner@example.com'].password), true);
  assert.deepEqual(applied.db.projects.untouched, [{ id: 'p1' }]);
  assert.equal(applyPlatformMigration(applied.db).changed, false);
});

test('sessions persist only token hashes and reject opaque token substitutes', () => {
  const db = database();
  const { token, context } = sessionContext(db);
  const record = Object.values<any>(db.sessions)[0];
  assert.equal(record.tokenHash, hashSecret(token));
  assert.equal(JSON.stringify(record).includes(token), false);
  assert.equal(context.user.id, 'owner@example.com');
  assert.throws(() => resolveTenantContext(db, 'owner@example.com'), /Authentication required/);
});

test('organization tenant switching is membership-bound and last owner is protected', () => {
  const db = database();
  const { token, context } = sessionContext(db);
  const created = createOrganization(db, context, { name: 'Acme Operations' });
  setActiveWorkspace(db, context, created.workspace.id);
  const organizationContext = resolveTenantContext(db, token);
  assert.equal(organizationContext.tenantId, created.organization.id);
  assert.equal(organizationContext.role, 'owner');
  assert.throws(() => updateMembership(db, organizationContext, created.membership.id, { roleId: 'member' }), ConflictError);
  const foreign = { id: 'ws_foreign', tenantType: 'organization', tenantId: 'org_foreign', ownerId: 'other', status: 'active' };
  db.workspaces[foreign.id] = foreign;
  assert.throws(() => setActiveWorkspace(db, organizationContext, foreign.id), /permission/);
});

test('RBAC denies member management to viewers', () => {
  const db = database();
  const { token, context } = sessionContext(db);
  const created = createOrganization(db, context, { name: 'RBAC Test' });
  setActiveWorkspace(db, context, created.workspace.id);
  created.membership.roleId = 'viewer';
  const viewer = resolveTenantContext(db, token);
  assert.equal(viewer.permissions.includes('members.invite'), false);
  assert.throws(() => updateMembership(db, viewer, created.membership.id, { status: 'suspended' }), /permission/);
});

test('team membership is constrained to active organization memberships', () => {
  const db = database(); const { token, context } = sessionContext(db); const created = createOrganization(db, context, { name: 'Team Test' }); setActiveWorkspace(db, context, created.workspace.id); const organizationContext = resolveTenantContext(db, token);
  const team = createTeam(db, organizationContext, { name: 'Editors' });
  const assignment = addTeamMember(db, organizationContext, team.id, created.membership.id);
  assert.equal(assignment.organizationId, created.organization.id);
  assert.equal(addTeamMember(db, organizationContext, team.id, created.membership.id).id, assignment.id);
  db.organizationMemberships[created.membership.id].status = 'suspended';
  assert.throws(() => addTeamMember(db, organizationContext, team.id, 'unknown'), /membership/i);
});

test('API keys are one-time scoped credentials and usage reservations are idempotent', () => {
  const db = database();
  const { context } = sessionContext(db);
  const result = createApiKey(db, context, { name: 'CI', scopes: ['usage:read'], rateLimit: 10 });
  assert.ok(result.secret.startsWith('gxa_live_'));
  assert.equal(db.apiKeys[result.key.id].secretHash, hashSecret(result.secret));
  assert.equal(JSON.stringify(db.apiKeys[result.key.id]).includes(result.secret), false);
  assert.equal(authenticateApiKey(db, result.secret, 'usage:read').id, result.key.id);
  assert.throws(() => authenticateApiKey(db, result.secret, 'translation:write'), /scope/);
  for (let index = 0; index < 9; index += 1) authenticateApiKey(db, result.secret, 'usage:read');
  assert.throws(() => authenticateApiKey(db, result.secret, 'usage:read'), /rate limit/i);

  const reservation = reserveUsage(db, context, 'api_requests_month', 900, 'request-1');
  assert.equal(reserveUsage(db, context, 'api_requests_month', 900, 'request-1').id, reservation.id);
  assert.throws(() => reserveUsage(db, context, 'api_requests_month', 101, 'request-2'), /quota/i);
  const event = commitUsage(db, reservation.id, 800);
  assert.equal(event.quantity, 800);
  assert.equal(commitUsage(db, reservation.id).id, event.id);
});

test('webhook validation blocks SSRF and stores recoverable secrets encrypted', async () => {
  const previous = process.env.PLATFORM_ENCRYPTION_KEY;
  process.env.PLATFORM_ENCRYPTION_KEY = 'test-only-encryption-key-with-sufficient-entropy';
  try {
    await assert.rejects(() => validateWebhookUrl('http://example.com/hook', { allowDns: false }), /HTTPS/);
    await assert.rejects(() => validateWebhookUrl('https://127.0.0.1/hook', { allowDns: false }), /Private-network/);
    await assert.rejects(() => validateWebhookUrl('https://localhost/hook', { allowDns: false }), /not permitted/);
    const db = database(); const { context } = sessionContext(db);
    const result = await createWebhook(db, context, { name: 'Operations', url: 'https://8.8.8.8/hook', events: ['project.updated'] }, { allowDns: false });
    const stored = db.webhookEndpoints[result.endpoint.id];
    assert.ok(result.secret.startsWith('whsec_'));
    assert.equal(stored.secretHash, hashSecret(result.secret));
    assert.notEqual(stored.encryptedSecret, result.secret);
    assert.equal(JSON.stringify(stored).includes(result.secret), false);
  } finally { if (previous === undefined) delete process.env.PLATFORM_ENCRYPTION_KEY; else process.env.PLATFORM_ENCRYPTION_KEY = previous; }
});

test('automations accept only configured triggers/actions and persist real executions', async () => {
  const db = database(); const { context } = sessionContext(db);
  assert.throws(() => createAutomation(db, context, { name: 'Unsafe', trigger: 'cron_eval', steps: [{ action: 'execute_code' }] }), /trigger/);
  const workflow = createAutomation(db, context, { name: 'Project intake', trigger: 'manual', steps: [{ action: 'create_project', config: { name: 'Intake project' }, errorPolicy: 'stop' }] });
  const execution = await executeAutomation(db, context, workflow, {});
  assert.equal(execution.status, 'completed');
  assert.equal(db.projects['owner@example.com'][0].name, 'Intake project');
  assert.equal(db.automationExecutions[execution.id].status, 'completed');
});

test('data exports use durable job records and issue expiring tokens only after completion', () => {
  const db = database(); const { context } = sessionContext(db);
  db.projects['owner@example.com'] = [{ id: 'project-1', name: 'Real project' }];
  const record = requestDataExport(db, context);
  assert.equal(record.status, 'queued');
  assert.equal(Object.values<any>(db.jobs)[0].resourceId, record.id);
  assert.equal(completeDataExport(db, record.id), null);
  processDataExport(db, record.id);
  const issued = completeDataExport(db, record.id)!;
  assert.ok(issued.token.startsWith('gxa_export_'));
  assert.equal(record.downloadTokenHash, hashSecret(issued.token));
  const payload = JSON.parse(Buffer.from(record.payload, 'base64').toString('utf8'));
  assert.equal(payload.projects[0].name, 'Real project');
  assert.equal(JSON.stringify(payload).includes('long-enough-password'), false);
  assert.equal(Object.values<any>(db.jobs)[0].status, 'completed');
});

test('account deletion cannot orphan an organization', () => {
  const db = database(); const { context } = sessionContext(db); createOrganization(db, context, { name: 'Ownership Guard' });
  assert.throws(() => requestDeletion(db, context, 'account', context.user.id), /Transfer ownership/);
});
