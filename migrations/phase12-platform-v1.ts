import { applyPlatformMigration } from '../server/platform.js';

export const phase12PlatformMigration = {
  id: 'phase12-platform-v1',
  fromVersion: 0,
  toVersion: 12,
  destructive: false,
  description: 'Add tenant, organization, RBAC, session, billing, usage, API, webhook, automation, audit and lifecycle stores.',
  dryRun(database: any) { return applyPlatformMigration(database, { dryRun: true }); },
  apply(database: any) { return applyPlatformMigration(database); },
};
