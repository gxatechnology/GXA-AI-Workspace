import type { AIProviderId } from './types.js';

export type AIEnvironment = {
  defaultProvider: AIProviderId;
  fallbackProvider: AIProviderId | 'none';
  enabled: Record<AIProviderId, boolean>;
  keys: Partial<Record<AIProviderId, string>>;
  openRouterSiteUrl: string;
  openRouterAppName: string;
  openRouterProviderOrder: string[];
  openRouterAllowFallbacks: boolean;
  openRouterDataCollection: 'allow' | 'deny';
  openRouterZeroDataRetention: boolean;
  openRouterSort?: 'price' | 'throughput' | 'latency';
  openRouterMaxPromptPrice?: number;
  openRouterMaxCompletionPrice?: number;
};

const truthy = new Set(['1', 'true', 'yes', 'on']);
const falsy = new Set(['0', 'false', 'no', 'off']);
const providers = new Set<AIProviderId>(['openrouter', 'openai', 'gemini']);

function booleanValue(value: string | undefined, fallback: boolean, name: string) {
  if (value === undefined || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (truthy.has(normalized)) return true;
  if (falsy.has(normalized)) return false;
  throw new Error(`${name} must be true or false.`);
}

function optionalNumber(value: string | undefined, name: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative number.`);
  return parsed;
}

function providerValue(value: string | undefined, fallback: AIProviderId, name: string): AIProviderId {
  const normalized = String(value || fallback).trim().toLowerCase() as AIProviderId;
  if (!providers.has(normalized)) throw new Error(`${name} must name a supported provider.`);
  return normalized;
}

export function validateAIEnvironment(env: NodeJS.ProcessEnv, options: { requireCredentials?: boolean } = {}): AIEnvironment {
  const requireCredentials = options.requireCredentials !== false;
  const defaultProvider = providerValue(env.AI_DEFAULT_PROVIDER, 'openrouter', 'AI_DEFAULT_PROVIDER');
  const fallbackRaw = String(env.AI_FALLBACK_PROVIDER || 'none').trim().toLowerCase();
  if (fallbackRaw !== 'none' && !providers.has(fallbackRaw as AIProviderId)) throw new Error('AI_FALLBACK_PROVIDER must be none or a supported provider.');
  const enabled = {
    openrouter: booleanValue(env.OPENROUTER_ENABLED, true, 'OPENROUTER_ENABLED'),
    openai: booleanValue(env.OPENAI_ENABLED, false, 'OPENAI_ENABLED'),
    gemini: booleanValue(env.GEMINI_ENABLED, false, 'GEMINI_ENABLED'),
  };
  if (!Object.values(enabled).some(Boolean)) throw new Error('At least one AI provider must be enabled.');
  if (!enabled[defaultProvider]) throw new Error('AI_DEFAULT_PROVIDER must be enabled.');
  if (fallbackRaw !== 'none' && !enabled[fallbackRaw as AIProviderId]) throw new Error('AI_FALLBACK_PROVIDER must be enabled or set to none.');

  const keys: Partial<Record<AIProviderId, string>> = {
    openrouter: env.OPENROUTER_API_KEY?.trim(),
    openai: env.OPENAI_API_KEY?.trim(),
    gemini: env.GEMINI_API_KEY?.trim(),
  };
  for (const provider of providers) {
    if (requireCredentials && enabled[provider] && !keys[provider]) throw new Error(`${provider.toUpperCase()} is enabled but its server credential is not configured.`);
  }

  const origin = String(env.OPENROUTER_SITE_URL || env.APP_ORIGIN || '').split(',')[0].trim();
  if (enabled.openrouter && (requireCredentials || origin)) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error('OPENROUTER_SITE_URL must be a trusted absolute HTTP(S) URL.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('OPENROUTER_SITE_URL must be a trusted absolute HTTP(S) URL.');
  }
  const dataCollection = String(env.OPENROUTER_DATA_COLLECTION || 'deny').trim().toLowerCase();
  if (!['allow', 'deny'].includes(dataCollection)) throw new Error('OPENROUTER_DATA_COLLECTION must be allow or deny.');
  const sortRaw = String(env.OPENROUTER_PROVIDER_SORT || '').trim().toLowerCase();
  if (sortRaw && !['price', 'throughput', 'latency'].includes(sortRaw)) throw new Error('OPENROUTER_PROVIDER_SORT must be price, throughput, or latency.');

  return {
    defaultProvider,
    fallbackProvider: fallbackRaw as AIProviderId | 'none',
    enabled,
    keys,
    openRouterSiteUrl: origin,
    openRouterAppName: String(env.OPENROUTER_APP_NAME || 'GXA AI Workspace').trim().slice(0, 100) || 'GXA AI Workspace',
    openRouterProviderOrder: String(env.OPENROUTER_PROVIDER_ORDER || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, 10),
    openRouterAllowFallbacks: booleanValue(env.OPENROUTER_ALLOW_FALLBACKS, true, 'OPENROUTER_ALLOW_FALLBACKS'),
    openRouterDataCollection: dataCollection as 'allow' | 'deny',
    openRouterZeroDataRetention: booleanValue(env.OPENROUTER_ZDR, false, 'OPENROUTER_ZDR'),
    openRouterSort: sortRaw as 'price' | 'throughput' | 'latency' | undefined,
    openRouterMaxPromptPrice: optionalNumber(env.OPENROUTER_MAX_PROMPT_PRICE, 'OPENROUTER_MAX_PROMPT_PRICE'),
    openRouterMaxCompletionPrice: optionalNumber(env.OPENROUTER_MAX_COMPLETION_PRICE, 'OPENROUTER_MAX_COMPLETION_PRICE'),
  };
}

export function publicAIEnvironment(config: AIEnvironment) {
  return {
    activeProvider: config.defaultProvider,
    fallbackProvider: config.fallbackProvider,
    providers: Object.fromEntries((Object.keys(config.enabled) as AIProviderId[]).map(id => [id, { enabled: config.enabled[id], configured: config.enabled[id] && Boolean(config.keys[id]) && (id !== 'openrouter' || Boolean(config.openRouterSiteUrl)) }])),
  };
}
