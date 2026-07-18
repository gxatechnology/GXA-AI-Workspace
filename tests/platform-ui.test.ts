import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import LandingPage from '../src/components/LandingPage';

test('guest shell exposes public navigation without account details', () => {
  const markup = renderToStaticMarkup(React.createElement(App));

  assert.match(markup, />Pricing</);
  assert.match(markup, />Login</);
  assert.match(markup, />Register</);
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

  assert.match(markup, /Secure Log In/);
  assert.doesNotMatch(markup, /sandbox login/i);
  assert.doesNotMatch(markup, /password123/i);
  assert.doesNotMatch(markup, /tauqeerashraf250/i);
});
