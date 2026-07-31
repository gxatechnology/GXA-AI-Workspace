import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UpgradeModal from '../src/components/UpgradeModal';
import { PlanCard, PricingErrorState, PricingGrid } from '../src/components/pricing/PricingComponents';
import { canonicalPlanKey, buildWorkspaceHash, readWorkspaceHash } from '../src/utils/pricing';
import { publicPlans } from '../server/billing';

const plans = publicPlans() as any[];

test('shared plan cards render the canonical names, prices and current/recommended badges', () => {
  const markup = renderToStaticMarkup(React.createElement(PricingGrid, { plans, currentPlanKey: 'free', onSelect: () => undefined }));
  assert.match(markup, />Free</); assert.match(markup, />Starter</); assert.match(markup, />Pro</); assert.doesNotMatch(markup, />Pro Plus</); assert.match(markup, /₹0/); assert.match(markup, /₹99/); assert.match(markup, /₹149/); assert.doesNotMatch(markup, /Contact Sales|Custom Pricing/); assert.match(markup, /Current Plan/); assert.match(markup, /Recommended/);
  assert.match(markup, /100 AI requests per month/); assert.match(markup, /1,000 AI requests per month/); assert.match(markup, /5,000 AI requests per month/);
});

test('every pricing surface uses the same PlanCard component contract', () => {
  const proPlus = plans.find(plan => plan.key === 'pro_plus');
  const pricingCard = renderToStaticMarkup(React.createElement(PlanCard, { plan: proPlus, currentPlanKey: 'free', onSelect: () => undefined }));
  const modalCard = renderToStaticMarkup(React.createElement(PlanCard, { plan: proPlus, currentPlanKey: 'free', onSelect: () => undefined }));
  assert.equal(pricingCard, modalCard); assert.match(pricingCard, />Pro</); assert.match(pricingCard, /₹149/);
});

test('a feature-specific upgrade card identifies the minimum eligible plan', () => {
  const proPlus = plans.find(plan => plan.key === 'pro_plus');
  const markup = renderToStaticMarkup(React.createElement(PlanCard, { plan: proPlus, currentPlanKey: 'free', badge: 'Minimum plan', onSelect: () => undefined }));
  assert.match(markup, /Minimum plan/); assert.match(markup, /Upgrade to Pro/); assert.ok(markup.includes(`\u20B9149`));
});

test('pricing error state includes an honest retry action', () => {
  const markup = renderToStaticMarkup(React.createElement(PricingErrorState, { message: 'Pricing is temporarily unavailable.', onRetry: () => undefined }));
  assert.match(markup, /Plans could not be loaded/); assert.match(markup, />Retry</); assert.match(markup, /role="alert"/);
});

test('upgrade modal provides close, Continue with Free and Compare Plans controls without a fallback price list', () => {
  const markup = renderToStaticMarkup(React.createElement(UpgradeModal, { isOpen: true, onClose: () => undefined, request: { featureKey: 'paraphraser.premium_modes', featureName: 'premium paraphrasing modes', sourceTool: 'paraphraser', returnRoute: 'paraphrasing' }, onSelectPlan: async () => undefined, onGoToPricing: () => undefined }));
  assert.match(markup, /role="dialog"/); assert.match(markup, /Continue with Free/); assert.match(markup, /Compare Plans/); assert.match(markup, /premium paraphrasing modes/); assert.doesNotMatch(markup, /₹99|₹149/);
});

test('Phase 1 pricing excludes unimplemented Team and Enterprise sales flows', () => {
  assert.deepEqual(plans.map(plan => plan.name), ['Free', 'Starter', 'Pro']);
});

test('hash routing helpers preserve clean return routes and remove malformed query state', () => {
  assert.equal(buildWorkspaceHash('paraphrasing'), '/#/paraphrasing'); assert.equal(buildWorkspaceHash('pricing?plan=pro_plus'), '/#/pricing');
  assert.equal(readWorkspaceHash('#/pricing?plan=pro_plus'), 'pricing'); assert.equal(readWorkspaceHash('#/paraphrasing'), 'paraphrasing');
});

test('frontend legacy aliases match backend rules and reject numeric plan IDs', () => {
  assert.equal(canonicalPlanKey('premium'), 'pro'); assert.equal(canonicalPlanKey('pro-monthly'), 'pro'); assert.equal(canonicalPlanKey('premium_plus'), 'pro_plus'); assert.equal(canonicalPlanKey('149'), null);
});

test('frontend contains no localStorage checkout authority or hardcoded paid-price fallback', () => {
  const sourceRoot = path.resolve('src'); const files: string[] = [];
  const walk = (directory: string) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const absolute = path.join(directory, entry.name); if (entry.isDirectory()) walk(absolute); else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute); } };
  walk(sourceRoot); const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /gxa_checkout_plan/); assert.doesNotMatch(source, /['"`]₹99(?:\/month)?['"`]/); assert.doesNotMatch(source, /['"`]₹149(?:\/month)?['"`]/); assert.doesNotMatch(source, /pricing_pro(?:_plus|_monthly|_yearly)?/);
});
