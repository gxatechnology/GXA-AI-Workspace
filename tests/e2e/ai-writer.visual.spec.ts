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

async function openWriter(page: Page) {
  await page.goto('/#/ai-writing');
  await expect(page.getByRole('heading', { name: 'AI Writer', level: 1 })).toBeVisible();
}

const generateButton = (page: Page) => page.getByRole('button', { name: /^Generate(?: AI Writer)?$/ }).first();

for (const [name, width, height] of viewports) {
  test(`empty Writer workspace at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openWriter(page);
    await expect(page).toHaveScreenshot(`ai-writer-empty-${name}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });
}

test.describe('deterministic Writer states', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('validation, completed form, generation, output and plan gate', async ({ page }) => {
    let resolveGeneration: (() => void) | undefined;
    const releaseGeneration = new Promise<void>(resolve => { resolveGeneration = resolve; });
    await page.route('**/api/writer/generate', async route => {
      await releaseGeneration;
      const payload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '# Launch plan\n\nA deterministic preview grounded in supplied facts.\n\n## Next step\n\nReview before publishing.', templateId: 'ai-writer', mode: 'generate', words: 17, requestId: payload.requestId, usage: { writer_generations: 1 } }) });
    });
    await openWriter(page);
    await generateButton(page).click();
    await expect(page).toHaveScreenshot('ai-writer-validation-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    await page.getByLabel('Writing instructions').fill('Create a concise product launch plan.');
    await page.getByLabel('Target audience').fill('Operations leaders');
    await expect(page).toHaveScreenshot('ai-writer-valid-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    await generateButton(page).click();
    await expect(page.getByRole('heading', { name: 'Generating AI Writer' })).toBeVisible();
    await expect(page).toHaveScreenshot('ai-writer-generating-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    resolveGeneration?.();
    await expect(page.getByLabel('Generated draft')).toBeVisible();
    await expect(page).toHaveScreenshot('ai-writer-result-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
    await page.getByRole('button', { name: 'pro', exact: true }).click();
    await page.getByPlaceholder('Search templates').fill('Google Ads Copy');
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page).toHaveScreenshot('ai-writer-pro-gate-1280x800.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });
});
