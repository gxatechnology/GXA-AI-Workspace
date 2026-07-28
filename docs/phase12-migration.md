# Phase 12 platform migration

The legacy data migration is additive and idempotent. It creates the Phase 12 tenant, organization, membership, session, subscription, usage, API-key, webhook, automation, audit, security, export, deletion and feature-flag stores. Existing Phase 1–11 user and tool data is retained.

## Deployment order

1. Back up the legacy JSON database and verify that the backup can be restored.
2. Run `npm run migration:status` and archive the output.
3. Run `npm run migration:dry-run`; confirm `destructive` is `false` and review every pending change.
4. Run `npm run migration:apply` against the verified legacy JSON backup.
5. Apply the PostgreSQL schema with `npm run db:migrate`.
6. Preview the verified JSON backup with `npm run db:migrate:json:dry-run -- --file=/secure/path/to/db.json`.
7. Import it with `npm run db:migrate:json -- --file=/secure/path/to/db.json`.
8. Repeat the import command and confirm the same source hash is reported as already imported.
9. Start the application and verify authentication, Personal Workspace access, saved documents, settings, admin authorization and one representative Phase 1–11 tool.

The legacy apply command writes a timestamped backup beside the JSON database before using an atomic temporary-file rename. It never deletes a store or record. Re-running it reports no pending schema work.

The PostgreSQL importer keeps database values authoritative, adds missing legacy records and records each source hash transactionally. Password hashes and saved content are copied without being logged.

## Rollback

Stop application writes and retain both database backups. Roll application code back through the normal Git deployment process. JSON fallback may be used only in local or single-instance non-production environments. Do not run a destructive down migration and do not drop the PostgreSQL tables.

Production requires the PostgreSQL adapter. Distributed rate limiting and background workers are still required for complete multi-instance readiness.
