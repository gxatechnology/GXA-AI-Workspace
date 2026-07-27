import { expect, test, type Page } from '@playwright/test';

const viewports = [
  ['1440x1000', 1440, 1000],
  ['1280x800', 1280, 800],
  ['1024x768', 1024, 768],
  ['768x1024', 768, 1024],
  ['430x932', 430, 932],
  ['390x844', 390, 844],
  ['360x800', 360, 800],
] as const;

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: 'gxa_theme', value: theme });
}

async function openTranslator(page: Page) {
  await page.goto('/#/translation');
  await expect(page.getByRole('heading', { name: 'Translation Studio', level: 1 })).toBeVisible();
}

async function openGrammar(page: Page) {
  await page.goto('/#/grammar');
  await expect(page.getByRole('heading', { name: 'Grammar Checker', level: 1 })).toBeVisible();
}

for (const [name, width, height] of viewports) {
  test(`dark Translator at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await setTheme(page, 'dark');
    await openTranslator(page);
    await expect(page).toHaveScreenshot(`translator-dark-${name}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });
}

test.describe('theme and export states', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Translator light theme', async ({ page }) => {
    await setTheme(page, 'light');
    await openTranslator(page);
    await expect(page).toHaveScreenshot('translator-light-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });

  test('Grammar light theme', async ({ page }) => {
    await setTheme(page, 'light');
    await openGrammar(page);
    await expect(page).toHaveScreenshot('grammar-light-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });

  test('Grammar dark theme', async ({ page }) => {
    await setTheme(page, 'dark');
    await openGrammar(page);
    await expect(page).toHaveScreenshot('grammar-dark-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });

  test('Export menu open and hovered in light theme', async ({ page }) => {
    await setTheme(page, 'light');
    await openGrammar(page);
    const trigger = page.getByRole('button', { name: 'Export revision', exact: true });
    await trigger.click();
    await expect(page).toHaveScreenshot('grammar-export-open-light-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    await page.getByRole('menuitem', { name: 'Markdown (MD)' }).hover();
    await expect(page).toHaveScreenshot('grammar-export-hovered-light-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });

  test('Export menu focused in dark theme', async ({ page }) => {
    await setTheme(page, 'dark');
    await openGrammar(page);
    const trigger = page.getByRole('button', { name: 'Export revision', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    await page.getByRole('menuitem', { name: 'Plain Text (TXT)' }).press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Markdown (MD)' })).toBeFocused();
    await expect(page).toHaveScreenshot('grammar-export-focused-dark-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });
});

test('mobile Export menu in dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setTheme(page, 'dark');
  await openGrammar(page);
  await page.getByRole('button', { name: 'Export revision', exact: true }).click();
  await expect(page).toHaveScreenshot('grammar-export-mobile-dark-390x844.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
});
