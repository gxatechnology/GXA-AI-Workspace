# GXA Developer API v1

Only the endpoints documented here are public. Internal workspace endpoints are not part of the developer API contract.

## Authentication

Create a scoped API key in **Workspace & Organization → API & Webhooks**. The secret is displayed once and stored only as a SHA-256 hash. Send it as `Authorization: Bearer gxa_live_REPLACE_WITH_YOUR_KEY`. Never put keys in browser code, URLs, logs or source control.

Responses include standard `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` headers. Limits are enforced per key as well as by endpoint and tenant plan. Errors use `{ "error": "...", "code": "..." }` with an appropriate HTTP status.

## `GET /api/v1/usage`

Required scope: `usage:read`.

Returns up to 100 recent committed usage events for the key's server-resolved tenant. Usage events contain quantities and operation metadata, not prompts or private content.

```bash
curl https://YOUR_DOMAIN/api/v1/usage \
  -H "Authorization: Bearer gxa_live_REPLACE_WITH_YOUR_KEY"
```

## `POST /api/v1/translate`

Required scope: `translation:write`. An `Idempotency-Key` is strongly recommended. The key is tenant-scoped, prevents concurrent duplicate processing and reuses a completed response for 24 hours.

```bash
curl https://YOUR_DOMAIN/api/v1/translate \
  -H "Authorization: Bearer gxa_live_REPLACE_WITH_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: customer-request-123" \
  -d '{"source":"Hello","sourceLanguage":"en","targetLanguage":"hi","mode":"Standard"}'
```

The request is validated against server configuration, reserves tenant API quota before provider work, commits one request after success and releases the reservation after failure.

## Outgoing webhooks

Webhook endpoints require HTTPS. Private, loopback and link-local destinations are rejected before save and again before delivery. Events are signed with the one-time endpoint secret:

- `X-GXA-Event`
- `X-GXA-Timestamp`
- `X-GXA-Delivery`
- `X-GXA-Signature: v1=<hex HMAC-SHA256>`

Verify the signature over `<timestamp>.<raw JSON body>`, use constant-time comparison, reject old timestamps and store delivery IDs to prevent replay. Rotation invalidates the prior signing secret immediately.

The registry currently exposes only webhooks as a working integration. SDKs, service accounts, SSO and MFA are not advertised as available.
