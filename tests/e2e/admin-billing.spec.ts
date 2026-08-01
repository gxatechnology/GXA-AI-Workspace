import { expect, test } from '@playwright/test';

const now = '2026-08-01T10:00:00.000Z';
const admin = { id: 'billing-admin', name: 'Billing Admin', email: 'billing-admin@example.test', role: 'super_admin', subscription: 'free', status: 'active' };
const reporting = { range: '30d', dateFrom: '2026-07-03', dateTo: '2026-08-01', timezone: 'Asia/Kolkata', environment: 'test' };
const payment = { id: 'payment-1', userId: 'user-1', customerName: 'Test Customer', customerEmail: 'customer@example.test', workspaceId: 'workspace-1', planKey: 'pro', billingType: 'initial_subscription_payment', amountPaise: 9900, currency: 'INR', status: 'captured', providerPaymentReference: '••••payment1', providerOrderReference: '••••order001', providerSubscriptionReference: '••••sub00001', signatureVerified: true, verificationState: 'verified', capturedAt: now, accessPeriodStart: now, accessPeriodEnd: '2026-09-01T10:00:00.000Z', reconciliationStatus: 'synchronized', environment: 'test', createdAt: now };
const subscription = { id: 'subscription-1', userId: 'user-1', customerName: 'Test Customer', customerEmail: 'customer@example.test', workspaceId: 'workspace-1', planKey: 'pro', billingMode: 'recurring_subscription', amountPaise: 9900, currency: 'INR', status: 'active', billingInterval: 'monthly', providerSubscriptionReference: '••••sub00001', providerPlanReference: '••••plan0001', currentPeriodStart: now, currentPeriodEnd: '2026-09-01T10:00:00.000Z', nextChargeAt: '2026-09-01T10:00:00.000Z', cancelAtPeriodEnd: false, cancelledAt: null, latestPaymentReference: '••••payment1', latestPaymentAt: now, reconciliationStatus: 'synchronized', lastReconciledAt: now, environment: 'test', createdAt: now, updatedAt: now };

async function mockAdminBilling(page: any) {
  await page.route('**/api/auth/profile', (route: any) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: admin }) }));
  await page.route('**/api/billing/current-plan', (route: any) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ currentPlanKey: 'free' }) }));
  await page.route('**/api/admin/**', (route: any) => {
    const path = new URL(route.request().url()).pathname;
    const body = path === '/api/admin/billing/summary' ? { reporting, metrics: { totalRevenuePaise: 9900, revenueTodayPaise: 9900, revenueThisWeekPaise: 9900, revenueThisMonthPaise: 9900, previousMonthRevenuePaise: 0, selectedRevenuePaise: 9900, averageSuccessfulPaymentPaise: 9900, monthOverMonthPercent: null, mrrPaise: 9900, estimatedArrPaise: 118800, successfulPayments: 1, failedPayments: 0, pendingPayments: 0, activePaidSubscriptions: 1, cancelledSubscriptions: 0, expiredSubscriptions: 0, renewalFailures: 0, refundsConfigured: false }, recentPayments: [payment], latestReconciliation: null }
      : path === '/api/admin/billing/revenue-trend' ? { reporting, points: [{ date: '2026-08-01', revenuePaise: 9900, successfulPayments: 1, newPaidSubscriptions: 1, successfulRenewals: 0 }] }
      : path === '/api/admin/billing/plan-distribution' ? { reporting, plans: [{ planKey: 'pro', planName: 'Starter', successfulPayments: 1, revenuePaise: 9900, revenuePercent: 100, activeSubscribers: 1, cancelledSubscribers: 0, renewalSuccesses: 0, renewalFailures: 0 }] }
      : path === '/api/admin/billing/health' ? { reporting, indicators: { stalePendingPayments: 0, authorizedUncaptured: 0, verificationFailures: 0, amountMismatches: 0, failedWebhookEvents: 0, unprocessedWebhookEvents: 0, rejectedWebhookEvents: 0, staleSubscriptions: 0, haltedSubscriptions: 0, renewalFailures: 0, expiredMarkedActive: 0, activeWithoutPaidPeriod: 0, providerStateMismatches: 0, missingPaymentUsers: 0, missingPaymentWorkspaces: 0, missingSubscriptionUsers: 0, missingSubscriptionWorkspaces: 0, duplicateProviderEventsPrevented: 0 } }
      : path === '/api/admin/payments/payment-1' ? { payment, lifecycleEvents: [], idempotency: { uniqueProviderPayment: true, result: 'enforced' } }
      : path === '/api/admin/payments' ? { payments: [payment], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, filters: {} }
      : path === '/api/admin/subscriptions/subscription-1' ? { subscription, renewalHistory: [payment], lifecycleEvents: [] }
      : path === '/api/admin/subscriptions' ? { subscriptions: [subscription], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, filters: {} }
      : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('super admin can inspect verified billing, payments and subscription lifecycle', async ({ page }) => {
  await mockAdminBilling(page); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin/billing');
  await expect(page.getByRole('heading', { name: 'Verified revenue and billing health' })).toBeVisible();
  await expect(page.getByText('Test Mode — No real money collected')).toBeVisible();
  await expect(page.getByText('Total verified revenue').locator('..').getByText('₹99.00')).toBeVisible();
  await expect(page.getByText('Refund tracking is not configured.')).toBeVisible();
  await page.getByRole('button', { name: 'Billing' }).click();
  await page.getByRole('button', { name: 'View payments' }).click();
  await expect(page.getByRole('heading', { name: 'Verified payment records' })).toBeVisible();
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('heading', { name: /₹99\.00 · Starter/ })).toBeVisible();
  await expect(page.getByText('Safe provider references only. No signatures, card data or raw webhook payloads.')).toBeVisible();
  await page.getByRole('button', { name: 'Subscriptions' }).click();
  await expect(page.getByRole('heading', { name: 'Subscription lifecycle' })).toBeVisible();
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('heading', { name: 'Starter · active' })).toBeVisible();
  expect(errors.filter(message => message !== 'WebSocket closed without opened.')).toEqual([]);
});

test('billing administration remains usable on mobile and in dark theme', async ({ page }) => {
  await mockAdminBilling(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/billing'); await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByText('Test Mode — No real money collected')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
