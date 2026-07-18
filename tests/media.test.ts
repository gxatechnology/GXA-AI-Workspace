import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertMediaEntitlement, buildEditPrompt, buildGeneratePrompt, buildVisionPrompt,
  normalizeMediaPlan, publicMediaTools, safeMediaAsset, validateEditRequest,
  validateGenerateRequest, validateImageData, validateVisionRequest,
} from '../server/media.js';
import { MEDIA_EXPORT_FORMATS, MEDIA_SECTIONS, MEDIA_TOOLS } from '../shared/mediaRegistry.js';

const png = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]).toString('base64')}`;

test('media registry has unique IDs and covers every requested studio section', () => {
  assert.equal(new Set(MEDIA_TOOLS.map((tool) => tool.id)).size, MEDIA_TOOLS.length);
  for (const section of MEDIA_SECTIONS) assert.ok(MEDIA_TOOLS.some((tool) => tool.section === section), `${section} is missing`);
  for (const id of ['image-generator', 'background-remove', 'ocr-handwriting', 'ocr-table', 'ocr-receipt', 'ocr-invoice', 'ocr-business-card', 'ocr-id', 'ocr-whiteboard', 'ocr-math', 'image-translate', 'chart-analysis', 'barcode', 'youtube-thumbnail', 'infographic', 'logo-concept', 'vector-mark']) {
    assert.ok(MEDIA_TOOLS.some((tool) => tool.id === id), `${id} is missing`);
  }
  assert.deepEqual(MEDIA_EXPORT_FORMATS, ['png', 'jpg', 'webp', 'svg', 'pdf']);
});

test('plan normalization and entitlements are backend-controlled', () => {
  assert.equal(normalizeMediaPlan('Enterprise'), 'pro_plus');
  assert.equal(normalizeMediaPlan('Pro'), 'pro');
  assert.equal(normalizeMediaPlan(undefined), 'free');
  const free = MEDIA_TOOLS.find((tool) => tool.id === 'image-generator')!;
  const pro = MEDIA_TOOLS.find((tool) => tool.id === 'background-remove')!;
  const plus = MEDIA_TOOLS.find((tool) => tool.id === 'ocr-id')!;
  assert.doesNotThrow(() => assertMediaEntitlement(free, 'free'));
  assert.throws(() => assertMediaEntitlement(pro, 'free'), /requires Pro/);
  assert.throws(() => assertMediaEntitlement(plus, 'pro'), /requires Pro Plus/);
  assert.doesNotThrow(() => assertMediaEntitlement(plus, 'pro_plus'));
});

test('image validation checks declared MIME, file signature, and configured size', () => {
  assert.equal(validateImageData(png).mimeType, 'image/png');
  assert.throws(() => validateImageData('data:image/jpeg;base64,AAAA'), /does not match/);
  assert.throws(() => validateImageData('data:image/gif;base64,R0lGODlh'), /PNG, JPEG or WebP/);
  assert.throws(() => validateImageData(png, 0.000001), /configured/);
});

test('generation validation rejects protected imitation and caps backend batch', () => {
  assert.throws(() => validateGenerateRequest({ toolId: 'logo-concept', prompt: 'copy this logo exactly like another brand' }, 'pro'), /original direction/);
  const request = validateGenerateRequest({ toolId: 'image-generator', prompt: 'An original teal workspace illustration', batch: 99, aspectRatio: '16:9', quality: '2K' }, 'free', 4000, 4);
  assert.equal(request.batch, 4);
  assert.equal(request.aspectRatio, '16:9');
  const built = buildGeneratePrompt(request, { ownerId: 'private-owner', companyName: 'GXA', brandColors: ['#0f766e'] });
  assert.doesNotMatch(built.prompt, /private-owner|ownerId/);
  assert.match(built.systemInstruction, /Do not imitate/);
  assert.match(built.systemInstruction, /Do not invent/);
});

test('editing requires a real image and ownership confirmation for watermark removal', () => {
  assert.throws(() => validateEditRequest({ toolId: 'background-remove' }, 'pro'), /required/);
  assert.throws(() => validateEditRequest({ toolId: 'watermark-owned-remove', image: png }, 'pro_plus'), /Confirm/);
  const request = validateEditRequest({ toolId: 'watermark-owned-remove', image: png, ownsWatermark: true }, 'pro_plus');
  assert.match(buildEditPrompt(request).systemInstruction, /Never remove third-party ownership marks/);
});

test('OCR, ID reading, chart analysis, and translation never claim certainty or invent values', () => {
  const printed = buildVisionPrompt(validateVisionRequest({ toolId: 'ocr-printed', image: png }, 'free'));
  assert.match(printed.systemInstruction, /probabilistic/);
  assert.match(printed.prompt, /uncertain/);
  const id = buildVisionPrompt(validateVisionRequest({ toolId: 'ocr-id', image: png }, 'pro_plus'));
  assert.match(id.prompt, /Do not infer hidden values, verify identity/);
  const chart = buildVisionPrompt(validateVisionRequest({ toolId: 'chart-analysis', image: png }, 'pro'));
  assert.match(chart.prompt, /Do not estimate unreadable values/);
  const translation = buildVisionPrompt(validateVisionRequest({ toolId: 'image-translate', image: png, targetLanguage: 'Hindi' }, 'pro'));
  assert.match(translation.prompt, /Hindi/);
});

test('private asset ownership and provider inputs cannot be overridden by callers', () => {
  const asset: any = safeMediaAsset({ image: png, ownerId: 'attacker', title: 'Owned', tags: ['one'], source: 'generated' }, 'owner-a');
  assert.equal(asset.ownerId, 'owner-a');
  assert.equal(asset.source, 'generated');
  assert.deepEqual(asset.tags, ['one']);
  assert.equal((asset as any).apiKey, undefined);
});

test('admin tool configuration can disable tools without introducing unknown tools', () => {
  assert.deepEqual(publicMediaTools(['image-generator', 'made-up']).map((tool) => tool.id), ['image-generator']);
  const configured = publicMediaTools([{ id: 'image-generator', enabled: true, requiredPlan: 'pro' }, { id: 'caption', enabled: false }]);
  assert.equal(configured.length, 1);
  assert.equal(configured[0].requiredPlan, 'pro');
  assert.equal(publicMediaTools(undefined).length, MEDIA_TOOLS.length);
});
