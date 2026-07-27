import type { AIEnvironment } from '../config.js';
import { AIProviderError, emptyUsage, type AIProviderAdapter, type AIProviderRequest, type AIProviderResult, type AIStreamChunk } from '../types.js';

export class OpenAIAdapter implements AIProviderAdapter {
  readonly id = 'openai' as const;
  constructor(private readonly config: AIEnvironment, private readonly fetcher: typeof fetch = fetch) {}
  enabled() { return this.config.enabled.openai; }
  configured() { return this.enabled() && Boolean(this.config.keys.openai); }

  private assertAvailable() {
    if (!this.enabled()) throw new AIProviderError('PROVIDER_DISABLED', 503, false, this.id);
    if (!this.config.keys.openai) throw new AIProviderError('PROVIDER_NOT_CONFIGURED', 503, false, this.id);
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResult> {
    this.assertAvailable();
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    request.signal?.addEventListener('abort', () => controller.abort(), { once: true });
    try {
      const response = await this.fetcher('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.config.keys.openai}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: request.modelIds[0], messages: request.messages, temperature: request.temperature, max_tokens: request.maxOutputTokens, ...(request.structuredOutput ? { response_format: { type: 'json_object' } } : {}) }),
      });
      if (!response.ok) { await response.text().catch(() => ''); throw new AIProviderError('PROVIDER_UNAVAILABLE', response.status === 429 ? 429 : 503, response.status === 429 || response.status >= 500, this.id); }
      const value: any = await response.json();
      const text = String(value?.choices?.[0]?.message?.content || '');
      if (!text.trim()) throw new AIProviderError('PROVIDER_EMPTY_RESPONSE', 502, false, this.id);
      const inputTokens = Number(value?.usage?.prompt_tokens || 0); const outputTokens = Number(value?.usage?.completion_tokens || 0);
      return { text, provider: this.id, providerModelId: String(value?.model || request.modelIds[0]), generationId: value?.id, usage: { inputTokens, outputTokens, totalTokens: Number(value?.usage?.total_tokens || inputTokens + outputTokens) }, durationMs: Date.now() - started, fallbackUsed: false };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(request.signal?.aborted ? 'GENERATION_CANCELLED' : 'PROVIDER_TIMEOUT', request.signal?.aborted ? 499 : 504, !request.signal?.aborted, this.id);
    } finally { clearTimeout(timer); }
  }

  async *stream(request: AIProviderRequest): AsyncGenerator<AIStreamChunk> {
    this.assertAvailable(); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), request.timeoutMs); const onAbort = () => controller.abort();
    if (request.signal?.aborted) controller.abort(); else request.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      if (controller.signal.aborted) throw new AIProviderError('GENERATION_CANCELLED', 499, false, this.id);
      const response = await this.fetcher('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${this.config.keys.openai}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: request.modelIds[0], messages: request.messages, temperature: request.temperature, max_tokens: request.maxOutputTokens, stream: true, stream_options: { include_usage: true } }) });
      if (!response.ok || !response.body) { await response.text().catch(() => ''); throw new AIProviderError('PROVIDER_UNAVAILABLE', response.status === 429 ? 429 : 503, response.status === 429 || response.status >= 500, this.id); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let usage = emptyUsage();
      while (true) {
        const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
        for (const line of lines) { if (!line.startsWith('data:')) continue; const data = line.slice(5).trim(); if (!data || data === '[DONE]') continue; let chunk: any; try { chunk = JSON.parse(data); } catch { continue; } const text = chunk?.choices?.[0]?.delta?.content; if (text) yield { type: 'delta', text }; if (chunk?.usage) { const inputTokens = Number(chunk.usage.prompt_tokens || 0); const outputTokens = Number(chunk.usage.completion_tokens || 0); usage = { inputTokens, outputTokens, totalTokens: Number(chunk.usage.total_tokens || inputTokens + outputTokens) }; yield { type: 'usage', usage, providerModelId: chunk.model || request.modelIds[0], generationId: chunk.id }; } }
      }
      if (!usage.totalTokens) yield { type: 'usage', usage, providerModelId: request.modelIds[0] };
    } catch (error) { if (error instanceof AIProviderError) throw error; throw new AIProviderError(request.signal?.aborted ? 'GENERATION_CANCELLED' : 'PROVIDER_TIMEOUT', request.signal?.aborted ? 499 : 504, !request.signal?.aborted, this.id); }
    finally { clearTimeout(timer); request.signal?.removeEventListener('abort', onAbort); }
  }
}
