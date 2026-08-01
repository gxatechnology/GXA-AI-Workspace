import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
process.env.PERSISTENCE_PROVIDER = 'memory';
delete process.env.DATABASE_URL;

const { default: app } = await import('../server.js');

test('every Phase 3A admin API rejects an unauthenticated request', async () => {
  for (const path of ['/api/admin/summary', '/api/admin/signup-trend?range=7d', '/api/admin/users', '/api/admin/users/export.csv', '/api/admin/audit']) {
    const response = await request(app).get(path).expect(401);
    assert.equal(response.body.code, 'AUTHENTICATION_REQUIRED');
  }
  await request(app).get('/api/admin/users/missing').expect(401);
  await request(app).post('/api/admin/users/missing/suspend').set('Origin', 'http://127.0.0.1').send({ reason: 'test' }).expect(401);
  await request(app).post('/api/admin/users/missing/reactivate').set('Origin', 'http://127.0.0.1').send({ reason: 'test' }).expect(401);
});

test('normal users receive 403 and client-supplied role values cannot elevate access', async () => {
  const registration = await request(app).post('/api/auth/register').send({ name: 'Normal User', email: 'normal-admin-api@example.test', password: 'secure-password-123' }).expect(201);
  const cookie = registration.headers['set-cookie']; assert.ok(cookie);
  for (const path of ['/api/admin/summary', '/api/admin/users', '/api/admin/audit']) {
    const response = await request(app).get(path).set('Cookie', cookie).set('X-Role', 'super_admin').query({ role: 'super_admin' }).expect(403);
    assert.equal(response.body.code, 'AUTHORIZATION_DENIED');
  }
  const response = await request(app).post('/api/admin/users/missing/suspend').set('Cookie', cookie).set('Origin', 'http://127.0.0.1').set('X-Role', 'super_admin').send({ reason: 'test', role: 'super_admin' }).expect(403);
  assert.equal(response.body.code, 'AUTHORIZATION_DENIED');
});

test('public configuration moved outside the protected admin namespace', async () => {
  await request(app).get('/api/config/public').expect(200);
  await request(app).get('/api/admin/config').expect(401);
});
