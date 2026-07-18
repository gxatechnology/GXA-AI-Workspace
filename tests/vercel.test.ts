import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreApiUrl } from '../server/vercel.js';

test('Vercel API rewrite restores nested Express routes and query parameters', () => {
  assert.equal(
    restoreApiUrl('/api/index?path=pricing/plans'),
    '/api/pricing/plans',
  );
  assert.equal(
    restoreApiUrl('/api/index?path=pricing%2Ffeatures%2Fparaphraser.premium_modes&source=upgrade'),
    '/api/pricing/features/paraphraser.premium_modes?source=upgrade',
  );
});

test('Vercel API rewrite does not allow a path parameter to escape the API prefix', () => {
  assert.equal(restoreApiUrl('/api/index?path=%2Fpricing%2Fplans'), '/api/pricing/plans');
  assert.equal(restoreApiUrl('/api/index?path=..%2Fadmin'), '/api/admin');
  assert.equal(restoreApiUrl('/api/index?path=%252e%252e%2Fadmin'), '/api/admin');
  assert.equal(restoreApiUrl('/api/index?path='), '/api/index?path=');
});
