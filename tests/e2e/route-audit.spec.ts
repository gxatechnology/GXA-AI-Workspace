import { test } from '@playwright/test';

const routes = [
  ['home-dashboard', 'home'],
  ['new-create', 'home'],
  ['ai-writer', 'ai-writing'],
  ['ai-chat', 'ai-chat'],
  ['grammar-checker', 'grammar'],
  ['paraphraser', 'paraphrasing'],
  ['summarizer', 'summarizer'],
  ['translator', 'translation'],
  ['pricing', 'pricing'],
  ['prompt-library', 'prompts'],
  ['template-selection', 'templates'],
  ['projects-guest', 'projects'],
] as const;

const viewports = [
  ['1440x1000', 1440, 1000],
  ['1280x800', 1280, 800],
  ['1024x768', 1024, 768],
  ['768x1024', 768, 1024],
  ['430x932', 430, 932],
  ['390x844', 390, 844],
  ['360x800', 360, 800],
] as const;

test('capture the audited public route matrix', async ({ page }) => {
  test.setTimeout(240_000);
  for (const [viewport, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    for (const [label, route] of routes) {
      await page.goto(`/#/${route}?route-audit=${viewport}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(350);
      await page.screenshot({ path: `artifacts/ux-audit/after/matrix/${label}-${viewport}.png`, animations: 'disabled' });
    }
  }
});
