import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateAIEnvironment } from '../server/ai/config.js';
import { AIService } from '../server/ai/service.js';
import { OpenRouterAdapter, OPENROUTER_URL } from '../server/ai/providers/openrouter.js';
import { OpenAIAdapter } from '../server/ai/providers/openai.js';
import { GeminiAdapter } from '../server/ai/providers/gemini.js';
import { AIProviderError, type AIProviderAdapter, type AIProviderRequest, type AIProviderResult, type AIStreamChunk } from '../server/ai/types.js';
import { AI_MODEL_REGISTRY, AI_TOOL_ROUTING, publicModelRegistry, resolveToolRoute } from '../server/ai/registry.js';
import { parseGrammarProviderOutput } from '../server/grammar.js';
import { validateParaphraseOutput } from '../server/paraphrase.js';
import { chunkDocumentPages } from '../server/document.js';
import { commitUsage, releaseUsage, reserveUsage } from '../server/platform.js';

const configuredEnvironment = () => validateAIEnvironment({
  OPENROUTER_API_KEY: 'test-openrouter-credential', OPENROUTER_ENABLED: 'true', OPENAI_ENABLED: 'false', GEMINI_ENABLED: 'false',
  AI_DEFAULT_PROVIDER: 'openrouter', AI_FALLBACK_PROVIDER: 'none', OPENROUTER_SITE_URL: 'https://gxa.example.test', OPENROUTER_APP_NAME: 'GXA AI Workspace',
} as NodeJS.ProcessEnv);

const providerRequest = (overrides: Partial<AIProviderRequest> = {}): AIProviderRequest => ({
  requestId: 'request-test', tool: 'summarizer', modelIds: ['google/gemini-2.5-flash-lite'], messages: [{ role: 'user', content: 'Summarize this.' }],
  temperature: 0.1, maxOutputTokens: 100, structuredOutput: false, timeoutMs: 1000,
  routing: { allowFallbacks: false, requireParameters: false, dataCollection: 'deny' }, ...overrides,
});

test('OpenRouter is the default and disabled direct providers require no keys', () => {
  const config = configuredEnvironment();
  assert.equal(config.defaultProvider, 'openrouter'); assert.equal(config.fallbackProvider, 'none');
  assert.equal(config.enabled.openrouter, true); assert.equal(config.enabled.openai, false); assert.equal(config.enabled.gemini, false);
  assert.equal(config.keys.openai, undefined); assert.equal(config.keys.gemini, undefined);
});

test('enabled providers require a server credential and all-disabled configuration is rejected', () => {
  assert.throws(() => validateAIEnvironment({ OPENROUTER_ENABLED: 'true', OPENAI_ENABLED: 'false', GEMINI_ENABLED: 'false', OPENROUTER_SITE_URL: 'https://gxa.example.test' } as NodeJS.ProcessEnv), /credential/i);
  assert.throws(() => validateAIEnvironment({ OPENROUTER_ENABLED: 'false', OPENAI_ENABLED: 'false', GEMINI_ENABLED: 'false' } as NodeJS.ProcessEnv), /at least one/i);
});

test('disabled OpenAI and Gemini adapters fail before any provider call', async () => {
  const config = configuredEnvironment(); let called = false;
  const openai = new OpenAIAdapter(config, (async () => { called = true; throw new Error('should not run'); }) as typeof fetch);
  await assert.rejects(() => openai.generate(providerRequest()), (error: any) => error instanceof AIProviderError && error.code === 'PROVIDER_DISABLED');
  const gemini = new GeminiAdapter(config);
  await assert.rejects(() => gemini.generate(providerRequest()), (error: any) => error instanceof AIProviderError && error.code === 'PROVIDER_DISABLED');
  assert.equal(called, false);
});

test('OpenRouter adapter sends only server credentials and required attribution/routing headers', async () => {
  let capturedUrl = ''; let captured: RequestInit | undefined;
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => { capturedUrl = String(url); captured = init; return new Response(JSON.stringify({ id: 'gen_1', model: 'google/gemini-2.5-flash-lite', choices: [{ message: { content: 'Summary' } }], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } }), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Generation-Id': 'gen_1' } }); }) as typeof fetch;
  const result = await new OpenRouterAdapter(configuredEnvironment(), fetcher).generate(providerRequest({ routing: { order: ['Google'], allowFallbacks: true, requireParameters: true, dataCollection: 'deny', zeroDataRetention: true, sort: 'latency', maxPrice: { prompt: 1, completion: 2 } } }));
  const headers = captured?.headers as Record<string, string>; const body = JSON.parse(String(captured?.body));
  assert.equal(capturedUrl, OPENROUTER_URL); assert.equal(headers.Authorization, 'Bearer test-openrouter-credential');
  assert.equal(headers['HTTP-Referer'], 'https://gxa.example.test'); assert.equal(headers['X-Title'], 'GXA AI Workspace'); assert.equal(headers['X-OpenRouter-Title'], 'GXA AI Workspace');
  assert.equal(body.provider.data_collection, 'deny'); assert.equal(body.provider.zdr, true); assert.equal(body.provider.require_parameters, true);
  assert.equal(result.text, 'Summary'); assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 2, totalTokens: 12 });
});

