import fs from 'fs';
import path from 'path';
import { phase12PlatformMigration } from '../migrations/phase12-platform-v1.js';

const command = process.argv[2] || 'dry-run';
if (!['status', 'dry-run', 'apply'].includes(command)) throw new Error('Use status, dry-run, or apply.');
const databasePath = path.resolve(process.env.GXA_DB_FILE || 'db.json');
if (!fs.existsSync(databasePath)) throw new Error(`Database file does not exist: ${databasePath}`);
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const preview = phase12PlatformMigration.dryRun(database);

console.log(JSON.stringify({ migration: phase12PlatformMigration.id, databasePath, currentVersion: Number(database.schemaVersion || 0), targetVersion: phase12PlatformMigration.toVersion, destructive: false, pendingChanges: preview.changes }, null, 2));

if (command === 'apply' && preview.changed) {
  const backupPath = `${databasePath}.pre-phase12-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(databasePath, backupPath);
  const migrated = phase12PlatformMigration.apply(database);
  const temporaryPath = `${databasePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(migrated.db, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryPath, databasePath);
  console.log(JSON.stringify({ applied: true, backupPath, changes: migrated.changes }, null, 2));
}
