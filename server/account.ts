import crypto from 'crypto';
import {
  audit, ConflictError, createSession, ensurePersonalWorkspace, hashPassword, hashSecret,
  normalizeEmail, nowIso, PlatformError, publicUser, securityEvent, verifyPassword,
} from './platform.js';

const clean = (value: unknown, max: number) => String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
const token = (prefix: string) => `${prefix}${crypto.randomBytes(32).toString('base64url')}`;
export const ACCOUNT_STATE_KEYS = new Set(['ai_writer', 'grammar_checker', 'paraphraser']);

export function readAccountWorkspaceState(db: any, userId: string, key: string) {
  if (!ACCOUNT_STATE_KEYS.has(key)) throw new PlatformError('Workspace state key is invalid.', 400, 'STATE_KEY_INVALID');
  return db.userWorkspaceStates?.[userId]?.[key] || null;
}

export function writeAccountWorkspaceState(db: any, userId: string, key: string, value: unknown) {
  if (!ACCOUNT_STATE_KEYS.has(key)) throw new PlatformError('Workspace state key is invalid.', 400, 'STATE_KEY_INVALID');
  const serialized = JSON.stringify(value ?? null);
  if (Buffer.byteLength(serialized, 'utf8') > 750_000) throw new PlatformError('Workspace state is too large to save.', 413, 'STATE_TOO_LARGE');
  db.userWorkspaceStates ||= {}; db.userWorkspaceStates[userId] ||= {};
  const record = { value: value ?? null, updatedAt: nowIso() };
  db.userWorkspaceStates[userId][key] = record;
  return record;
}

export function findUserByEmail(db: any, value: unknown) {
  const email = normalizeEmail(value);
  return Object.values<any>(db.users || {}).find(user => normalizeEmail(user?.email || user?.id) === email) || null;
}

export function registerAccount(db: any, raw: any, meta: { userAgent?: string; ipHash?: string } = {}) {
  const email = normalizeEmail(raw?.email);
  const name = clean(raw?.name, 100);
  if (!name) throw new PlatformError('Name is required.', 400, 'NAME_REQUIRED');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new PlatformError('Enter a valid email address.', 400, 'EMAIL_INVALID');
  if (findUserByEmail(db, email)) throw new ConflictError('An account with this email already exists.');
  const createdAt = nowIso();
  const user = {
    id: `user_${crypto.randomUUID()}`,
    name,
    email,
    password: hashPassword(String(raw?.password || '')),
    subscription: 'free', role: 'User', adminRole: null, status: 'active', emailVerifiedAt: null,
    profile: { avatar: null, phone: '', company: '' },
    preferences: { timezone: 'Asia/Kolkata', language: 'English' },
    createdAt, updatedAt: createdAt,
  };
  db.users[user.id] = user;
  db.projects[user.id] ||= [];
  db.documents[user.id] ||= [];
  db.chats[user.id] ||= [];
  db.userWorkspaceStates[user.id] ||= {};
  ensurePersonalWorkspace(db, user.id);
  const session = createSession(db, user.id, meta);
  securityEvent(db, { actorId: user.id, type: 'account.registered', outcome: 'success' });
  return { user, session };
}

function avatar(value: unknown) {
  const result = clean(value, 500_000);
  if (!result) return null;
  if (/^https:\/\/[^\s]+$/i.test(result)) return result;
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(result) && result.length <= 350_000) return result;
  throw new PlatformError('Avatar must be a secure image URL or a PNG, JPEG, or WebP image under 250 KB.', 400, 'AVATAR_INVALID');
}

export function updateAccountProfile(db: any, user: any, raw: any) {
  const name = clean(raw?.name, 100);
  const email = normalizeEmail(raw?.email);
  if (!name) throw new PlatformError('Name is required.', 400, 'NAME_REQUIRED');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new PlatformError('Enter a valid email address.', 400, 'EMAIL_INVALID');
  const conflict = findUserByEmail(db, email);
  if (conflict && conflict.id !== user.id) throw new ConflictError('An account with this email already exists.');
  const emailChanged = email !== normalizeEmail(user.email);
  user.name = name;
  user.email = email;
  user.profile = {
    ...(user.profile || {}),
    avatar: avatar(raw?.avatar),
    phone: clean(raw?.phone, 40),
    company: clean(raw?.company, 120),
  };
  user.preferences = {
    ...(user.preferences || {}),
    timezone: clean(raw?.timezone, 80) || 'Asia/Kolkata',
    language: clean(raw?.language, 80) || 'English',
  };
  if (emailChanged) user.emailVerifiedAt = null;
  user.updatedAt = nowIso();
  audit(db, { tenantId: user.id, actorId: user.id, action: 'account.profile_updated', resourceType: 'user', resourceId: user.id, metadata: { emailChanged } });
  return publicUser(user);
}

