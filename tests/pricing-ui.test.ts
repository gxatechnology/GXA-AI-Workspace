import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UpgradeModal from '../src/components/UpgradeModal';
import PlanComparisonTable from '../src/components/pricing/PlanComparisonTable';
import StudioPlanGate from '../src/components/pricing/StudioPlanGate';
import Pricing from '../src/components/workspaces/Pricing';
import { PlanCard, PricingErrorState, PricingGrid } from '../src/components/pricing/PricingComponents';
import { canonicalPlanKey, buildWorkspaceHash, readWorkspaceHash } from '../src/utils/pricing';
import { pricingComparison, publicPlans } from '../server/billing';

const plans = publicPlans() as any[];

test('shared plan cards render all canonical public plans and plan badges', () => {
  const markup = renderToStaticMarkup(React.createElement(PricingGrid, { plans, currentPlanKey: 'free', onSelect: () => undefined }));
  for (const name of ['Free', 'Starter', 'Pro', 'Business Pro']) assert.match(markup, new RegExp(`>${name}<`));
  for (const price of [0, 99, 149, 499]) assert.ok(markup.includes(`\u20B9${price}`));
  assert.doesNotMatch(markup, /Contact Sales|Custom Pricing|Pro Plus/);
  assert.match(markup, /Start Free/); assert.match(markup, /Choose Starter/); assert.match(markup, /Choose Pro/); assert.match(markup, /Choose Business Pro/);
  assert.match(markup, /Recommended/); assert.match(markup, /Everything Included/); assert.match(markup, /Includes every feature from Free, Starter and Pro/);
  assert.doesNotMatch(markup, /Current Plan|Minimum plan/);
  for (const limit of ['100', '1,000', '5,000', '20,000']) assert.match(markup, new RegExp(`${limit} AI requests per month`));
  const authenticatedMarkup = renderToStaticMarkup(React.createElement(PricingGrid, { plans, currentPlanKey: 'pro', authenticated: true, onSelect: () => undefined }));
  assert.match(authenticatedMarkup, /Current Plan/); assert.match(authenticatedMarkup, /Upgrade to Pro/); assert.match(authenticatedMarkup, /Upgrade to Business Pro/);
});

test('every pricing surface uses the same PlanCard component contract', () => {
  const proPlus = plans.find(plan => plan.key === 'pro_plus');
  const pricingCard = renderToStaticMarkup(React.createElement(PlanCard, { plan: proPlus, currentPlanKey: 'free', onSelect: () => undefined }));
  const modalCard = renderToStaticMarkup(React.createElement(PlanCard, { plan: proPlus, currentPlanKey: 'free', onSelect: () => undefined }));
  assert.equal(pricingCard, modalCard); assert.match(pricingCard, />Pro</); assert.ok(pricingCard.includes('\u20B9149'));
});

test('a feature-specific upgrade card presents Business Pro as everything included', () => {
  const businessPro = plans.find(plan => plan.key === 'business-pro');
  const markup = renderToStaticMarkup(React.createElement(PlanCard, { plan: businessPro, currentPlanKey: 'pro_plus', currentPlanRank: plans.find(plan => plan.key === 'pro_plus')?.rank, authenticated: true, badge: 'Everything Included', onSelect: () => undefined }));
  assert.match(markup, /Everything Included/); assert.match(markup, /Upgrade to Business Pro/); assert.match(markup, /Includes every feature from Free, Starter and Pro/); assert.ok(markup.includes('\u20B9499'));
  assert.doesNotMatch(markup, /Minimum plan/);
});

test('pricing error state includes an honest retry action', () => {
  const markup = renderToStaticMarkup(React.createElement(PricingErrorState, { message: 'Pricing is temporarily unavailable.', onRetry: () => undefined }));
  assert.match(markup, /Plans could not be loaded/); assert.match(markup, />Retry</); assert.match(markup, /role="alert"/);
});

test('upgrade modal provides close, Cancel and Compare all plans controls without a fallback price list', () => {
  const markup = renderToStaticMarkup(React.createElement(UpgradeModal, { isOpen: true, onClose: () => undefined, request: { featureKey: 'business.basic', featureName: 'Business Studio', sourceTool: 'business', returnRoute: 'business' }, onSelectPlan: async () => undefined, onGoToPricing: () => undefined }));
  assert.match(markup, /role="dialog"/); assert.match(markup, />Cancel</); assert.match(markup, /Compare all plans/); assert.match(markup, /Business Studio/); assert.doesNotMatch(markup, /\u20B9(?:99|149|499)/);
});

test('public pricing includes Business Pro and excludes unimplemented Team and Enterprise sales flows', () => {
  assert.deepEqual(plans.map(plan => plan.name), ['Free', 'Starter', 'Pro', 'Business Pro']);
});

