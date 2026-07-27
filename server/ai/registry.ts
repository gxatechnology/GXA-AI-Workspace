import { PLAN_REGISTRY, PlanId } from '../../shared/platformRegistry.js';
import type { AIModelDefinition, AIToolRoute } from '../../shared/aiRegistry.js';
import type { AIToolKey } from './types.js';

export const AI_MODEL_REGISTRY: Readonly<Record<string, AIModelDefinition>> = Object.freeze({
  'or-gemini-25-flash-lite': {
    key: 'or-gemini-25-flash-lite', provider: 'openrouter', providerModelId: 'google/gemini-2.5-flash-lite', displayName: 'GXA Fast',
    supportedTools: ['ai_chat', 'ai_writer', 'paraphraser', 'summarizer', 'translator', 'resume_builder', 'cover_letter', 'business_writer', 'marketing_writer', 'marketing_analysis', 'document_summary', 'document_chat', 'ai_humanizer', 'growth_analysis', 'technology_writer', 'media_vision'],
    supportedModalities: ['text', 'image'], supportedParameters: ['temperature', 'max_tokens', 'response_format'], contextLimit: 1_048_576, outputLimit: 65_536,
    requiredPlan: 'free', active: true, defaultForTools: ['ai_chat', 'ai_writer', 'paraphraser', 'summarizer', 'translator', 'resume_builder', 'cover_letter', 'business_writer', 'marketing_writer', 'marketing_analysis', 'document_summary', 'document_chat', 'ai_humanizer', 'growth_analysis', 'technology_writer', 'media_vision'], fallbackModels: ['or-gpt-41-mini'], costCategory: 'economy',
  },
  'or-gpt-41-mini': {
    key: 'or-gpt-41-mini', provider: 'openrouter', providerModelId: 'openai/gpt-4.1-mini', displayName: 'GXA Precise',
    supportedTools: ['ai_chat', 'ai_writer', 'grammar_checker', 'paraphraser', 'summarizer', 'translator', 'resume_builder', 'cover_letter', 'business_writer', 'marketing_writer', 'marketing_analysis', 'document_summary', 'document_chat', 'ai_humanizer', 'growth_analysis', 'technology_writer', 'media_vision'],
    supportedModalities: ['text', 'image'], supportedParameters: ['temperature', 'max_tokens', 'response_format'], contextLimit: 1_048_576, outputLimit: 32_768,
    requiredPlan: 'free', active: true, defaultForTools: ['grammar_checker'], fallbackModels: ['or-gemini-25-flash'], costCategory: 'standard',
  },
  'or-gemini-25-flash': {
    key: 'or-gemini-25-flash', provider: 'openrouter', providerModelId: 'google/gemini-2.5-flash', displayName: 'GXA Balanced',
    supportedTools: ['ai_chat', 'ai_writer', 'grammar_checker', 'paraphraser', 'summarizer', 'translator', 'resume_builder', 'cover_letter', 'business_writer', 'marketing_writer', 'marketing_analysis', 'document_summary', 'document_chat', 'ai_humanizer', 'growth_analysis', 'technology_writer', 'media_vision'],
    supportedModalities: ['text', 'image'], supportedParameters: ['temperature', 'max_tokens', 'response_format'], contextLimit: 1_048_576, outputLimit: 65_536,
    requiredPlan: 'free', active: true, defaultForTools: [], fallbackModels: [], costCategory: 'standard',
  },
  'openai-gpt-41-mini-direct': {
    key: 'openai-gpt-41-mini-direct', provider: 'openai', providerModelId: 'gpt-4.1-mini', displayName: 'GXA Precise (Direct OpenAI)',
    supportedTools: ['ai_chat', 'ai_writer', 'grammar_checker', 'paraphraser', 'summarizer', 'translator', 'resume_builder', 'cover_letter', 'business_writer', 'marketing_writer', 'marketing_analysis', 'document_summary', 'document_chat', 'ai_humanizer', 'growth_analysis', 'technology_writer', 'media_vision'],
    supportedModalities: ['text', 'image'], supportedParameters: ['temperature', 'max_tokens', 'response_format'], contextLimit: 1_000_000, outputLimit: 32_768,
    requiredPlan: 'free', active: true, defaultForTools: [], fallbackModels: [], costCategory: 'standard',
  },
  'gemini-25-flash-lite-direct': {
    key: 'gemini-25-flash-lite-direct', provider: 'gemini', providerModelId: 'gemini-2.5-flash-lite', displayName: 'GXA Fast (Direct Gemini)',
    supportedTools: ['ai_chat', 'ai_writer', 'grammar_checker', 'paraphraser', 'summarizer', 'translator', 'resume_builder', 'cover_letter', 'business_writer', 'marketing_writer', 'marketing_analysis', 'document_summary', 'document_chat', 'ai_humanizer', 'growth_analysis', 'technology_writer'],
    supportedModalities: ['text'], supportedParameters: ['temperature', 'max_tokens', 'response_format'], contextLimit: 1_048_576, outputLimit: 65_536,
    requiredPlan: 'free', active: true, defaultForTools: [], fallbackModels: [], costCategory: 'economy',
  },
});

// Retained only for the disabled direct Gemini media adapter. Keeping these IDs
// here prevents individual routes from owning provider-specific model strings.
export const DIRECT_GEMINI_MEDIA_MODELS = Object.freeze({
  image: 'gemini-3.1-flash-image',
  vision: 'gemini-3.1-flash-lite',
});

