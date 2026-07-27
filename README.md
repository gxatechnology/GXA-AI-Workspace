# GXA AI Workspace

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** Node.js 22 or newer


1. Install dependencies with `npm ci`.
2. Copy `.env.example` to an untracked local environment file.
3. Set `OPENROUTER_API_KEY`, `OPENROUTER_SITE_URL`, and the existing application configuration values.
4. Run `npm run dev`.

The production defaults use OpenRouter only. Direct OpenAI and Gemini adapters are retained but disabled by `OPENAI_ENABLED=false` and `GEMINI_ENABLED=false`. AI credentials are server-only and must never use `VITE_`, `NEXT_PUBLIC_`, or `REACT_APP_` prefixes.

See [docs/openrouter-provider-architecture.md](docs/openrouter-provider-architecture.md) for routing, model, security, quota, and Vercel configuration details.
