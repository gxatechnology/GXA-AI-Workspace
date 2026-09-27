import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { DataType, newDb } from 'pg-mem';
import type { Pool } from 'pg';
import request from 'supertest';
import { browserMutationCsrf, consumePostgresRateLimit, contentSecurityPolicy, securityHeaders, sessionCookie } from '../server/security.js';
import { runSchemaMigrations } from '../server/persistence/migrations.js';

const csrfApp = (env: NodeJS.ProcessEnv) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).requestId = 'security-test'; next(); });
  app.use(browserMutationCsrf(env));
  app.post('/api/value', (_req, res) => res.json({ accepted: true }));
  app.post('/api/webhooks/razorpay', (_req, res) => res.json({ exempt: true }));
  app.post('/api/v1/translate', (_req, res) => res.json({ exempt: true }));
  return app;
};

test('browser mutations accept a configured same origin and reject an invalid origin', async () => {
  const app = csrfApp({ NODE_ENV: 'production', APP_ORIGIN: 'https://workspace.example' });
  await request(app).post('/api/value').set('Origin', 'https://workspace.example').send({ value: true }).expect(200, { accepted: true });
  const rejected = await request(app).post('/api/value').set('Origin', 'https://attacker.example').send({ value: true }).expect(403);
  assert.equal(rejected.body.code, 'CSRF_ORIGIN_DENIED');
});

test('production browser mutations fail closed when APP_ORIGIN is missing', async () => {
  const response = await request(csrfApp({ NODE_ENV: 'production' })).post('/api/value').set('Origin', 'https://workspace.example').send({}).expect(403);
  assert.equal(response.body.code, 'CSRF_CONFIGURATION_REQUIRED');
});

test('Razorpay webhooks and authenticated API-key routes are exempt from browser CSRF checks', async () => {
  const app = csrfApp({ NODE_ENV: 'production' });
  await request(app).post('/api/webhooks/razorpay').send({}).expect(200, { exempt: true });
  await request(app).post('/api/v1/translate').set('Authorization', 'Bearer gxa_live_test').send({}).expect(200, { exempt: true });
  await request(app).post('/api/v1/translate').send({}).expect(403).expect(response => assert.equal(response.body.code, 'CSRF_CONFIGURATION_REQUIRED'));
});

test('security headers provide frame, transport, content and browser capability protections', async () => {
  const app = express(); app.use(securityHeaders({ NODE_ENV: 'production' })); app.get('/', (_req, res) => res.send('ok'));
  const response = await request(app).get('/').expect(200);
  assert.match(String(response.headers['content-security-policy']), /frame-ancestors 'none'/);
  assert.match(String(response.headers['content-security-policy']), /checkout\.razorpay\.com/);
  assert.equal(response.headers['strict-transport-security'], 'max-age=31536000; includeSubDomains');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.doesNotMatch(contentSecurityPolicy(true), /unsafe-eval/);
});

test('session cookies are HttpOnly, explicit, secure in production and clearable', () => {
  const active = sessionCookie('gxa_sess_example', true, Date.UTC(2026, 0, 1));
  assert.match(active, /HttpOnly/); assert.match(active, /Secure/); assert.match(active, /SameSite=Lax/); assert.match(active, /Max-Age=2592000/); assert.match(active, /Expires=/);
  const cleared = sessionCookie('', true, Date.UTC(2026, 0, 1), true);
  assert.match(cleared, /Max-Age=0/); assert.match(cleared, /Expires=Thu, 01 Jan 1970/); assert.match(cleared, /Secure/);
});

test('PostgreSQL rate-limit buckets increment atomically within a bounded window', async () => {
  const database = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
  database.public.registerFunction({ name: 'hashtext', args: [DataType.text], returns: DataType.integer, implementation: () => 1 });
  database.public.registerFunction({ name: 'pg_advisory_xact_lock', args: [DataType.integer], returns: DataType.integer, implementation: () => 1 });
  const adapter = database.adapters.createPg(); const pool = new adapter.Pool() as unknown as Pool;
  try {
    await runSchemaMigrations(pool);
    const first = await consumePostgresRateLimit(pool, 'auth-login', 'a'.repeat(64), 60_000, 1_800_000);
    const second = await consumePostgresRateLimit(pool, 'auth-login', 'a'.repeat(64), 60_000, 1_800_001);
    assert.equal(first.count, 1); assert.equal(second.count, 2); assert.equal(first.resetAt, second.resetAt);
  } finally { await pool.end(); }
});