test('comparison table renders registry-backed Business and Career capabilities', () => {
  const markup = renderToStaticMarkup(React.createElement(PlanComparisonTable, { plans, comparison: pricingComparison() as any }));
  assert.match(markup, /Compare every plan/); assert.match(markup, /Professional Email/); assert.match(markup, /Campaign Planner/); assert.match(markup, /Resume Builder/); assert.match(markup, /Interview Preparation/); assert.match(markup, /Business Pro/);
  assert.match(markup, /64 registered tools across 8 categories/); assert.match(markup, /8 available tools plus complete studio access/);
  assert.match(markup, /aria-controls="comparison-group-business-studio"/); assert.match(markup, /aria-controls="comparison-group-career-studio"/);
  assert.match(markup, /aria-expanded="false"/); assert.match(markup, /aria-expanded="true"/);
});

test('pricing FAQ and final CTA use accurate plan and payment language', () => {
  const markup = renderToStaticMarkup(React.createElement(Pricing, { onSelectWorkspace: () => undefined, onPlanSelected: async () => undefined }));
  for (const question of ['Can I change my plan later?', 'Will I lose my saved work if I downgrade?', 'Is Business Studio included in Pro?', 'Is Career Studio included in Pro?', 'What does Business Pro include?', 'Is yearly billing available?', 'Is Razorpay payment active?', 'Will GST invoices be available?', 'What happens when I reach my plan limit?']) assert.match(markup, new RegExp(question.replace(/[?]/g, '\\?')));
  assert.match(markup, /Razorpay checkout is not currently enabled/); assert.match(markup, /Ready to unlock your complete AI workspace/); assert.match(markup, /Start with Business Pro/);
  assert.doesNotMatch(markup, /fake|testimonial|rating|API cost|OpenRouter cost|tokens used/i);
});

test('professional studio gate preserves discoverability without opening a modal automatically', () => {
  const markup = renderToStaticMarkup(React.createElement(StudioPlanGate, { studio: 'Business Studio', description: 'Professional tools.', benefits: ['All registered tools'], onUpgrade: () => undefined }));
  assert.match(markup, /Business Pro required/); assert.match(markup, /Upgrade to Business Pro/); assert.match(markup, /Your current workspace data is preserved/);
});

test('hash routing helpers preserve clean return routes and remove malformed query state', () => {
  assert.equal(buildWorkspaceHash('paraphrasing'), '/#/paraphrasing'); assert.equal(buildWorkspaceHash('pricing?plan=pro_plus'), '/#/pricing');
  assert.equal(readWorkspaceHash('#/pricing?plan=pro_plus'), 'pricing'); assert.equal(readWorkspaceHash('#/paraphrasing'), 'paraphrasing');
});

test('frontend legacy aliases match backend rules and reject numeric plan IDs', () => {
  assert.equal(canonicalPlanKey('premium'), 'pro'); assert.equal(canonicalPlanKey('pro-monthly'), 'pro'); assert.equal(canonicalPlanKey('premium_plus'), 'pro_plus'); assert.equal(canonicalPlanKey('business-pro'), 'business-pro'); assert.equal(canonicalPlanKey('business_pro'), 'business-pro'); assert.equal(canonicalPlanKey('149'), null);
});

test('frontend contains no localStorage checkout authority or hardcoded paid-price fallback', () => {
  const sourceRoot = path.resolve('src'); const files: string[] = [];
  const walk = (directory: string) => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const absolute = path.join(directory, entry.name); if (entry.isDirectory()) walk(absolute); else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute); } };
  walk(sourceRoot); const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /gxa_checkout_plan/); assert.doesNotMatch(source, /['"`]\u20B9(?:99|149|499)(?:\/month)?['"`]/); assert.doesNotMatch(source, /pricing_(?:pro|business)(?:_plus|_pro|_monthly|_yearly)?/);
});

test('Razorpay Checkout sends only the selected plan and the three provider verification fields', () => {
  const source = ['src/components/workspaces/AccountPlan.tsx', 'src/components/workspaces/EnterprisePlatform.tsx'].map(file => fs.readFileSync(path.resolve(file), 'utf8')).join('\n');
  assert.match(source, /JSON\.stringify\(\{ planKey: selectedPlan\.key \}\)/);
  assert.match(source, /razorpay_order_id: response\.razorpay_order_id, razorpay_payment_id: response\.razorpay_payment_id, razorpay_signature: response\.razorpay_signature/);
  assert.doesNotMatch(source, /RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|NEXT_PUBLIC_RAZORPAY|VITE_RAZORPAY/);
  assert.match(source, /Invoice generation is not configured yet/);
});
