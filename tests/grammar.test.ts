import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrammarPrompt, calculateWritingScores, CORE_GRAMMAR_CATEGORIES, normalizeGrammarIssues, validateGrammarRequest } from '../server/grammar.js';

test('validates text and supported languages', () => {
  assert.equal(validateGrammarRequest({ text: '', language: 'English' }).ok, false);
  assert.equal(validateGrammarRequest({ text: 'Hello', language: 'Klingon' }).ok, false);
  assert.equal(validateGrammarRequest({ text: 'Hello', language: 'English' }).ok, true);
});

test('defaults to core free categories and separates user data', () => {
  const result = validateGrammarRequest({ text: 'This are wrong.', language: 'English', dictionary: [' GXA ', 'GXA'], ignoredRules: ['passive-voice'] });
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.deepEqual(result.request.categories, [...CORE_GRAMMAR_CATEGORIES]);
  assert.deepEqual(result.request.dictionary, ['GXA']);
  assert.match(buildGrammarPrompt(result.request), /<source_text>This are wrong\.<\/source_text>/);
});

test('normalizes valid issues and rejects invalid ranges', () => {
  const text = 'This are wrong.';
  const issues = normalizeGrammarIssues({ issues: [
    { category: 'Grammar', severity: 'error', startOffset: 5, endOffset: 8, originalText: 'are', replacements: ['is'], title: 'Agreement', explanation: 'Use a singular verb.', ruleId: 'agreement', confidence: .98 },
    { category: 'Spelling', startOffset: 30, endOffset: 35, originalText: 'fake', replacements: ['x'] },
  ] }, text, false);
  assert.equal(issues.length, 1); assert.equal(issues[0].id, 'agreement-5-8');
});

test('deduplicates and rejects overlapping issues', () => {
  const text = 'very very long';
  const raw = { issues: [
    { category: 'Grammar', startOffset: 0, endOffset: 4, originalText: 'very', replacements: ['extremely'], ruleId: 'a', confidence: .9 },
    { category: 'Grammar', startOffset: 0, endOffset: 4, originalText: 'very', replacements: ['extremely'], ruleId: 'a', confidence: .9 },
    { category: 'Style', startOffset: 0, endOffset: 9, originalText: 'very very', replacements: ['extremely'], ruleId: 'b', confidence: .8 },
  ]};
  assert.equal(normalizeGrammarIssues(raw, text, true).length, 1);
});

test('enforces premium categories during normalization', () => {
  const raw = { issues: [{ category: 'Clarity', startOffset: 0, endOffset: 5, originalText: 'Wordy', replacements: ['Clear'], ruleId: 'clarity', confidence: .8 }] };
  assert.equal(normalizeGrammarIssues(raw, 'Wordy', false).length, 0);
  assert.equal(normalizeGrammarIssues(raw, 'Wordy', true).length, 1);
});

test('writing scores are deterministic and issue-based', () => {
  const issues = normalizeGrammarIssues({ issues: [{ category: 'Grammar', severity: 'error', startOffset: 5, endOffset: 8, originalText: 'are', replacements: ['is'], ruleId: 'agreement', confidence: 1 }] }, 'This are wrong.', true);
  const first = calculateWritingScores('This are wrong.', issues);
  assert.deepEqual(first, calculateWritingScores('This are wrong.', issues));
  assert.ok(first.grammar < 100); assert.ok(first.overall < 100);
});

test('provider keys are ignored by request validation', () => {
  const result = validateGrammarRequest({ text: 'Hello.', language: 'English', apiKey: 'secret' });
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal('apiKey' in result.request, false);
  assert.doesNotMatch(buildGrammarPrompt(result.request), /secret/);
});