export function issuePasswordReset(db: any, value: unknown) {
  const user = findUserByEmail(db, value);
  if (!user || user.status !== 'active') return null;
  const rawToken = token('gxa_reset_');
  const record = { id: `reset_${crypto.randomUUID()}`, userId: user.id, tokenHash: hashSecret(rawToken), createdAt: nowIso(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), consumedAt: null };
  db.passwordResetTokens[record.id] = record;
  securityEvent(db, { actorId: user.id, type: 'account.password_reset_requested', outcome: 'success' });
  return { rawToken, record, user };
}

export function resetPassword(db: any, rawToken: string, password: string) {
  const tokenHash = hashSecret(String(rawToken || ''));
  const record = Object.values<any>(db.passwordResetTokens || {}).find(item => item.tokenHash === tokenHash);
  if (!record || record.consumedAt || Date.parse(record.expiresAt) <= Date.now()) throw new PlatformError('This password reset link is invalid or has expired.', 400, 'RESET_TOKEN_INVALID');
  const user = db.users?.[record.userId];
  if (!user || user.status !== 'active') throw new PlatformError('This password reset link is invalid or has expired.', 400, 'RESET_TOKEN_INVALID');
  user.password = hashPassword(password);
  user.updatedAt = nowIso();
  record.consumedAt = nowIso();
  for (const session of Object.values<any>(db.sessions || {}).filter(item => item.userId === user.id)) session.revokedAt = nowIso();
  securityEvent(db, { actorId: user.id, type: 'account.password_reset_completed', outcome: 'success' });
  return user;
}

export function issueEmailVerification(db: any, user: any) {
  if (user.emailVerifiedAt) return null;
  const rawToken = token('gxa_verify_');
  const record = { id: `verify_${crypto.randomUUID()}`, userId: user.id, email: normalizeEmail(user.email), tokenHash: hashSecret(rawToken), createdAt: nowIso(), expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), consumedAt: null };
  db.emailVerificationTokens[record.id] = record;
  return { rawToken, record, user };
}

export function verifyAccountEmail(db: any, rawToken: string) {
  const tokenHash = hashSecret(String(rawToken || ''));
  const record = Object.values<any>(db.emailVerificationTokens || {}).find(item => item.tokenHash === tokenHash);
  if (!record || record.consumedAt || Date.parse(record.expiresAt) <= Date.now()) throw new PlatformError('This verification link is invalid or has expired.', 400, 'VERIFICATION_TOKEN_INVALID');
  const user = db.users?.[record.userId];
  if (!user || normalizeEmail(user.email) !== record.email) throw new PlatformError('This verification link is invalid or has expired.', 400, 'VERIFICATION_TOKEN_INVALID');
  user.emailVerifiedAt = nowIso();
  user.updatedAt = nowIso();
  record.consumedAt = nowIso();
  securityEvent(db, { actorId: user.id, type: 'account.email_verified', outcome: 'success' });
  return user;
}

export function changeAccountPassword(db: any, user: any, currentPassword: string, nextPassword: string, currentSessionId: string) {
  if (!verifyPassword(currentPassword, String(user.password || ''))) throw new PlatformError('Current password is incorrect.', 401, 'CURRENT_PASSWORD_INCORRECT');
  user.password = hashPassword(nextPassword);
  user.updatedAt = nowIso();
  for (const session of Object.values<any>(db.sessions || {}).filter(item => item.userId === user.id && item.id !== currentSessionId)) session.revokedAt = nowIso();
  securityEvent(db, { actorId: user.id, type: 'account.password_changed', outcome: 'success' });
}
