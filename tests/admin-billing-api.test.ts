import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.VERCEL = '1'; process.env.NODE_ENV = 'test'; process.env.PERSISTENCE_PROVIDER = 'memory'; delete process.env.DATABASE_URL;
const { default: app } = await import('../server.js');

const reads = ['/api/admin/billing/summary', '/api/admin/billing/revenue-trend', '/api/admin/billing/plan-distribution', '/api/admin/billing/health', '/api/admin/payments', '/api/admin/payments/export.csv', '/api/admin/payments/missing', '/api/admin/subscriptions', '/api/admin/subscriptions/export.csv', '/api/admin/subscriptions/missing'];

test('every Phase 3B endpoint requires an authenticated server session', async () => {
  for (const path of reads) { const response = await request(app).get(path).expect(401); assert.equal(response.body.code, 'AUTHENTICATION_REQUIRED'); }
  const reconcile = await request(app).post('/api/admin/billing/reconcile').send({ role: 'super_admin' }).expect(401); assert.equal(reconcile.body.code, 'AUTHENTICATION_REQUIRED');
});

test('normal users and client-supplied roles cannot read financial analytics or reconcile', async () => {
  const registration = await request(app).post('/api/auth/register').send({ name: 'Billing Reader', email: 'billing-reader@example.test', password: 'secure-password-123' }).expect(201); const cookie = registration.headers['set-cookie']; assert.ok(cookie);
  for (const path of reads) { const response = await request(app).get(path).set('Cookie', cookie).set('X-Role', 'super_admin').query({ role: 'super_admin' }).expect(403); assert.equal(response.body.code, 'AUTHORIZATION_DENIED'); }
  const reconcile = await request(app).post('/api/admin/billing/reconcile').set('Cookie', cookie).set('X-Role', 'super_admin').send({ role: 'super_admin' }).expect(403); assert.equal(reconcile.body.code, 'AUTHORIZATION_DENIED');
});
