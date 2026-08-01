import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  ['/', 'Write, understand documents and move professional work forward.'],
  ['/about', 'About GXA AI Workspace'], ['/contact', 'Contact GXA Technologies'], ['/help', 'Help Center'],
  ['/faq', 'Frequently Asked Questions'], ['/docs', 'Documentation'], ['/resources', 'Resources'],
  ['/trust', 'Trust Center'], ['/security', 'Security at GXA AI Workspace'], ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'], ['/refund-policy', 'Refund Policy'], ['/cancellation-policy', 'Cancellation Policy'],
  ['/cookie-policy', 'Cookie Policy'], ['/ai-usage-policy', 'AI Usage Policy'], ['/responsible-ai', 'Responsible AI'],
  ['/careers', 'Careers at GXA Technologies'], ['/status', 'System Status'], ['/release-notes', 'Release Notes'], ['/changelog', 'Changelog'],
] as const;

test('all public routes render without horizontal overflow', async ({ page }) => {
  test.setTimeout(120_000);
  const blockingErrors: string[] = [];
  page.on('pageerror', error => { if (!error.message.includes('WebSocket closed without opened')) blockingErrors.push(error.message); });
  page.on('response', response => { if (response.status() >= 500) blockingErrors.push(`${response.status()} ${response.url()}`); });
  for (const [route, heading] of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  expect(blockingErrors).toEqual([]);
});

test('public home, search, authentication and workspace paths remain functional', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Search help and documentation' }).click();
  const search = page.getByRole('dialog', { name: 'Search help and documentation' });
  await search.getByRole('textbox', { name: 'Search' }).fill('Business Studio');
  await expect(search.getByRole('link', { name: /Which plan includes Business Studio/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await page.getByRole('button', { name: 'Start Free', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.goto('/#/home');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});

test('public site is responsive and dark-mode compatible', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Toggle public navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile public navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('unknown public routes render the professional 404 page', async ({ page }) => {
  const response = await page.goto('/not-a-real-public-route');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
});

test('home, help and trust routes have no serious automated accessibility violations', async ({ page }) => {
  for (const route of ['/', '/help', '/trust']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || '')).map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
  }
});
