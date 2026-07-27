import type { AIEnvironment } from '../config.js';
import { AIProviderError, emptyUsage, type AIProviderAdapter, type AIProviderRequest, type AIProviderResult, type AIStreamChunk, type AIUsage } from '../types.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
type Fetcher = typeof fetch;

function usageFrom(value: any): AIUsage {
  const inputTokens = Math.max(0, Number(value?.prompt_tokens || value?.input_tokens || 0));
  const outputTokens = Math.max(0, Number(value?.completion_tokens || value?.output_tokens || 0));
  const totalTokens = Math.max(inputTokens + outputTokens, Number(value?.total_tokens || 0));
  const usage: AIUsage = { inputTokens, outputTokens, totalTokens };
  if (Number.isFinite(Number(value?.cost)) && Number(value.cost) >= 0) usage.cost = Number(value.cost);
  return usage;
}

function responseText(value: any) {
  const content = value?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(item => typeof item?.text === 'string' ? item.text : '').join('');
  return '';
}

function normalizedStatus(status: number) {
  if (status === 400 || status === 404 || status === 422) return { code: 'PROVIDER_REQUEST_REJECTED', status: 502, retryable: false };
  if (status === 401 || status === 403) return { code: 'PROVIDER_AUTHENTICATION_FAILED', status: 503, retryable: false };
  if (status === 402) return { code: 'PROVIDER_CREDITS_UNAVAILABLE', status: 503, retryable: false };
  if (status === 408 || status === 429) return { code: 'PROVIDER_RATE_LIMITED', status: 429, retryable: true };
  if (status >= 500) return { code: 'PROVIDER_UNAVAILABLE', status: 503, retryable: true };
  return { code: 'PROVIDER_ERROR', status: 502, retryable: false };
}

function safeError(error: unknown, timedOut: boolean, aborted: boolean) {
  if (aborted) return new AIProviderError('GENERATION_CANCELLED', 499, false, 'openrouter');
  if (timedOut) return new AIProviderError('PROVIDER_TIMEOUT', 504, true, 'openrouter');
  if (error instanceof AIProviderError) return error;
  return new AIProviderError('PROVIDER_NETWORK_ERROR', 503, true, 'openrouter');
}

function requestSignal(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const onAbort = () => controller.abort();
  if (external?.aborted) controller.abort(); else external?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => { clearTimeout(timeout); external?.removeEventListener('abort', onAbort); },
  };
}

export class OpenRouterAdapter implements AIProviderAdapter {
  readonly id = 'openrouter' as const;

  constructor(private readonly config: AIEnvironment, private readonly fetcher: Fetcher = fetch) {}

  enabled() { return this.config.enabled.openrouter; }
  configured() { return this.enabled() && Boolean(this.config.keys.openrouter && this.config.openRouterSiteUrl); }

  private headers() {
    if (!this.enabled()) throw new AIProviderError('PROVIDER_DISABLED', 503, false, this.id);
    const key = this.config.keys.openrouter;
    if (!key || !this.config.openRouterSiteUrl) throw new AIProviderError('PROVIDER_NOT_CONFIGURED', 503, false, this.id);
    return {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.config.openRouterSiteUrl,
      'X-Title': this.config.openRouterAppName,
      'X-OpenRouter-Title': this.config.openRouterAppName,
    };
  }

  private body(request: AIProviderRequest, stream: boolean) {
    const provider: Record<string, unknown> = {
      allow_fallbacks: request.routing.allowFallbacks,
      require_parameters: request.routing.requireParameters,
      data_collection: request.routing.dataCollection,
    };
    if (request.routing.order?.length) provider.order = request.routing.order;
    if (request.routing.zeroDataRetention) provider.zdr = true;
    if (request.routing.sort) provider.sort = request.routing.sort;
    if (request.routing.maxPrice && Object.values(request.routing.maxPrice).some(value => value !== undefined)) provider.max_price = request.routing.maxPrice;
    return {
      ...(request.modelIds.length > 1 ? { models: request.modelIds } : { model: request.modelIds[0] }),
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxOutputTokens,
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
      ...(request.structuredOutput ? { response_format: { type: 'json_object' } } : {}),
      provider,
      user: request.requestId,
    };
  }

