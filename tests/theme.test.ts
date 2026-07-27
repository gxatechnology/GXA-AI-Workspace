import assert from 'node:assert/strict';
import test from 'node:test';
import { getInitialTheme, THEME_STORAGE_KEY } from '../src/theme.js';

test('theme contract has a stable storage key and safe server default', () => {
  assert.equal(THEME_STORAGE_KEY, 'gxa_theme');
  assert.equal(getInitialTheme(), 'light');
});
