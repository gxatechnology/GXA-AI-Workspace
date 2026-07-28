# PostgreSQL persistence foundation

GXA AI Workspace uses PostgreSQL for production persistence. JSON remains a local-development fallback and is rejected when `NODE_ENV=production` or `VERCEL` is present.

## Storage model

The adapter stores each existing top-level application store as a versioned JSONB record. This preserves the current application data model while moving the source of truth to a durable transactional database. Updates touch only changed stores and use optimistic version checks. A concurrent update to the same store returns a safe conflict instead of silently overwriting data.

The foundation creates:

- `gxa_schema_migrations` for immutable migration IDs and checksums;
- `gxa_state_records` for versioned application stores;
- `gxa_json_imports` for idempotent legacy-import receipts.

This is intentionally a persistence foundation. It does not add or change prices, credits, subscriptions, entitlements, checkout, or billing UI.

## Required production variables

- `PERSISTENCE_PROVIDER=postgres`
- `DATABASE_URL` for pooled application traffic
- `DIRECT_DATABASE_URL` for schema migrations and imports
- `DATABASE_SSL` (`require`, `verify-full`, or `disable`)
- `DATABASE_POOL_MAX`
- `DATABASE_POOL_TIMEOUT_MS`

Values are server-only and must never be exposed to the frontend, source control, logs, screenshots, or API responses.

## Deployment and migration

1. Back up the legacy JSON database and verify the backup.
2. Confirm both database URLs point to the intended Supabase project without printing them.
3. Run `npm run db:migrate:status`.
4. Run `npm run db:migrate` using the direct database connection.
5. Run `npm run db:migrate:json -- --file=/secure/path/to/db.json` once for every distinct legacy database that must be retained.
6. Run the import command again and confirm `imported` is `false` for the same source hash.
7. Set `PERSISTENCE_PROVIDER=postgres` and deploy.
8. Verify login, saved documents, Projects, settings, and one write/read cycle before enabling normal traffic.

On an entirely empty PostgreSQL database, application startup imports the configured legacy JSON file once. Startup never merges a changed bundled JSON file into a database that already contains state; later imports must use the explicit migration command.

The importer is additive. PostgreSQL values remain authoritative, missing object properties and records are added, arrays are deduplicated by stable `id` or `key`, password hashes are copied unchanged, and each source hash is recorded transactionally.

## Rollback

Do not drop PostgreSQL tables. Stop writes, retain the PostgreSQL backup, restore the verified JSON backup to a local or single-instance environment, set `PERSISTENCE_PROVIDER=json` only outside production, and roll application code back through Git. Production deliberately refuses JSON fallback.

## Remaining infrastructure work

- Rate-limit and active-request counters are still process-local and need a distributed implementation.
- Background jobs remain in-process and need a durable worker/queue.
- The versioned JSONB stores should be normalized into tenant/resource tables as scale and query requirements grow.
- The live Supabase migration and preservation smoke test must run in the controlled deployment environment because database credentials are not stored in this repository.
