# Phase 12 platform migration

This migration is additive and idempotent. It creates the Phase 12 tenant, organization, membership, session, subscription, usage, API-key, webhook, automation, audit, security, export, deletion and feature-flag stores. Existing Phase 1–11 user and tool data is retained.

## Deployment order

1. Back up the production database and verify that the backup can be restored.
2. Deploy application code with `PLATFORM_ENCRYPTION_KEY` and the existing provider environment variables configured.
3. Run `npm run migration:status` and archive the output.
4. Run `npm run migration:dry-run`; confirm `destructive` is `false` and review every pending change.
5. In a maintenance window, run `npm run migration:apply` once against the production `GXA_DB_FILE`.
6. Start the application and verify authentication, Personal Workspace access, admin authorization and one representative Phase 1–11 tool.

The apply command writes a timestamped backup beside the database before using an atomic temporary-file rename. It never deletes a store or record. Re-running it reports no pending schema work.

## Rollback

Stop application writes, retain the failed migrated file for investigation, and restore the timestamped `.bak` file created by the migration command. Roll application code back through the normal Git deployment process. Do not run a destructive down migration.

The JSON store remains a single-instance persistence mechanism. A horizontally scaled production deployment requires migration to a transactional external database and distributed rate limiting before multi-instance rollout.
