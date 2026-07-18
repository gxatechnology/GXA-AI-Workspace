import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDetection, buildHumanizerPrompt, calculateWritingMetrics, detectContentLanguage, internalSimilarity, MIN_DETECTION_WORDS, normalizeText, segmentText, validateHumanizerOutput, validateHumanizerRequest } from '../server/originality.js';

test('detector validates empty, long, and unsupported language input', () => {
  assert.throws(() => normalizeText(''), /Enter text/);
  assert.throws(() => normalizeText('abcdef', 5), /character limit/);
  assert.throws(() => analyzeDetection('This is enough text to validate language handling. '.repeat(10), 'French'), /Supported languages/);
});

test('short text returns insufficient evidence without a forced score', () => {
  const result = analyzeDetection('A short formal sentence cannot establish authorship.', 'English');
  assert.equal(result.classification, 'Insufficient evidence');
  assert.equal(result.confidenceBand, 'Low confidence');
  assert.equal(result.estimatedAiLikelihood, undefined);
  assert.equal(result.minimumUsefulWords, MIN_DETECTION_WORDS);
});

test('detector output is deterministic, calibrated, and contains limitations', () => {
  const text = 'Furthermore, organizations leverage a robust digital landscape to unlock value. Moreover, teams optimize a seamless workflow for every customer. '.repeat(8);
  const first = analyzeDetection(text, 'English'); const second = analyzeDetection(text, 'English');
  assert.equal(first.classification, second.classification); assert.equal(first.estimatedAiLikelihood, second.estimatedAiLikelihood);
  assert.ok(first.limitations.some(item => /estimate/.test(item))); assert.ok(first.estimatedAiLikelihood! < 100);
});

test('sentence and paragraph offsets map exactly to source text', () => {
  const text = 'Repeated sentence. Repeated sentence.\n\nA second paragraph.';
  for (const segment of [...segmentText(text, 'sentence'), ...segmentText(text, 'paragraph')]) assert.equal(text.slice(segment.startOffset, segment.endOffset), segment.text);
});

test('language detection supports Hindi and Hinglish with reduced claims', () => {
  assert.equal(detectContentLanguage('यह एक हिन्दी वाक्य है और यह परीक्षण के लिए है।'), 'Hindi');
  assert.equal(detectContentLanguage('Yeh kya hai aur aap kaise hain mera dost nahi aaya'), 'Hinglish');
});

test('writing metrics use real counts and omit English formulas for Hindi', () => {
  const english = calculateWritingMetrics('Clear writing helps readers. Clear structure helps teams.', 'English');
  assert.equal(english.sentences, 2); assert.ok(english.readingEase !== undefined); assert.ok(english.repeatedWords.some(item => item.word === 'clear') === false);
  const hindi = calculateWritingMetrics('यह एक वाक्य है। यह दूसरा वाक्य है।', 'Hindi'); assert.equal(hindi.readingEase, undefined);
});

test('Humanizer requests separate untrusted text and preserve controls', () => {
  const request = validateHumanizerRequest({ text: 'Keep GXA 2026 at https://gxa.example.', mode: 'Professional', strength: 'Strong', preserve: { keywords: ['GXA'], urls: true, numbers: true } });
  const prompt = buildHumanizerPrompt(request); assert.match(prompt, /<untrusted_user_text>/); assert.match(prompt, /Professional/); assert.doesNotMatch(prompt.split('<untrusted_user_text>')[0], /https:\/\/gxa\.example/);
  const validated = validateHumanizerOutput(request, 'A revised sentence without protected data.'); assert.ok(validated.warnings.length >= 2);
});

test('internal similarity never fabricates external sources', () => {
  const result = internalSimilarity('shared meaningful phrase and private document', 'another shared meaningful phrase');
  assert.ok(result.estimatedSimilarity >= 0); assert.deepEqual(result.externalSources, []); assert.match(result.limitations[0], /not an internet plagiarism scan/);
});
