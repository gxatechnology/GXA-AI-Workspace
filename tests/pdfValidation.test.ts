import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePdfFile } from '../src/utils/pdfValidation';

test('accepts a valid PDF within the configured limit', () => assert.deepEqual(validatePdfFile({ name: 'report.PDF', type: 'application/pdf', size: 1024 }, 5), { valid: true }));
test('rejects a misleading extension', () => assert.equal(validatePdfFile({ name: 'report.txt', type: 'application/pdf', size: 1024 }, 5).valid, false));
test('rejects an invalid MIME type', () => assert.equal(validatePdfFile({ name: 'report.pdf', type: 'text/plain', size: 1024 }, 5).valid, false));
test('rejects empty files', () => assert.equal(validatePdfFile({ name: 'report.pdf', type: 'application/pdf', size: 0 }, 5).valid, false));
test('rejects files over the backend-configured size', () => {
  const result = validatePdfFile({ name: 'report.pdf', type: 'application/pdf', size: 6 * 1024 * 1024 }, 5);
  assert.equal(result.valid, false);
  if (!result.valid) assert.equal(result.code, 'size');
});
