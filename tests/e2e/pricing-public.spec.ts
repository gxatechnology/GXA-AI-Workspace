import { expect, test } from '@playwright/test';

test('logged-out pricing uses the production API and renders all four public plans', async ({ page }) => {
  const blockingErrors: string[] = [];
  page.on('pageerror', error => {
    if (!error.message.includes('WebSocket closed without opened')) blockingErrors.push(error.message);
  });
  page.on('response', response => {
    if (response.status() >= 500) blockingErrors.push(`${response.status()} ${response.url()}`);
  });
  const pricingResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/pricing/plans');
  await page.goto('/#/pricing');

  const response = await pricingResponse;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.plans.map((plan: any) => ({ name: plan.name, monthlyPrice: plan.monthlyPrice }))).toEqual([
    { name: 'Free', monthlyPrice: 0 },
    { name: 'Starter', monthlyPrice: 99 },
    { name: 'Pro', monthlyPrice: 149 },
    { name: 'Business Pro', monthlyPrice: 499 },
  ]);
  expect(payload.comparison.generatedFrom).toEqual(['plan_registry', 'business_tool_registry', 'career_tool_registry']);

  for (const name of ['Free', 'Starter', 'Pro', 'Business Pro']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('Includes every feature from Free, Starter and Pro.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Free', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Starter', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Pro', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose Business Pro', exact: true })).toBeVisible();
  for (const price of ['₹0', '₹99', '₹149', '₹499']) await expect(page.getByText(price, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare every plan' })).toBeVisible();
  const comparison = page.getByRole('table', { name: 'Feature comparison for all public GXA AI Workspace plans' });
  const businessGroup = comparison.getByRole('button', { name: /Business Studio 64 registered tools across 8 categories/ });
  const careerGroup = comparison.getByRole('button', { name: /Career Studio 8 available tools plus complete studio access/ });
  await expect(businessGroup).toHaveAttribute('aria-expanded', 'false');
  await expect(careerGroup).toHaveAttribute('aria-expanded', 'false');
  await businessGroup.click();
  await expect(comparison.getByText('Professional Email', { exact: true })).toBeVisible();
  await expect(comparison.getByText('Campaign Planner', { exact: true })).toBeVisible();
  await careerGroup.click();
  await expect(comparison.getByText('Resume Builder', { exact: true })).toBeVisible();
  await expect(comparison.getByText('Career Library', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pricing FAQ' })).toBeVisible();
  await expect(page.getByText('Ready to unlock your complete AI workspace?', { exact: true })).toBeVisible();
  await expect(page.getByText('Plans could not be loaded.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible();
  expect(blockingErrors).toEqual([]);
});

test('Business and Career Studios remain discoverable but require Business Pro', async ({ page }) => {
  await page.goto('/#/business');
  await expect(page.getByRole('heading', { name: 'Unlock Business Studio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upgrade to Business Pro' })).toBeVisible();
  const businessResponse = await page.request.get('/api/business/config');
  expect(businessResponse.status()).toBe(403);
  expect((await businessResponse.json()).minimumPlanKey).toBe('business-pro');

  const gateResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/pricing/features/business.basic');
  await page.getByRole('button', { name: 'Upgrade to Business Pro' }).click();
  expect((await gateResponse).status()).toBe(200);
  const businessGate = await (await gateResponse).json();
  expect(businessGate.eligibleUpgradePlans.map((plan: any) => ({ key: plan.key, monthlyPrice: plan.monthlyPrice }))).toEqual([{ key: 'business-pro', monthlyPrice: 499 }]);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Unlock Business Studio' })).toBeVisible();
  await expect(dialog.getByText('Business Pro is required to access Business Studio and all professional business tools.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Business Pro', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('₹499/month', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Starter', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('heading', { name: 'Pro', exact: true })).toHaveCount(0);
  await expect(dialog.getByText('Everything Included', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Includes every feature from Free, Starter and Pro.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Complete Business Studio', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('Complete Career Studio', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('No eligible upgrade plan is currently available.', { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Compare all plans' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await page.goto('/#/career');
  await expect(page.getByRole('heading', { name: 'Unlock Career Studio' })).toBeVisible();
  const careerGateResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/pricing/features/career.basic');
  await page.getByRole('button', { name: 'Upgrade to Business Pro' }).click();
  expect((await careerGateResponse).status()).toBe(200);
  const careerGate = await (await careerGateResponse).json();
  expect(careerGate.eligibleUpgradePlans.map((plan: any) => ({ key: plan.key, monthlyPrice: plan.monthlyPrice }))).toEqual([{ key: 'business-pro', monthlyPrice: 499 }]);
  const careerDialog = page.getByRole('dialog');
  await expect(careerDialog.getByRole('heading', { name: 'Unlock Career Studio' })).toBeVisible();
  await expect(careerDialog.getByText('Business Pro is required to access Resume Builder, ATS Guidance, Cover Letters, Interview Preparation and Career Studio.', { exact: true })).toBeVisible();
  await expect(careerDialog.getByRole('heading', { name: 'Starter', exact: true })).toHaveCount(0);
  await expect(careerDialog.getByRole('heading', { name: 'Pro', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const careerResponse = await page.request.get('/api/career/config');
  expect(careerResponse.status()).toBe(403);
  expect((await careerResponse.json()).minimumPlanKey).toBe('business-pro');
  const resumeGate = await page.request.get('/api/pricing/features/career.resume_builder');
  expect(resumeGate.status()).toBe(200);
  expect((await resumeGate.json()).eligibleUpgradePlans.map((plan: any) => ({ key: plan.key, monthlyPrice: plan.monthlyPrice }))).toEqual([{ key: 'business-pro', monthlyPrice: 499 }]);
});

test('Pricing stays responsive on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/pricing');
  await expect(page.getByRole('heading', { name: 'Business Pro', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole('table')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('gxa_theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Choose Business Pro', exact: true })).toBeVisible();
});

test('Business Pro modal remains usable at 100, 125 and 150 percent zoom', async ({ page }) => {
  for (const viewport of [
    { zoom: 100, width: 1280, height: 800 },
    { zoom: 125, width: 1024, height: 640 },
    { zoom: 150, width: 853, height: 533 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/#/business');
    await page.getByRole('button', { name: 'Upgrade to Business Pro' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Unlock Business Studio' })).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    const primary = dialog.getByRole('button', { name: 'Upgrade to Business Pro' });
    await primary.scrollIntoViewIfNeeded();
    await expect(primary).toBeVisible();
    const compare = dialog.getByRole('button', { name: 'Compare all plans' });
    await compare.scrollIntoViewIfNeeded();
    await expect(compare).toBeVisible();
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    await cancel.scrollIntoViewIfNeeded();
    await expect(cancel).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

test('Business Pro opens Business and Career Studios without an upgrade modal', async ({ page }) => {
  const pricing = await (await page.request.get('/api/pricing/plans')).json();
  const businessPro = pricing.plans.find((plan: any) => plan.key === 'business-pro');
  const user = { id: 'business-pro-e2e', name: 'Business Pro User', email: 'business-pro-e2e@example.test', subscription: 'business-pro', sessionToken: 'cookie-session' };
  await page.addInitScript(value => localStorage.setItem('gxa_user', JSON.stringify(value)), user);
  await page.route('**/api/auth/profile', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user }) }));
  await page.route('**/api/billing/current-plan', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ plan: businessPro, currentPlanKey: 'business-pro', subscriptionStatus: 'active', currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, entitlements: {}, limits: businessPro.limits }),
  }));

  await page.goto('/#/business');
  await expect(page.getByRole('heading', { name: 'Business, Marketing and Communication Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unlock Business Studio' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/#/career');
  await expect(page.getByRole('heading', { name: 'Career Studio', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume Builder', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unlock Career Studio' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