const route = (primaryModel: string, overrides: Partial<AIToolRoute>): AIToolRoute => ({
  primaryModel, fallbackModels: AI_MODEL_REGISTRY[primaryModel].fallbackModels,
  inputLimit: 20_000, outputLimit: 2_048, temperature: 0.4, structuredOutput: false,
  requiredPlan: 'free', timeoutMs: 45_000, privateData: false, ...overrides,
});

export const AI_TOOL_ROUTING: Readonly<Record<AIToolKey, AIToolRoute>> = Object.freeze({
  ai_chat: route('or-gemini-25-flash-lite', { inputLimit: 80_000, outputLimit: 4_096, temperature: 0.55, timeoutMs: 55_000 }),
  ai_writer: route('or-gemini-25-flash-lite', { inputLimit: 40_000, outputLimit: 4_096, temperature: 0.65 }),
  grammar_checker: route('or-gpt-41-mini', { inputLimit: 100_000, outputLimit: 6_144, temperature: 0.05, structuredOutput: true }),
  paraphraser: route('or-gemini-25-flash-lite', { inputLimit: 60_000, outputLimit: 4_096, temperature: 0.35 }),
  summarizer: route('or-gemini-25-flash-lite', { inputLimit: 100_000, outputLimit: 4_096, temperature: 0.15 }),
  translator: route('or-gemini-25-flash-lite', { inputLimit: 100_000, outputLimit: 6_144, temperature: 0.05 }),
  resume_builder: route('or-gemini-25-flash-lite', { inputLimit: 50_000, outputLimit: 4_096, temperature: 0.3, privateData: true }),
  cover_letter: route('or-gemini-25-flash-lite', { inputLimit: 50_000, outputLimit: 4_096, temperature: 0.35, privateData: true }),
  business_writer: route('or-gemini-25-flash-lite', { inputLimit: 50_000, outputLimit: 4_096, temperature: 0.45, privateData: true }),
  marketing_writer: route('or-gemini-25-flash-lite', { inputLimit: 50_000, outputLimit: 4_096, temperature: 0.6 }),
  marketing_analysis: route('or-gemini-25-flash-lite', { inputLimit: 40_000, outputLimit: 4_096, temperature: 0.25, structuredOutput: true }),
  document_summary: route('or-gemini-25-flash-lite', { inputLimit: 400_000, outputLimit: 4_096, temperature: 0.1, requiredPlan: 'pro', timeoutMs: 28_000, privateData: true }),
  document_chat: route('or-gemini-25-flash-lite', { inputLimit: 80_000, outputLimit: 4_096, temperature: 0.15, requiredPlan: 'pro', privateData: true }),
  ai_humanizer: route('or-gemini-25-flash-lite', { inputLimit: 60_000, outputLimit: 4_096, temperature: 0.45, requiredPlan: 'pro' }),
  growth_analysis: route('or-gemini-25-flash-lite', { inputLimit: 30_000, outputLimit: 3_072, temperature: 0.25, structuredOutput: true }),
  technology_writer: route('or-gemini-25-flash-lite', { inputLimit: 40_000, outputLimit: 6_144, temperature: 0.2 }),
  media_vision: route('or-gemini-25-flash-lite', { inputLimit: 15_000_000, outputLimit: 4_096, temperature: 0.1, privateData: true }),
});

const directProviderModels = { openai: 'openai-gpt-41-mini-direct', gemini: 'gemini-25-flash-lite-direct' } as const;

export function resolveToolRoute(tool: AIToolKey, planId: PlanId, modelOverrides: Record<string, unknown> = {}, provider: 'openrouter' | 'openai' | 'gemini' = 'openrouter') {
  const configured = AI_TOOL_ROUTING[tool];
  if (!configured) throw new Error('AI_TOOL_NOT_SUPPORTED');
  if (PLAN_REGISTRY[planId].rank < PLAN_REGISTRY[configured.requiredPlan].rank) throw new Error('AI_TOOL_ENTITLEMENT_REQUIRED');
  const requestedKey = provider === 'openrouter' && typeof modelOverrides[tool] === 'string' ? String(modelOverrides[tool]) : provider === 'openrouter' ? configured.primaryModel : directProviderModels[provider];
  const primary = AI_MODEL_REGISTRY[requestedKey];
  if (!primary?.active || primary.provider !== provider || !primary.supportedTools.includes(tool)) throw new Error('AI_MODEL_NOT_APPROVED');
  if (PLAN_REGISTRY[planId].rank < PLAN_REGISTRY[primary.requiredPlan].rank) throw new Error('AI_MODEL_ENTITLEMENT_REQUIRED');
  const fallbackKeys = (provider === 'openrouter' ? configured.fallbackModels : []).filter(key => {
    const model = AI_MODEL_REGISTRY[key];
    return model?.active && model.provider === 'openrouter' && model.supportedTools.includes(tool) && PLAN_REGISTRY[planId].rank >= PLAN_REGISTRY[model.requiredPlan].rank;
  });
  return { ...configured, primaryModel: requestedKey, fallbackModels: fallbackKeys, primary, fallbacks: fallbackKeys.map(key => AI_MODEL_REGISTRY[key]) };
}

export function publicModelRegistry(planId: PlanId, provider: 'openrouter' | 'openai' | 'gemini' = 'openrouter') {
  return Object.values(AI_MODEL_REGISTRY)
    .filter(model => model.active && model.provider === provider && PLAN_REGISTRY[planId].rank >= PLAN_REGISTRY[model.requiredPlan].rank)
    .map(({ providerModelId: _providerModelId, fallbackModels: _fallbackModels, ...model }) => model);
}

export function modelKeyForProviderId(providerModelId: string) {
  return Object.values(AI_MODEL_REGISTRY).find(model => model.providerModelId === providerModelId)?.key;
}
