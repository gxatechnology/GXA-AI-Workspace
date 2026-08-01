import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PublicSite from '../src/components/public/PublicSite.js';
import { COMPANY, PUBLIC_FAQS, PUBLIC_PAGES, PUBLIC_PATHS, isPublicWebsitePath } from '../src/public/content.js';

const baseProps = {
  theme: 'light' as const,
  isAuthenticated: false,
  onToggleTheme: () => undefined,
  onOpenWorkspace: () => undefined,
  onShowPricing: () => undefined,
  onLogin: () => undefined,
  onRegister: () => undefined,
};

test('public home explains the product and preserves the required calls to action', () => {
  const markup = renderToStaticMarkup(React.createElement(PublicSite, { ...baseProps, initialPath: '/' }));
  assert.match(markup, /Write, understand documents and move professional work forward/);
  assert.match(markup, /Start Free/);
  assert.match(markup, /View Pricing/);
  for (const feature of ['AI Writer', 'Business Studio', 'Career Studio', 'PDF Intelligence', 'Translator', 'AI Chat', 'Grammar Checker', 'Paraphraser', 'Summarizer', 'Templates']) assert.match(markup, new RegExp(feature));
  for (const footer of ['Product', 'Writing Tools', 'Resources', 'Company', 'Legal', 'Trust']) assert.match(markup, new RegExp(footer));
});

test('public information pages use verified company and support details', () => {
  const about = renderToStaticMarkup(React.createElement(PublicSite, { ...baseProps, initialPath: '/about' }));
  const contact = renderToStaticMarkup(React.createElement(PublicSite, { ...baseProps, initialPath: '/contact' }));
  assert.match(about, /Mission/); assert.match(about, /Responsible innovation/);
  assert.match(contact, new RegExp(COMPANY.supportEmail));
  for (const category of ['General Questions', 'Billing', 'Technical Support', 'Bug Reports', 'Feature Requests', 'Business Enquiries', 'Partnerships', 'Media']) assert.match(contact, new RegExp(category));
  assert.doesNotMatch(`${about}${contact}`, /\+\d[\d\s()-]{7,}/);
});

test('FAQ includes more than forty verified answers without fake proof points', () => {
  assert.ok(PUBLIC_FAQS.length >= 40);
  const corpus = JSON.stringify({ pages: PUBLIC_PAGES, faqs: PUBLIC_FAQS });
  for (const forbidden of ['Lorem Ipsum', 'trusted by thousands', 'five-star rating', 'SOC 2 certified', 'ISO 27001 certified']) assert.doesNotMatch(corpus, new RegExp(forbidden, 'i'));
  assert.match(corpus, /Business Studio is available only with Business Pro/);
  assert.match(corpus, /probabilistic stylistic signals/);
});

test('public routing keeps existing hash workspaces separate and provides a 404', () => {
  assert.equal(isPublicWebsitePath('/', ''), true);
  assert.equal(isPublicWebsitePath('/', '#/home'), false);
  assert.equal(isPublicWebsitePath('/admin', ''), false);
  assert.equal(isPublicWebsitePath('/unknown-public-page', ''), true);
  const missing = renderToStaticMarkup(React.createElement(PublicSite, { ...baseProps, initialPath: '/unknown-public-page' }));
  assert.match(missing, /Page not found/);
});

test('SEO assets cover every indexable public page', () => {
  const root = process.cwd();
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'public', 'robots.txt'), 'utf8');
  assert.match(index, /application\/ld\+json/);
  assert.match(index, /WebApplication/);
  assert.match(index, /Organization/);
  assert.match(index, /rel="canonical"/);
  assert.match(index, /rel="icon"/);
  for (const route of Object.values(PUBLIC_PATHS).filter(route => !['/offline', '/maintenance', '/error'].includes(route))) assert.match(sitemap, new RegExp(route === '/' ? `${COMPANY.productionUrl}/` : `${COMPANY.productionUrl}${route}`));
  assert.match(robots, /Disallow: \/api\//);
});

