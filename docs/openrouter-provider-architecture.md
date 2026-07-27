# OpenRouter provider architecture

## Active deployment policy

Production uses `AI_DEFAULT_PROVIDER=openrouter` and `AI_FALLBACK_PROVIDER=none`. `OPENROUTER_ENABLED=true`, `OPENAI_ENABLED=false`, and `GEMINI_ENABLED=false` make OpenRouter the only callable AI provider. Direct OpenAI and Gemini adapters remain in `server/ai/providers` for a future controlled rollout, but each adapter checks its server-side enabled flag before reading a credential or creating a client.

The browser calls GXA routes only. It can send an approved tool key and user input, but cannot submit a provider, provider model ID, routing preferences, system instruction, or credential. `/api/ai/config` publishes authorized display metadata without provider model IDs or secrets. The retired provider-specific `/api/gemini/generate` route returns `410 DIRECT_PROVIDER_ROUTE_DISABLED`.

## Request flow

Every generation route performs server-side input and tool validation, resolves an authenticated personal/organization tenant or a rate-limited guest subject, applies existing feature and plan rules, reserves `ai_requests_month`, resolves an approved model route, calls OpenRouter, validates the result, commits usage, and returns a sanitized response. A provider failure releases the reservation; a stream that has already returned content commits one request and marks the request `partial` or `cancelled`.

`aiProviderRequests` stores only safe operational fields: request ID, tenant ID, user ID, tool, provider, model key, token counts, status, duration, fallback use, and timestamps. Prompts, attachment contents, outputs, credentials, provider response bodies, and raw provider errors are not stored.

## Models and tool routing

The backend registry exposes stable model keys while keeping provider model IDs server-only:

| Model key | OpenRouter model | Purpose |
| --- | --- | --- |
| `or-gemini-25-flash-lite` | `google/gemini-2.5-flash-lite` | Default low-latency text and vision route |
| `or-gpt-41-mini` | `openai/gpt-4.1-mini` | Low-variance structured grammar route |
| `or-gemini-25-flash` | `google/gemini-2.5-flash` | Approved capability-preserving fallback |

All required product tools are declared once in `server/ai/registry.ts` with input/output limits, temperature, structured-output requirements, plan requirements, timeout, privacy classification, and approved fallback model keys. Admin configuration may override a tool with another existing registry key; arbitrary provider model IDs are rejected.

| Tool route | Primary model key | Approved fallback | Behavior |
| --- | --- | --- | --- |
| `ai_chat` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Streaming conversational output |
| `ai_writer` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Creative generation with server prompts |
| `grammar_checker` | `or-gpt-41-mini` | `or-gemini-25-flash` | Low-variance validated JSON |
| `paraphraser` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Meaning and protected-value preservation |
| `summarizer` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Grounded paragraph, bullet, key-point or executive summaries |
| `translator` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Configured-language translation with preservation review |
| `resume_builder` / `cover_letter` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | ZDR career content from verified facts |
| `business_writer` / `marketing_writer` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Business and marketing content from supplied claims |
| `document_summary` / `document_chat` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | ZDR chunked summary or retrieved page-grounded answers |
| `ai_humanizer` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Meaning-preserving natural rewrite |
| `growth_analysis` / `marketing_analysis` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Validated JSON where required |
| `technology_writer` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | Server-instructed technical output |
| `media_vision` | `or-gemini-25-flash-lite` | `or-gpt-41-mini` | ZDR image understanding through OpenRouter |

Application-level provider fallback is disabled. OpenRouter can use only the fallback models named in the registry. It receives backend-controlled provider order, fallback permission, required-parameter enforcement, data-collection policy, optional ZDR, sort preference, and price ceilings. Private document, career, resume, business, and vision requests always request ZDR routing.

## OpenRouter adapter

The adapter calls `https://openrouter.ai/api/v1/chat/completions` with `Authorization`, `Content-Type`, trusted `HTTP-Referer`, `X-Title`, and the official `X-OpenRouter-Title` attribution header. It supports non-streaming and SSE streaming, timeout, abort cancellation, one bounded retry for retryable provider responses, normalized errors, usage extraction, structured JSON mode, and approved model fallback detection. Ambiguous network failures are not automatically retried, which avoids potentially duplicating a billable generation. Keep-alive SSE comments and malformed events are ignored without exposing raw provider content.

Grammar output is parsed and validated before usage commits. Every offset must match the exact original UTF-16 range, replacements and explanations must be present, categories/confidence must be allowed, issues cannot overlap, and `correctedText` must equal the deterministic application of those issues. The original input is returned separately for comparison.

Paraphraser prompts preserve names, numbers, technical terms, frozen terms, language, tone, strength, formatting, and meaning. Summarizer and document prompts prohibit invented facts or citations and use the existing retrieval/chunk selection pipeline. Translator validation restricts languages and preservation controls; post-generation review flags changed protected values.

## Vercel configuration

Set these Preview and Production environment variables in Vercel Project Settings and redeploy:

```text
OPENROUTER_API_KEY=<server-only secret>
OPENROUTER_ENABLED=true
OPENAI_ENABLED=false
GEMINI_ENABLED=false
AI_DEFAULT_PROVIDER=openrouter
AI_FALLBACK_PROVIDER=none
OPENROUTER_SITE_URL=https://gxa-ai-workspace.vercel.app
OPENROUTER_APP_NAME=GXA AI Workspace
```

Keep `OPENAI_API_KEY` and `GEMINI_API_KEY` unset unless their direct adapters are intentionally enabled in a future release. Never create public-prefixed variants of any AI credential. Optional routing variables are documented in `.env.example`.

The inherited Vercel JSON-file database uses `/tmp` and is not durable across serverless instances. AI calls still enforce quotas and record usage within an instance, but production-grade cross-instance quota consistency requires the durable transactional database already identified in the platform readiness documentation.
