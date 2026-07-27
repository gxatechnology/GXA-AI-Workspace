import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const themeKey = 'gxa_theme';

async function startWithTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), { key: themeKey, value: theme });
}

async function openRoute(page: Page, route: string) {
  await page.goto(`/#/${route}`);
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function openGrammar(page: Page) {
  await openRoute(page, 'grammar');
  await expect(page.getByRole('heading', { name: 'Grammar Checker', level: 1 })).toBeVisible();
}

async function openTranslator(page: Page) {
  await openRoute(page, 'translation');
  await expect(page.getByRole('heading', { name: 'Translation Studio', level: 1 })).toBeVisible();
}

async function authenticate(page: Page) {
  const email = `theme-audit-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const response = await page.request.post('/api/auth/register', { data: { name: 'Theme Audit', email, password: 'Testing!2345' } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  await page.addInitScript(user => window.localStorage.setItem('gxa_user', JSON.stringify(user)), body.user);
}

test('theme switch applies to the document root and persists after reload', async ({ page }) => {
  await openTranslator(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Light theme', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Light theme', exact: true })).toBeVisible();
});

test('Translator dark mode uses dark surfaces without opacity or overlay leaks', async ({ page }) => {
  await startWithTheme(page, 'dark');
  await openTranslator(page);
  const styles = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color, opacity: style.opacity, border: style.borderColor };
    };
    return {
      main: read('main'),
      sidebar: read('aside'),
      surface: read('main section'),
      textarea: read('main textarea'),
      appOpacity: getComputedStyle(document.querySelector('.app-shell')!).opacity,
      visibleOverlays: Array.from(document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="inset-0"]')).filter(element => getComputedStyle(element).display !== 'none').length,
    };
  });
  expect(styles.main?.background).not.toBe('rgb(248, 250, 252)');
  expect(styles.sidebar?.background).not.toBe('rgb(255, 255, 255)');
  expect(styles.surface?.background).toBe('rgb(24, 24, 27)');
  expect(styles.textarea?.background).toBe('rgb(9, 9, 11)');
  expect(styles.textarea?.color).toBe('rgb(244, 244, 245)');
  expect(styles.appOpacity).toBe('1');
  expect(styles.visibleOverlays).toBe(0);
  await expect(page.getByLabel('Source language')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Translate', exact: true })).toBeDisabled();
  await expect(page.getByText('PDF text should be extracted in PDF Intelligence before translation.')).toBeVisible();
});

for (const route of ['home', 'paraphrasing', 'grammar', 'ai-chat', 'ai-writing', 'summarizer', 'translation', 'pdf-intelligence', 'pricing']) {
  test(`dark theme is applied consistently on ${route}`, async ({ page }) => {
    await startWithTheme(page, 'dark');
    await openRoute(page, route);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.app-shell')).toHaveCSS('opacity', '1');
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test('login and register surfaces inherit the persisted dark theme', async ({ page }) => {
  await startWithTheme(page, 'dark');
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Sign up free' }).click();
  await expect(page.getByRole('heading', { name: 'Create your Account' })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('authenticated Settings and Billing surfaces inherit the document dark theme', async ({ page }) => {
  await startWithTheme(page, 'dark');
  await authenticate(page);
  await openRoute(page, 'settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Security' })).toBeVisible();
  await openRoute(page, 'billing');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Usage & Billing' })).toBeVisible();
  await expect(page.getByText('Current plan')).toBeVisible();
});

test('upgrade dialog inherits dark tokens and closes with Escape', async ({ page }) => {
  await startWithTheme(page, 'dark');
  await openGrammar(page);
  const upgradeTrigger = page.getByRole('button', { name: /Advanced Style Diagnostics/ });
  await upgradeTrigger.click();
  const dialog = page.getByRole('dialog', { name: 'Upgrade your plan' });
  await expect(dialog).toBeVisible();
  const dialogBackground = await dialog.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(dialogBackground).not.toBe('rgb(255, 255, 255)');
  expect(dialogBackground).not.toBe('rgba(0, 0, 0, 0)');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(upgradeTrigger).toBeFocused();
});

test('Export opens by click, survives pointer transition, and closes outside', async ({ page }) => {
  await openGrammar(page);
  const trigger = page.getByRole('button', { name: 'Export revision', exact: true });
  const menu = page.getByRole('menu', { name: 'Export formats' });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  const itemBox = await page.getByRole('menuitem', { name: 'Plain Text (TXT)' }).boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(itemBox).not.toBeNull();
  if (triggerBox && itemBox) {
    await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
    await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height + 4);
    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
  }
  await expect(menu).toBeVisible();
  await page.getByRole('heading', { name: 'Grammar Checker', level: 1 }).click();
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('Export keyboard navigation supports arrows, Home, End, and Escape focus restoration', async ({ page }) => {
  await openGrammar(page);
  const trigger = page.getByRole('button', { name: 'Export revision', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  const textItem = page.getByRole('menuitem', { name: 'Plain Text (TXT)' });
  const markdownItem = page.getByRole('menuitem', { name: 'Markdown (MD)' });
  const pdfItem = page.getByRole('menuitem', { name: 'Acrobat (PDF)' });
  await expect(textItem).toBeFocused();
  await textItem.press('ArrowDown');
  await expect(markdownItem).toBeFocused();
  await markdownItem.press('End');
  await expect(pdfItem).toBeFocused();
  await pdfItem.press('Home');
  await expect(textItem).toBeFocused();
  await textItem.press('Escape');
  await expect(page.getByRole('menu', { name: 'Export formats' })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('selecting one export option downloads exactly once and closes the menu', async ({ page }) => {
  await openGrammar(page);
  let downloadCount = 0;
  page.on('download', () => { downloadCount += 1; });
  await page.getByRole('button', { name: 'Export revision', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Plain Text (TXT)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('grammar-checked-document.txt');
  await expect(page.getByRole('menu', { name: 'Export formats' })).toBeHidden();
  expect(downloadCount).toBe(1);
});

test('mobile Export opens by tap and stays inside the viewport in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithTheme(page, 'dark');
  await openGrammar(page);
  await page.getByRole('button', { name: 'Export revision', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Export formats' });
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('Export menu uses readable light and dark semantic surfaces', async ({ page }) => {
  await openGrammar(page);
  await page.getByRole('button', { name: 'Export revision', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Export formats' });
  const lightBackground = await menu.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole('menuitem', { name: 'Plain Text (TXT)' }).press('Escape');
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await page.getByRole('button', { name: 'Export revision', exact: true }).click();
  const darkBackground = await menu.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(lightBackground).toBe('rgb(255, 255, 255)');
  expect(darkBackground).toBe('rgb(39, 39, 42)');
});

test('Translator and Grammar dark themes have no serious accessibility violations', async ({ page }) => {
  await startWithTheme(page, 'dark');
  await openTranslator(page);
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  await openGrammar(page);
  await page.getByRole('button', { name: 'Export revision', exact: true }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});
