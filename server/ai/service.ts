import { PLAN_REGISTRY, type PlanId } from '../../shared/platformRegistry.js';
import type { AIEnvironment } from './config.js';
import { resolveToolRoute } from './registry.js';
import { GeminiAdapter } from './providers/gemini.js';
import { OpenAIAdapter } from './providers/openai.js';
import { OpenRouterAdapter } from './providers/openrouter.js';
import { AIProviderError, type AIMessage, type AIProviderAdapter, type AIProviderResult, type AIStreamChunk, type AIToolKey } from './types.js';

export type AIGenerationInput = {
  tool: AIToolKey;
  planId: PlanId;
  requestId: string;
  prompt?: string;
  messages?: AIMessage[];
  systemInstruction: string;
  modelOverrides?: Record<string, unknown>;
  signal?: AbortSignal;
  validate?: (text: string) => void;
};

export class AIService {
  private readonly adapters: Map<string, AIProviderAdapter>;
  constructor(private readonly config: AIEnvironment, adapters?: AIProviderAdapter[]) {
    const available = adapters || [new OpenRouterAdapter(config), new OpenAIAdapter(config), new GeminiAdapter(config)];
    this.adapters = new Map(available.map(adapter => [adapter.id, adapter]));
  }

  private request(input: AIGenerationInput) {
    const route = resolveToolRoute(input.tool, input.planId, input.modelOverrides, this.config.defaultProvider);
    const messages = input.messages || [{ role: 'user' as const, content: input.prompt || '' }];
    const allMessages: AIMessage[] = [{ role: 'system', content: input.systemInstruction }, ...messages];
    const inputCharacters = allMessages.reduce((sum, message) => sum + (typeof message.content === 'string' ? message.content.length : JSON.stringify(message.content).length), 0);
    const planLimits = PLAN_REGISTRY[input.planId].limits;
    if (inputCharacters > Math.min(route.inputLimit, Number(planLimits.max_input_characters || route.inputLimit))) throw new AIProviderError('AI_INPUT_LIMIT_EXCEEDED', 413, false);
    const routing = {
      order: this.config.openRouterProviderOrder,
      allowFallbacks: this.config.openRouterAllowFallbacks && route.fallbacks.length > 0,
      requireParameters: route.structuredOutput,
      dataCollection: this.config.openRouterDataCollection,
      zeroDataRetention: route.privateData ? true : this.config.openRouterZeroDataRetention,
      sort: this.config.openRouterSort,
      maxPrice: { prompt: this.config.openRouterMaxPromptPrice, completion: this.config.openRouterMaxCompletionPrice },
    };
    return { route, providerRequest: { requestId: input.requestId, tool: input.tool, modelIds: [route.primary.providerModelId, ...(routing.allowFallbacks ? route.fallbacks.map(model => model.providerModelId) : [])], messages: allMessages, temperature: route.temperature, maxOutputTokens: Math.min(route.outputLimit, route.primary.outputLimit, Number(planLimits.max_output_tokens || route.outputLimit)), structuredOutput: route.structuredOutput, timeoutMs: route.timeoutMs, routing, signal: input.signal } };
  }

  private activeAdapter() {
    const adapter = this.adapters.get(this.config.defaultProvider);
    if (!adapter || !adapter.enabled()) throw new AIProviderError('PROVIDER_DISABLED', 503, false, this.config.defaultProvider);
    if (!adapter.configured()) throw new AIProviderError('PROVIDER_NOT_CONFIGURED', 503, false, this.config.defaultProvider);
    return adapter;
  }

  async generate(input: AIGenerationInput): Promise<AIProviderResult> {
    const { route, providerRequest } = this.request(input);
    const result = await this.activeAdapter().generate(providerRequest);
    if (route.structuredOutput) {
      try { JSON.parse(result.text.replace(/```json|```/gi, '').trim()); }
      catch { throw new AIProviderError('PROVIDER_MALFORMED_RESPONSE', 502, false, result.provider); }
    }
    try { input.validate?.(result.text); }
    catch (error) { if (error instanceof AIProviderError) throw error; throw new AIProviderError('PROVIDER_MALFORMED_RESPONSE', 502, false, result.provider); }
    const usedModel = [route.primary, ...route.fallbacks].find(model => model.providerModelId === result.providerModelId);
    return { ...result, modelKey: usedModel?.key || route.primary.key };
  }

  async *stream(input: AIGenerationInput): AsyncGenerator<AIStreamChunk> {
    const { providerRequest } = this.request(input);
    yield* this.activeAdapter().stream(providerRequest);
  }

  providerStatus() {
    return Object.fromEntries([...this.adapters.values()].map(adapter => [adapter.id, { enabled: adapter.enabled(), configured: adapter.configured() }]));
  }
}

export function safeAIError(error: unknown) {
  const platform = error as any;
  if (platform && ['AUTHENTICATION_REQUIRED', 'AUTHORIZATION_DENIED', 'ENTITLEMENT_REQUIRED', 'PLAN_LIMIT_REACHED'].includes(platform.code) && Number.isInteger(platform.status)) {
    return { status: platform.status, code: platform.code, message: String(platform.message || 'The request is not permitted.') };
  }
  if (error instanceof AIProviderError) {
    const messages: Record<string, string> = {
      PROVIDER_DISABLED: 'AI generation is unavailable because the configured provider is disabled.',
      PROVIDER_NOT_CONFIGURED: 'AI generation is not configured on this deployment.',
      PROVIDER_AUTHENTICATION_FAILED: 'AI generation is temporarily unavailable.',
      PROVIDER_CREDITS_UNAVAILABLE: 'AI generation is temporarily unavailable.',
      PROVIDER_RATE_LIMITED: 'The AI service is busy. Please retry shortly.',
      PROVIDER_TIMEOUT: 'The AI request timed out. Your input is preserved.',
      GENERATION_CANCELLED: 'Generation was stopped.',
      AI_CONCURRENCY_LIMIT: 'Too many AI requests are already running. Try again shortly.',
      AI_INPUT_LIMIT_EXCEEDED: 'This input exceeds the configured AI processing limit. Your input is preserved.',
      PROVIDER_MALFORMED_RESPONSE: 'The AI service returned an invalid response. Your input is preserved.',
      PROVIDER_EMPTY_RESPONSE: 'The AI service returned no content. Your input is preserved.',
    };
    return { status: error.status === 499 ? 499 : error.status, code: error.code, message: messages[error.code] || 'The AI service is temporarily unavailable. Your input is preserved.' };
  }
  return { status: 502, code: 'AI_SERVICE_ERROR', message: 'The AI service is temporarily unavailable. Your input is preserved.' };
}