test('OpenRouter errors are normalized without returning provider response bodies', async () => {
  const adapter = new OpenRouterAdapter(configuredEnvironment(), (async () => new Response(JSON.stringify({ error: { message: 'sensitive upstream detail' } }), { status: 401 })) as typeof fetch);
  await assert.rejects(() => adapter.generate(providerRequest()), (error: any) => error instanceof AIProviderError && error.code === 'PROVIDER_AUTHENTICATION_FAILED' && !error.message.includes('sensitive'));
});

test('OpenRouter streaming parses deltas, usage and keep-alive comments', async () => {
  const sse = ': OPENROUTER PROCESSING\n\ndata: {"model":"google/gemini-2.5-flash-lite","choices":[{"delta":{"content":"Hello"}}]}\n\ndata: {"usage":{"prompt_tokens":3,"completion_tokens":1,"total_tokens":4},"choices":[]}\n\ndata: [DONE]\n\n';
  const adapter = new OpenRouterAdapter(configuredEnvironment(), (async () => new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'X-Generation-Id': 'gen_stream' } })) as typeof fetch);
  const chunks: AIStreamChunk[] = []; for await (const chunk of adapter.stream(providerRequest())) chunks.push(chunk);
  assert.equal(chunks.find(chunk => chunk.type === 'delta')?.type, 'delta');
  assert.deepEqual(chunks.find(chunk => chunk.type === 'usage' && chunk.usage.totalTokens === 4)?.usage, { inputTokens: 3, outputTokens: 1, totalTokens: 4 });
});

test('OpenRouter timeout and cancellation are distinguishable', async () => {
  const hanging = (async (_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => (init?.signal as AbortSignal).addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }))) as typeof fetch;
  const adapter = new OpenRouterAdapter(configuredEnvironment(), hanging);
  await assert.rejects(() => adapter.generate(providerRequest({ timeoutMs: 5 })), (error: any) => error.code === 'PROVIDER_TIMEOUT');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => adapter.generate(providerRequest({ signal: controller.signal })), (error: any) => error.code === 'GENERATION_CANCELLED');
});

test('OpenRouter cancellation remains active after streaming response headers arrive', async () => {
  const encoder = new TextEncoder();
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
        (init?.signal as AbortSignal).addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')), { once: true });
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }) as typeof fetch;
  const controller = new AbortController();
  const stream = new OpenRouterAdapter(configuredEnvironment(), fetcher).stream(providerRequest({ signal: controller.signal }));
  assert.equal((await stream.next()).value?.text, 'partial');
  controller.abort();
  await assert.rejects(() => stream.next(), (error: any) => error.code === 'GENERATION_CANCELLED');
});

test('model and tool registry reject arbitrary frontend model identifiers', () => {
  assert.throws(() => resolveToolRoute('summarizer', 'free', { summarizer: 'attacker/arbitrary-model' }), /AI_MODEL_NOT_APPROVED/);
  assert.throws(() => resolveToolRoute('document_summary', 'free'), /AI_TOOL_ENTITLEMENT_REQUIRED/);
  assert.equal(resolveToolRoute('document_summary', 'pro').requiredPlan, 'pro');
  assert.ok(Object.values(AI_TOOL_ROUTING).every(route => Boolean(AI_MODEL_REGISTRY[route.primaryModel])));
  assert.ok(publicModelRegistry('free').every(model => !('providerModelId' in model) && !('fallbackModels' in model)));
});

test('approved OpenRouter model fallback never invokes direct providers', async () => {
  const config = configuredEnvironment(); const calls: string[] = [];
  const openrouter: AIProviderAdapter = { id: 'openrouter', enabled: () => true, configured: () => true, generate: async request => { calls.push('openrouter'); return { text: 'ok', provider: 'openrouter', providerModelId: request.modelIds[1], usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, durationMs: 2, fallbackUsed: true }; }, async *stream() {} };
  const disabled = (id: 'openai' | 'gemini'): AIProviderAdapter => ({ id, enabled: () => false, configured: () => false, generate: async () => { calls.push(id); throw new Error('must not execute'); }, async *stream() {} });
  const result = await new AIService(config, [openrouter, disabled('openai'), disabled('gemini')]).generate({ tool: 'summarizer', planId: 'free', requestId: 'request', prompt: 'text', systemInstruction: 'system' });
  assert.deepEqual(calls, ['openrouter']); assert.equal(result.fallbackUsed, true); assert.equal(result.modelKey, 'or-gpt-41-mini');
});

