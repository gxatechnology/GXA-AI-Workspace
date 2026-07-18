# Phase 12 platform architecture and status

## Implemented

- Hashed-password registration/login, opaque hashed sessions, logout, device-session revocation and password change.
- Idempotent Personal Workspace creation and server-persisted active workspace selection.
- Organizations, memberships, eight system roles, permissions, invitations with hashed expiring tokens, seat limits, teams and team membership.
- Server-resolved tenants for Projects, Documents, AI Chats, Originality reports, translation data, Brand Kits, business assets and media assets.
- Central INR plan registry, entitlements, feature flags, usage events, quota reservations and backend-only Razorpay order/signature/webhook handling.
- Scoped one-time API keys, rotation/revocation, per-key rate limits, public v1 usage/translation endpoints and tenant-scoped idempotency.
- HTTPS outgoing webhooks with DNS/private-network SSRF checks, encrypted signing secrets, HMAC signatures, delivery metadata and secret rotation.
- Structured automations with approved triggers, conditions and actions; no arbitrary code or expressions.
- Tenant audit logs, platform security events, expiring data exports, reauthenticated scheduled deletion requests and last-owner safeguards.
- Protected admin APIs for real users, organizations, feature flags, provider credential status, migrations and system readiness.

## Explicitly unavailable or readiness-only

- Email delivery, password reset and email verification.
- Billing portal, subscription cancellation/payment-method management and provider invoice downloads.
- Trial issuance and credit balances.
- Durable distributed job workers, scheduled automations, retry workers and dead-letter processing.
- Custom organization roles, verified domains, service accounts, OAuth connected accounts, SSO and MFA.
- Persistent favorites, collections, trash recovery and generalized sharing ACLs.
- Full public APIs beyond usage and translation.

Unavailable capabilities are not presented as working. The UI uses empty states or readiness labels and does not fabricate records.

## Deployment constraint

The inherited repository uses an atomic JSON file store. It is safe for a single process with durable disk but is not a horizontally scalable transactional database. On Vercel, the serverless function uses `/tmp`, which is ephemeral and suitable only for Preview UI/API smoke checks—not production identity, billing or tenant data. Production rollout must remain blocked until the JSON adapter is replaced with a durable transactional database and the in-memory rate limiter/job execution model is replaced with distributed infrastructure.

No destructive migration or data reset is included. Existing objects retain their prior storage keys for Personal Workspace and use `org:<organizationId>` for organization-owned data.
