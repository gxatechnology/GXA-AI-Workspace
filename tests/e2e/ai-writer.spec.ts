import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const generatedText = '# Launch plan\n\nA clear, grounded draft for operations teams.\n\n## Next step\n\nReview the supplied facts before publishing.';

async function openWriter(page: Page) {
  await page.goto('/#/ai-writing');
  await expect(page.getByRole('heading', { name: 'AI Writer', level: 1 })).toBeVisible();
}

async function completeDefaultForm(page: Page) {
  await page.getByLabel('Writing instructions').fill('Create a launch plan using only the supplied product facts.');
  await page.getByLabel('Target audience').fill('Operations leaders');
}

async function mockWriter(page: Page, delay = 0) {
  await page.route('**/api/writer/generate', async route => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    const payload = request.postDataJSON();
    expect(payload.templateId).toBe('ai-writer');
    expect(payload.fields.topic).toContain('launch plan');
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: generatedText, templateId: 'ai-writer', mode: 'generate', words: 20, requestId: payload.requestId, usage: { writer_generations: 1 } }),
    });
  });
}

const generateButton = (page: Page) => page.getByRole('button', { name: /^Generate(?: AI Writer)?$/ }).first();

async function authenticate(page: Page) {
  const email = `writer-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const response = await page.request.post('/api/auth/register', { data: { name: 'Writer E2E', email, password: 'Testing!2345' } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  await page.addInitScript(user => localStorage.setItem('gxa_user', JSON.stringify(user)), body.user);
}

test('initial workspace exposes a compact editor and honest empty preview', async ({ page }) => {
  await openWriter(page);
  await expect(page.getByText('Guest draft · not saved')).toBeVisible();
  await expect(page.getByText('0/2 required').first()).toBeVisible();
  await expect(generateButton(page)).toBeVisible();
  await expect(page.getByText('Secure Server-Routed AI')).toHaveCount(0);
  await expect(page.getByText('Backend generation')).toHaveCount(0);
});

test('template search, preview, selection and keyboard dismissal work', async ({ page }) => {
  await openWriter(page);
  await page.getByPlaceholder('Search templates').fill('Story Writer');
  await page.getByRole('button', { name: 'Preview' }).click();
  const dialog = page.getByRole('dialog', { name: 'Story Writer' });
  await expect(dialog.getByText('Genre')).toBeVisible();
  await expect(dialog.getByText('Story premise')).toBeVisible();
  await expect(dialog.getByText('Target audience')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Preview' }).click();
  await dialog.getByRole('button', { name: /Use this template/ }).click();
  await expect(page.getByLabel('Genre')).toBeVisible();
  await expect(page.getByLabel('Story premise')).toBeVisible();
});

test('validation lists exact errors, focuses the first field and clears stale errors', async ({ page }) => {
  await openWriter(page);
  await generateButton(page).click();
  const summary = page.getByRole('alert', { name: 'Please complete 2 required fields.' });
  await expect(summary).toContainText('Writing instructions is required.');
  await expect(summary).toContainText('Target audience is required.');
  await expect(page.getByLabel('Writing instructions')).toBeFocused();
  await expect(page.getByLabel('Writing instructions')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Writing instructions').fill('Create a concise launch plan.');
  await expect(page.getByText('Writing instructions is required.')).toHaveCount(0);
  await expect(page.getByText('Target audience is required.')).toBeVisible();
  await page.getByLabel('Target audience').fill('Operations leaders');
  await expect(page.getByText('Target audience is required.')).toHaveCount(0);
});

test('a valid request shows generating and result preview states', async ({ page }) => {
  await mockWriter(page, 600);
  await openWriter(page);
  await completeDefaultForm(page);
  await generateButton(page).click();
  await expect(page.getByRole('heading', { name: 'Generating AI Writer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop generation' })).toBeVisible();
  await expect(page.getByLabel('Generated draft')).toHaveValue(generatedText);
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible();
  await expect(page.getByText(/words · 1 min read/)).toBeVisible();
});

test('backend field errors map to controls and preserve a valid form', async ({ page }) => {
  await page.route('**/api/writer/generate', route => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Please correct 2 fields.', code: 'VALIDATION_ERROR', fields: { topic: 'Writing instructions need more detail.', audienceDetails: 'Choose a specific audience.' } }),
  }));
  await openWriter(page);
  await completeDefaultForm(page);
  await generateButton(page).click();
  await expect(page.locator('#writer-topic-error')).toHaveText('Writing instructions need more detail.');
  await expect(page.locator('#writer-audienceDetails-error')).toHaveText('Choose a specific audience.');
  await expect(page.getByLabel('Writing instructions')).toHaveValue('Create a launch plan using only the supplied product facts.');
  await expect(page.getByLabel('Writing instructions')).toBeFocused();
});

test('provider-unavailable errors keep form input safe and actionable', async ({ page }) => {
  await page.route('**/api/writer/generate', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'AI is temporarily unavailable. Try again shortly.', code: 'PROVIDER_UNAVAILABLE' }) }));
  await openWriter(page);
  await completeDefaultForm(page);
  await generateButton(page).click();
  await expect(page.getByRole('alert')).toContainText('AI is temporarily unavailable');
  await expect(page.getByLabel('Target audience')).toHaveValue('Operations leaders');
});

test('locked templates enter the centralized upgrade flow without losing work', async ({ page }) => {
  await openWriter(page);
  await page.getByLabel('Writing instructions').fill('Preserve this draft');
  await page.getByRole('button', { name: 'pro', exact: true }).click();
  await page.getByPlaceholder('Search templates').fill('Google Ads Copy');
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: 'Compare plans for Pro' }).click();
  await expect(page.getByRole('dialog')).toContainText(/upgrade|plan/i);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Writing instructions')).toHaveValue('Preserve this draft');
});

test('prompt library and project actions explain guest behavior', async ({ page }) => {
  await openWriter(page);
  await page.getByRole('button', { name: 'Prompt Library' }).click();
  await expect(page.getByRole('dialog', { name: 'Prompt Library' })).toContainText('Sign in to save prompts');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'New Project' }).click();
  await expect(page.getByRole('alert')).toContainText('Log in or register to create a project');
});

test('authenticated prompt saving and project assignment use real workspace state', async ({ page }) => {
  await authenticate(page);
  await openWriter(page);
  await expect(page.getByText(/Autosave ready|Saved/)).toBeVisible();
  await page.getByRole('button', { name: 'Prompt Library' }).click();
  await page.getByLabel('Prompt title').fill('Verified voice rules');
  await page.getByLabel('Reusable instructions').fill('Use concise sentences and preserve supplied numbers.');
  await page.getByRole('button', { name: 'Save prompt' }).click();
  await page.getByRole('button', { name: 'Prompt Library' }).click();
  await expect(page.getByText('Verified voice rules')).toBeVisible();
  await page.getByRole('button', { name: 'Use in this draft' }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByLabel('Project name').fill('Writer UX release');
  await page.getByRole('button', { name: 'Create and select project' }).click();
  await expect(page.getByLabel('Project assignment')).toContainText('Writer UX release');
});

test('guest-only routes are guarded and authentication errors are associated', async ({ page }) => {
  await page.goto('/#/projects');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toContainText('Please enter your email address.');
  await expect(page.getByLabel('Email Address')).toHaveAttribute('aria-describedby', 'auth-form-error');
  await page.goto('/#/ai-writing');
  await expect(page.getByRole('heading', { name: 'AI Writer', level: 1 })).toBeVisible();
});

test('mobile workspace has no page-level horizontal overflow and keeps Generate reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWriter(page);
  await expect(page.getByRole('tab', { name: /Editor/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Generate AI Writer' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('AI Writer has no serious automated accessibility violations', async ({ page }) => {
  await openWriter(page);
  const results = await new AxeBuilder({ page }).include('.writer-workspace').analyze();
  expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});