test('private tools force privacy-conscious OpenRouter routing', async () => {
  let captured: AIProviderRequest | undefined;
  const adapter: AIProviderAdapter = { id: 'openrouter', enabled: () => true, configured: () => true, generate: async request => { captured = request; return { text: 'grounded', provider: 'openrouter', providerModelId: request.modelIds[0], usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, durationMs: 1, fallbackUsed: false }; }, async *stream() {} };
  await new AIService(configuredEnvironment(), [adapter]).generate({ tool: 'document_summary', planId: 'pro', requestId: 'request', prompt: 'private document', systemInstruction: 'grounded' });
  assert.equal(captured?.routing.dataCollection, 'deny'); assert.equal(captured?.routing.zeroDataRetention, true);
});

test('grammar structured output validates offsets and deterministic corrected text', () => {
  const source = 'Ths works.';
  const parsed = parseGrammarProviderOutput(JSON.stringify({ correctedText: 'This works.', issues: [{ start: 0, end: 3, original: 'Ths', replacement: 'This', category: 'spelling', explanation: 'The word is misspelled.', confidence: 'high' }], tone: { label: 'Neutral', evidence: [] } }), source);
  assert.equal(parsed.correctedText, 'This works.'); assert.equal(parsed.raw.issues[0].startOffset, 0);
  assert.throws(() => parseGrammarProviderOutput(JSON.stringify({ correctedText: 'Changed facts.', issues: [] }), source));
  assert.throws(() => parseGrammarProviderOutput(JSON.stringify({ correctedText: 'This works.', issues: [{ start: 1, end: 3, original: 'Ths', replacement: 'This', category: 'spelling', explanation: 'Wrong', confidence: 'high' }] }), source));
});

test('paraphraser output validation preserves protected terms, names, numbers and URLs', () => {
  const request: any = { text: 'GXA Technologies delivered API v2 for Jane Doe at https://gxa.example on 12/05/2026.', frozenTerms: ['API v2'] };
  assert.equal(validateParaphraseOutput(request, 'On 12/05/2026, GXA Technologies delivered API v2 for Jane Doe at https://gxa.example.'), 'On 12/05/2026, GXA Technologies delivered API v2 for Jane Doe at https://gxa.example.');
  assert.throws(() => validateParaphraseOutput(request, 'The company delivered an API for a customer.'));
});

test('large document summaries use bounded source-preserving chunks', () => {
  const chunks = chunkDocumentPages([{ page: 1, text: 'A'.repeat(80) }, { page: 2, text: 'B'.repeat(80) }] as any, 70, 10);
  assert.ok(chunks.length >= 3); assert.ok(chunks.every(chunk => chunk.text.length <= 100));
  assert.deepEqual([...new Set(chunks.flatMap(chunk => chunk.pages))], [1, 2]);
});

test('AI quota reservations commit, roll back, and remain tenant-isolated', () => {
  const db: any = { quotaReservations: {}, usageEvents: [] };
  const context = (tenantId: string) => ({ tenantId, user: { id: `user-${tenantId}` }, limits: { ai_requests_month: 1 } } as any);
  const first = reserveUsage(db, context('tenant-a'), 'ai_requests_month', 1, 'ai-a');
  assert.throws(() => reserveUsage(db, context('tenant-a'), 'ai_requests_month', 1, 'ai-a-2'), /quota/i);
  const second = reserveUsage(db, context('tenant-b'), 'ai_requests_month', 1, 'ai-b');
  const event = commitUsage(db, first.id, 1, { provider: 'openrouter', tool: 'summarizer', status: 'completed' });
  releaseUsage(db, second.id);
  assert.equal(event.tenantId, 'tenant-a'); assert.equal(db.quotaReservations[second.id].status, 'released'); assert.equal(db.usageEvents.length, 1);
});

test('frontend AI helper cannot send providers, model IDs, or public-prefixed secrets', () => {
  const client = fs.readFileSync(new URL('../src/utils/ai.ts', import.meta.url), 'utf8');
  const source = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(client, /\/api\/ai\/generate/); assert.doesNotMatch(client, /providerModelId|OPENROUTER_API_KEY|\/api\/gemini\/generate/);
  assert.doesNotMatch(source, /VITE_OPENROUTER_API_KEY|NEXT_PUBLIC_OPENROUTER_API_KEY|REACT_APP_OPENROUTER_API_KEY/);
  assert.match(source, /AI_ROUTING_OVERRIDE_DENIED/);
});
