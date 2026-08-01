import { expect, test } from '@playwright/test';

test('logged-out visitors are sent to existing login and normal users receive a safe forbidden state', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible();
  const documentResponse = await page.request.get('/admin');
  expect(documentResponse.headers()['x-robots-tag']).toContain('noindex');

  const email = `normal-admin-${Date.now()}@example.test`;
  await page.request.post('/api/auth/register', { data: { name: 'Normal Admin Test', email, password: 'secure-password-123' } });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Administrative access unavailable' })).toBeVisible();
  await expect(page.getByText('Your authenticated account does not have permission to open this area.')).toBeVisible();
});

test('lazy admin portal renders protected overview, users, detail and audit responsively', async ({ page }) => {
  const now = new Date().toISOString();
  const admin = { id: 'admin-ui', name: 'Admin UI', email: 'admin-ui@example.test', role: 'super_admin', subscription: 'free', status: 'active' };
  const projected = { userId: 'real-user', name: 'Registered User', email: 'registered@example.test', phone: '', company: 'GXA', timezone: 'Asia/Kolkata', language: 'English', role: 'user', status: 'active', emailVerifiedAt: null, createdAt: now, updatedAt: now, lastActiveAt: now, selectedPlan: 'free', effectivePlan: 'free', subscriptionStatus: 'free', billingMode: null, activationDate: null, currentPeriodStart: null, currentPeriodEnd: null, nextBillingDate: null, cancelAtPeriodEnd: false, latestSuccessfulPaymentAt: null, workspaceId: 'workspace', workspaceType: 'personal', workspaceRole: 'owner', projectsCount: 0, documentsCount: 0, historyCount: 0, savedPromptsCount: 0 };
  await page.route('**/api/auth/profile', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: admin }) }));
  await page.route('**/api/billing/current-plan', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ currentPlanKey: 'free' }) }));
  await page.route('**/api/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path === '/api/admin/summary' ? { timezone: 'Asia/Kolkata', metrics: { totalUsers: 1, newToday: 1, newThisWeek: 1, newThisMonth: 1, active24h: 1, active7d: 1, verified: 0, unverified: 1, freeUsers: 1, starterUsers: 0, proUsers: 0, businessProUsers: 0, activePaidUsers: 0, cancelledSubscriptions: 0, expiredSubscriptions: 0 }, recentSignups: [projected], planDistribution: { free: 1, starter: 0, pro: 0, businessPro: 0 }, verificationDistribution: { verified: 0, unverified: 1 } }
      : path === '/api/admin/signup-trend' ? { range: '7d', timezone: 'Asia/Kolkata', points: [{ date: now.slice(0, 10), signups: 1 }] }
      : path === '/api/admin/users/real-user' ? { user: projected, recentProjects: [], recentDocuments: [], recentHistory: [], recentPrompts: [], recentActivity: [] }
      : path === '/api/admin/users' ? { users: [projected], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, filters: {} }
      : path === '/api/admin/audit' ? { events: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 } }
      : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Registered users' })).toBeVisible();
  await expect(page.getByText('Total users')).toBeVisible();
  await page.getByRole('button', { name: 'Users' }).click();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View details' }).click();
  await expect(page.getByRole('heading', { name: 'Registered User' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account status' })).toBeVisible();
  await page.getByRole('button', { name: 'Audit Log' }).click();
  await expect(page.getByRole('heading', { name: 'Admin Audit Log' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => localStorage.setItem('gxa_theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(errors.filter(message => message !== 'WebSocket closed without opened.')).toEqual([]);
});
