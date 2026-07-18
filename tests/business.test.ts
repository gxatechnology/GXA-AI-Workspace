import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBusinessEntitlement, buildBusinessPrompt, normalizeBrandKit,
  validateBusinessRequest, validateGeneratedOutput,
} from '../server/business.js';
import { BUSINESS_EXPORT_FORMATS, BUSINESS_TOOLS, EMAIL_MODES } from '../shared/businessRegistry.js';

test('central registry covers every studio category without duplicate IDs', () => {
  assert.equal(new Set(BUSINESS_TOOLS.map((tool) => tool.id)).size, BUSINESS_TOOLS.length);
  for (const category of ['Email', 'Marketing', 'Social', 'Commerce', 'Proposals', 'Reports', 'Operations', 'Planning']) {
    assert.ok(BUSINESS_TOOLS.some((tool) => tool.category === category), `${category} is missing`);
  }
  for (const id of ['professional-email', 'google-search-ads', 'performance-max', 'meta-ads', 'pinterest', 'youtube-community', 'google-business-profile', 'proposal', 'quotation', 'sop', 'annual-report', 'content-calendar']) {
    assert.ok(BUSINESS_TOOLS.some((tool) => tool.id === id), `${id} is missing`);
  }
  assert.ok(EMAIL_MODES.includes('Cold Outreach'));
  assert.deepEqual(BUSINESS_EXPORT_FORMATS, ['docx', 'pdf', 'md', 'html', 'txt']);
});

test('guest access and premium entitlements derive from the central tool configuration', () => {
  const freeTool = BUSINESS_TOOLS.find((tool) => tool.id === 'professional-email')!;
  const premiumTool = BUSINESS_TOOLS.find((tool) => tool.id === 'proposal')!;
  assert.equal(freeTool.guestAccess, true);
  assert.equal(premiumTool.guestAccess, false);
  assert.doesNotThrow(() => assertBusinessEntitlement(freeTool, 'free'));
  assert.throws(() => assertBusinessEntitlement(premiumTool, 'free'), /Pro plan/);
  assert.doesNotThrow(() => assertBusinessEntitlement(premiumTool, 'pro'));
});

test('Brand Kits are owner-bound, complete, and require a company name', () => {
  assert.throws(() => normalizeBrandKit({}, 'owner-a'), /Company name/);
  const kit = normalizeBrandKit({ ownerId: 'attacker', companyName: 'GXA', blockedWords: ['cheap'], glossary: 'MSP: managed service provider' }, 'owner-a');
  assert.equal(kit.ownerId, 'owner-a');
  assert.deepEqual(kit.blockedWords, ['cheap']);
  assert.match(kit.glossary, /managed service provider/);
});

test('business validation rejects unknown tools, missing briefs, and oversized briefs', () => {
  assert.throws(() => validateBusinessRequest({ toolId: 'fake', brief: 'facts' }), /configured/);
  assert.throws(() => validateBusinessRequest({ toolId: 'proposal', brief: '' }), /factual brief/);
  assert.throws(() => validateBusinessRequest({ toolId: 'proposal', brief: 'x'.repeat(101) }, 100), /characters/);
});

test('proposal prompts prohibit invented pricing and preserve supplied scope controls', () => {
  const request = validateBusinessRequest({
    toolId: 'proposal', brief: 'Develop a plan for supplied requirements.', budget: 'INR 50,000 provided by client',
    timeline: 'Six weeks', deliverables: 'Discovery and implementation', assumptions: 'Client supplies access', exclusions: 'Hosting fees',
  });
  const built = buildBusinessPrompt(request);
  assert.match(built.systemInstruction, /Never invent clients, prices/);
  assert.match(built.prompt, /INR 50,000 provided by client/);
  assert.match(built.prompt, /Client supplies access/);
  assert.match(built.prompt, /Hosting fees/);
});

test('legal drafting is explicitly informational only', () => {
  const built = buildBusinessPrompt(validateBusinessRequest({ toolId: 'legal-letter', brief: 'Draft a notice from supplied facts.' }));
  assert.match(built.systemInstruction, /not legal advice/);
});

test('marketing prompts prohibit fake predictions, endorsements, and testimonials', () => {
  const built = buildBusinessPrompt(validateBusinessRequest({ toolId: 'marketing-campaign', brief: 'Launch the verified product features.' }));
  assert.match(built.systemInstruction, /Do not predict open rates, CTR, revenue/);
  assert.match(built.systemInstruction, /endorsements/);
  assert.match(built.systemInstruction, /Do not create a testimonial/);
});

test('social output receives configured platform controls and warnings', () => {
  const request = validateBusinessRequest({ toolId: 'x-post', brief: 'Announce the supplied product update.', emojiLevel: 'Light', hashtagSuggestions: true });
  const built = buildBusinessPrompt(request);
  assert.match(built.systemInstruction, /Target X/);
  assert.match(built.prompt, /SUGGEST HASHTAGS: true/);
  assert.match(validateGeneratedOutput('x'.repeat(281), [], 280).warnings[0], /platform limits/i);
});

test('blocked brand words are checked against real provider output', () => {
  assert.deepEqual(validateGeneratedOutput('A premium product', ['cheap']).warnings, []);
  assert.match(validateGeneratedOutput('A cheap product', ['cheap']).warnings[0], /Blocked brand words/);
});

test('provider keys, caller owner IDs, and caller Brand Kits never enter validated requests', () => {
  const request: any = validateBusinessRequest({
    toolId: 'professional-email', brief: 'Verified meeting details', apiKey: 'secret', ownerId: 'other',
    brandKit: { ownerId: 'other', companyName: 'Injected' },
  });
  assert.equal(request.apiKey, undefined);
  assert.equal(request.ownerId, undefined);
  assert.equal(request.brandKit, null);
});

test('private Brand Kit ownership metadata is removed from provider prompts', () => {
  const request = validateBusinessRequest({ toolId: 'professional-email', brief: 'Verified meeting details' });
  request.brandKit = normalizeBrandKit({ companyName: 'GXA' }, 'private-user-id');
  const prompt = buildBusinessPrompt(request).prompt;
  assert.doesNotMatch(prompt, /private-user-id|ownerId|createdAt|updatedAt/);
  assert.match(prompt, /GXA/);
});
