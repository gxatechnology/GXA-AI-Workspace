import assert from 'node:assert/strict';
import test from 'node:test';
import { changeAccountPassword, issueEmailVerification, issuePasswordReset, readAccountWorkspaceState, registerAccount, resetPassword, updateAccountProfile, verifyAccountEmail, writeAccountWorkspaceState } from '../server/account.js';
import { applyPlatformMigration, createSession, resolveTenantContext, verifyPassword } from '../server/platform.js';
import { PLAN_REGISTRY } from '../shared/platformRegistry.js';
import { publicModelRegistry } from '../server/ai/registry.js';

const database = () => applyPlatformMigration({ users: {}, projects: {}, documents: {}, chats: {}, usage: {}, config: {} }).db;

test('registration creates a stable isolated personal workspace and stores only password/session hashes', () => {
  const db = database(); const created = registerAccount(db, { name: 'Asha User', email: 'ASHA@example.com', password: 'secure-password-123' });
  assert.match(created.user.id, /^user_/); assert.equal(created.user.email, 'asha@example.com'); assert.notEqual(created.user.password, 'secure-password-123'); assert.equal(verifyPassword('secure-password-123', created.user.password), true);
  assert.equal(JSON.stringify(db.sessions).includes(created.session.token), false); assert.equal(resolveTenantContext(db, created.session.token).tenantId, created.user.id);
  assert.deepEqual(db.projects[created.user.id], []); assert.deepEqual(db.documents[created.user.id], []); assert.deepEqual(db.chats[created.user.id], []);
});

test('profile updates preserve stable ownership and reject another account email', () => {
  const db = database(); const first = registerAccount(db, { name: 'First', email: 'first@example.com', password: 'secure-password-123' }).user; registerAccount(db, { name: 'Second', email: 'second@example.com', password: 'secure-password-456' });
  const id = first.id; const updated = updateAccountProfile(db, first, { name: 'First Updated', email: 'updated@example.com', phone: '+91 90000 00000', company: 'GXA', timezone: 'Asia/Kolkata', language: 'English', avatar: '' });
  assert.equal(updated.id, id); assert.equal(updated.email, 'updated@example.com'); assert.equal(updated.company, 'GXA'); assert.equal(db.projects[id].length, 0);
  assert.throws(() => updateAccountProfile(db, first, { ...updated, email: 'second@example.com' }), /already exists/);
});

test('password reset and email verification tokens are hashed, expiring, and one-time', () => {
  const db = database(); const user = registerAccount(db, { name: 'Reset User', email: 'reset@example.com', password: 'secure-password-123' }).user;
  const reset = issuePasswordReset(db, user.email)!; assert.equal(JSON.stringify(db.passwordResetTokens).includes(reset.rawToken), false); resetPassword(db, reset.rawToken, 'changed-password-123'); assert.equal(verifyPassword('changed-password-123', user.password), true); assert.throws(() => resetPassword(db, reset.rawToken, 'another-password-123'), /invalid or has expired/);
  const verification = issueEmailVerification(db, user)!; assert.equal(JSON.stringify(db.emailVerificationTokens).includes(verification.rawToken), false); verifyAccountEmail(db, verification.rawToken); assert.ok(user.emailVerifiedAt); assert.throws(() => verifyAccountEmail(db, verification.rawToken), /invalid or has expired/);
});

test('changing password revokes every other session but keeps the current session', () => {
  const db = database(); const registered = registerAccount(db, { name: 'Session User', email: 'session@example.com', password: 'secure-password-123' });
  const otherSession = createSession(db, registered.user.id);
  changeAccountPassword(db, registered.user, 'secure-password-123', 'updated-password-123', registered.session.record.id);
  assert.equal(db.sessions[registered.session.record.id].revokedAt, null); assert.ok(otherSession.record.revokedAt); assert.equal(verifyPassword('updated-password-123', registered.user.password), true);
});

test('Free, Starter, and Pro have distinct server-owned limits and model access', () => {
  assert.deepEqual([PLAN_REGISTRY.free.name, PLAN_REGISTRY.pro.name, PLAN_REGISTRY.pro_plus.name], ['Free', 'Starter', 'Pro']);
  assert.ok(PLAN_REGISTRY.free.limits.ai_requests_month < PLAN_REGISTRY.pro.limits.ai_requests_month); assert.ok(PLAN_REGISTRY.pro.limits.ai_requests_month < PLAN_REGISTRY.pro_plus.limits.ai_requests_month);
  assert.ok(PLAN_REGISTRY.free.limits.project_limit < PLAN_REGISTRY.pro.limits.project_limit); assert.ok(PLAN_REGISTRY.pro.limits.saved_document_limit < PLAN_REGISTRY.pro_plus.limits.saved_document_limit);
  assert.deepEqual([publicModelRegistry('free').length, publicModelRegistry('pro').length, publicModelRegistry('pro_plus').length], [1, 2, 3]);
});

test('editor state is isolated per account, allowlisted, and size limited', () => {
  const db = database(); const first = registerAccount(db, { name: 'First', email: 'state-one@example.com', password: 'secure-password-123' }).user; const second = registerAccount(db, { name: 'Second', email: 'state-two@example.com', password: 'secure-password-456' }).user;
  writeAccountWorkspaceState(db, first.id, 'grammar_checker', { draft: 'private draft' });
  assert.equal(readAccountWorkspaceState(db, first.id, 'grammar_checker').value.draft, 'private draft'); assert.equal(readAccountWorkspaceState(db, second.id, 'grammar_checker'), null);
  assert.throws(() => writeAccountWorkspaceState(db, first.id, 'unknown', {}), /key is invalid/);
  assert.throws(() => writeAccountWorkspaceState(db, first.id, 'ai_writer', { content: 'x'.repeat(800_000) }), /too large/);
});
