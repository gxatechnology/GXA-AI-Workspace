import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import LandingPage from '../src/components/LandingPage';
import PlanLimitDialog from '../src/components/PlanLimitDialog';

test('pre-authentication render restores the cookie session before exposing account controls', () => {
  const markup = renderToStaticMarkup(React.createElement(App));
  assert.match(markup, /Restoring your workspace/);
  assert.doesNotMatch(markup, /free plan/i);
  assert.doesNotMatch(markup, /aria-label="Profile"/);
});

test('authentication screen never publishes sandbox credentials', () => {
  const markup = renderToStaticMarkup(React.createElement(LandingPage, {
    onLoginSuccess: () => undefined,
    theme: 'light',
    onToggleTheme: () => undefined,
    initialAuthMode: 'login',
  }));

  assert.match(markup, /Log in/);
  assert.match(markup, /Guest workspace/);
  assert.doesNotMatch(markup, /sandbox login/i);
  assert.doesNotMatch(markup, /password123/i);
  assert.doesNotMatch(markup, /tauqeerashraf250/i);
});

test('plan limit dialog contains only customer-facing recovery information', () => {
  const markup = renderToStaticMarkup(React.createElement(PlanLimitDialog, { open: true, onClose: () => undefined, onUpgrade: () => undefined }));
  assert.match(markup, /You have reached the limit of your current plan/); assert.match(markup, /Upgrade to ₹149/); assert.match(markup, /Your work is safe/);
  assert.doesNotMatch(markup, /tokens?|credits?|API cost|provider/i);
});
