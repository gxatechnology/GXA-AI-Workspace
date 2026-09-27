import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.PERSISTENCE_PROVIDER = 'memory';
process.env.VERCEL = '1';

const { default: app } = await import('../server.js');

const cookieValue = (header: string[] | string | undefined) => String(Array.isArray(header) ? header[0] : header || '').split(';')[0];

test('login and password change rotate sessions and prevent fixation', async () => {
  const email = `session-rotation-${Date.now()}@example.test`;
  const registration = await request(app).post('/api/auth/register').send({ name: 'Session Rotation', email, password: 'secure-password-123' }).expect(201);
  const registrationCookie = cookieValue(registration.headers['set-cookie']); assert.match(registrationCookie, /^gxa_session=/);

  const login = await request(app).post('/api/auth/login').set('Cookie', registrationCookie).send({ email, password: 'secure-password-123' }).expect(200);
  const loginCookie = cookieValue(login.headers['set-cookie']); assert.notEqual(loginCookie, registrationCookie);
  await request(app).get('/api/auth/profile').set('Cookie', registrationCookie).expect(401);
  await request(app).get('/api/auth/profile').set('Cookie', loginCookie).expect(200);

  const changed = await request(app).post('/api/auth/password').set('Cookie', loginCookie).send({ currentPassword: 'secure-password-123', newPassword: 'updated-password-123' }).expect(200);
  assert.equal(changed.body.sessionRotated, true);
  const changedCookie = cookieValue(changed.headers['set-cookie']); assert.notEqual(changedCookie, loginCookie);
  await request(app).get('/api/auth/profile').set('Cookie', loginCookie).expect(401);
  await request(app).get('/api/auth/profile').set('Cookie', changedCookie).expect(200);

  await request(app).post('/api/auth/logout').set('Cookie', changedCookie).expect(200);
  await request(app).get('/api/auth/profile').set('Cookie', changedCookie).expect(401);
});

test('authentication cookies are HttpOnly, SameSite Lax and explicitly expiring', async () => {
  const response = await request(app).post('/api/auth/register').send({ name: 'Cookie User', email: `cookie-${Date.now()}@example.test`, password: 'secure-password-123' }).expect(201);
  const cookie = String(response.headers['set-cookie']);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Max-Age=2592000/); assert.match(cookie, /Expires=/);
});
