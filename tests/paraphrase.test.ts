import test from 'node:test';
import assert from 'node:assert/strict';
import { buildParaphrasePrompt, FREE_PARAPHRASE_MODES, missingFrozenTerms, sanitizeFrozenTerms, validateParaphraseRequest } from '../server/paraphrase.js';

test('requires non-empty input and a supported mode', () => {
  assert.equal(validateParaphraseRequest({ text: '', mode: 'standard' }).ok, false);
  assert.equal(validateParaphraseRequest({ text: 'Hello', mode: 'unknown' }).ok, false);
});

test('only Standard and Fluency are free modes', () => {
  assert.deepEqual([...FREE_PARAPHRASE_MODES], ['standard', 'fluency']);
});

test('normalizes controls and safely separates custom instructions', () => {
  const result = validateParaphraseRequest({
    text: 'Keep GXA Technologies unchanged.', mode: 'formal', tone: 'Professional',
    outputLanguage: 'Hindi', outputLength: 'shorter', synonymStrength: 'high',
    frozenTerms: [' GXA Technologies ', 'GXA Technologies'], customInstructions: 'Prefer active voice.',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.request.frozenTerms, ['GXA Technologies']);
  const prompt = buildParaphrasePrompt(result.request);
  assert.match(prompt, /SYNONYM STRENGTH: high/);
  assert.match(prompt, /OUTPUT LANGUAGE: Hindi/);
  assert.match(prompt, /<user_preferences>Prefer active voice\.<\/user_preferences>/);
});

test('rejects oversized custom instructions and filters unreasonable frozen terms', () => {
  assert.equal(validateParaphraseRequest({ text: 'Hello', mode: 'custom', customInstructions: 'x'.repeat(501) }).ok, false);
  assert.deepEqual(sanitizeFrozenTerms(['ok', 'x'.repeat(101)]), ['ok']);
});

test('reports protected terms missing from output', () => {
  assert.deepEqual(missingFrozenTerms('GXA Technologies remains.', ['GXA Technologies', 'Gemini']), ['Gemini']);
});

test('preserves formatting and citation controls in the structured prompt', () => {
  const result = validateParaphraseRequest({
    text: '# Heading\n\nClaim [1]', mode: 'academic', preserveFormatting: true,
    preserveCitations: true, outputLength: 'similar', synonymStrength: 'balanced',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const prompt = buildParaphrasePrompt(result.request);
  assert.match(prompt, /PRESERVE FORMATTING: Yes/);
  assert.match(prompt, /PRESERVE CITATIONS: Yes/);
  assert.match(prompt, /<source_text># Heading\n\nClaim \[1\]<\/source_text>/);
});

test('does not include provider keys in validated requests or prompts', () => {
  const result = validateParaphraseRequest({ text: 'Hello', mode: 'standard', apiKey: 'secret-value' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal('apiKey' in result.request, false);
  assert.doesNotMatch(buildParaphrasePrompt(result.request), /secret-value/);
});
