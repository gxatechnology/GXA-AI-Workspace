import { GoogleGenAI } from '@google/genai';
import type { AIEnvironment } from '../config.js';
import { AIProviderError, emptyUsage, type AIProviderAdapter, type AIProviderRequest, type AIProviderResult, type AIStreamChunk } from '../types.js';

export class GeminiAdapter implements AIProviderAdapter {
  readonly id = 'gemini' as const;
  private client: GoogleGenAI | null = null;
  constructor(private readonly config: AIEnvironment) {}
  enabled() { return this.config.enabled.gemini; }
  configured() { return this.enabled() && Boolean(this.config.keys.gemini); }

  private getClient() {
    if (!this.enabled()) throw new AIProviderError('PROVIDER_DISABLED', 503, false, this.id);
    if (!this.config.keys.gemini) throw new AIProviderError('PROVIDER_NOT_CONFIGURED', 503, false, this.id);
    this.client ||= new GoogleGenAI({ apiKey: this.config.keys.gemini });
    return this.client;
  }

  private requestParts(request: AIProviderRequest) {
    const systemInstruction = request.messages.filter(message => message.role === 'system').map(message => String(message.content)).join('\n\n');
    const contents = request.messages.filter(message => message.role !== 'system').map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}`).join('\n\n');
    return { systemInstruction, contents };
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResult> {
    const started = Date.now(); const client = this.getClient(); const parts = this.requestParts(request);
    if (request.signal?.aborted) throw new AIProviderError('GENERATION_CANCELLED', 499, false, this.id);
    try {
      const response: any = await Promise.race([
        client.models.generateContent({ model: request.modelIds[0], contents: parts.contents, config: { systemInstruction: parts.systemInstruction, temperature: request.temperature, maxOutputTokens: request.maxOutputTokens, ...(request.structuredOutput ? { responseMimeType: 'application/json' } : {}) } }),
        new Promise((_, reject) => setTimeout(() => reject(new AIProviderError('PROVIDER_TIMEOUT', 504, true, this.id)), request.timeoutMs)),
      ]);
      const text = String(response?.text || ''); if (!text.trim()) throw new AIProviderError('PROVIDER_EMPTY_RESPONSE', 502, false, this.id);
      const inputTokens = Number(response?.usageMetadata?.promptTokenCount || 0); const outputTokens = Number(response?.usageMetadata?.candidatesTokenCount || 0);
      return { text, provider: this.id, providerModelId: request.modelIds[0], usage: { inputTokens, outputTokens, totalTokens: Number(response?.usageMetadata?.totalTokenCount || inputTokens + outputTokens) }, durationMs: Date.now() - started, fallbackUsed: false };
    } catch (error) { if (error instanceof AIProviderError) throw error; throw new AIProviderError('PROVIDER_UNAVAILABLE', 503, true, this.id); }
  }

  async *stream(request: AIProviderRequest): AsyncGenerator<AIStreamChunk> {
    const client = this.getClient(); const parts = this.requestParts(request);
    try {
      const response: any = await client.models.generateContentStream({ model: request.modelIds[0], contents: parts.contents, config: { systemInstruction: parts.systemInstruction, temperature: request.temperature, maxOutputTokens: request.maxOutputTokens } });
      for await (const chunk of response) { if (request.signal?.aborted) throw new AIProviderError('GENERATION_CANCELLED', 499, false, this.id); const text = String(chunk?.text || ''); if (text) yield { type: 'delta', text }; }
      yield { type: 'usage', usage: emptyUsage(), providerModelId: request.modelIds[0] };
    } catch (error) { if (error instanceof AIProviderError) throw error; throw new AIProviderError('PROVIDER_UNAVAILABLE', 503, true, this.id); }
  }
}