  private async request(request: AIProviderRequest, stream: boolean) {
    const body = JSON.stringify(this.body(request, stream));
    let lastError: AIProviderError | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const signals = requestSignal(request.signal, request.timeoutMs);
      try {
        if (signals.signal.aborted) throw new AIProviderError('GENERATION_CANCELLED', 499, false, this.id);
        const response = await this.fetcher(OPENROUTER_URL, { method: 'POST', headers: this.headers(), body, signal: signals.signal });
        if (!response.ok) {
          await response.text().catch(() => '');
          const normalized = normalizedStatus(response.status);
          lastError = new AIProviderError(normalized.code, normalized.status, normalized.retryable, this.id);
          if (normalized.retryable && attempt === 0 && !request.signal?.aborted) {
            signals.cleanup();
            await new Promise(resolve => setTimeout(resolve, 250));
            continue;
          }
          throw lastError;
        }
        return { response, cleanup: signals.cleanup, timedOut: signals.timedOut };
      } catch (error) {
        const normalized = safeError(error, signals.timedOut(), Boolean(request.signal?.aborted));
        signals.cleanup();
        throw normalized;
      }
    }
    throw lastError || new AIProviderError('PROVIDER_UNAVAILABLE', 503, true, this.id);
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResult> {
    const started = Date.now();
    const pending = await this.request(request, false);
    try {
      let value: any;
      try { value = await pending.response.json(); }
      catch (error) {
        if (pending.timedOut() || request.signal?.aborted) throw safeError(error, pending.timedOut(), Boolean(request.signal?.aborted));
        throw new AIProviderError('PROVIDER_MALFORMED_RESPONSE', 502, false, this.id);
      }
      const text = responseText(value);
      if (!text.trim()) throw new AIProviderError('PROVIDER_EMPTY_RESPONSE', 502, false, this.id);
      const providerModelId = String(value?.model || request.modelIds[0]);
      return {
        text, provider: this.id, providerModelId,
        generationId: String(value?.id || pending.response.headers.get('x-generation-id') || '') || undefined,
        usage: usageFrom(value?.usage), durationMs: Date.now() - started,
        fallbackUsed: providerModelId !== request.modelIds[0],
      };
    } finally {
      pending.cleanup();
    }
  }

  async *stream(request: AIProviderRequest): AsyncGenerator<AIStreamChunk> {
    const pending = await this.request(request, true);
    if (!pending.response.body) {
      pending.cleanup();
      throw new AIProviderError('PROVIDER_MALFORMED_RESPONSE', 502, false, this.id);
    }
    const reader = pending.response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage = emptyUsage();
    let model = '';
    const generationId = pending.response.headers.get('x-generation-id') || undefined;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';
        for (const event of events) {
          const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
          if (!data || data === '[DONE]') continue;
          let chunk: any;
          try { chunk = JSON.parse(data); } catch { continue; }
          if (chunk?.error) throw new AIProviderError('PROVIDER_STREAM_ERROR', 502, false, this.id);
          model = String(chunk?.model || model);
          if (chunk?.usage) { usage = usageFrom(chunk.usage); yield { type: 'usage', usage, providerModelId: model || undefined, generationId }; }
          const text = chunk?.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text) yield { type: 'delta', text };
        }
      }
      if (!usage.totalTokens) yield { type: 'usage', usage, providerModelId: model || request.modelIds[0], generationId };
    } catch (error) {
      throw safeError(error, pending.timedOut(), Boolean(request.signal?.aborted));
    } finally {
      reader.releaseLock();
      pending.cleanup();
    }
  }
}

export { OPENROUTER_URL };
