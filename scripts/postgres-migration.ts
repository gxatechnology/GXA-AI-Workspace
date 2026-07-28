import path from 'path';
import dotenv from 'dotenv';
import { createPostgresPool, importLegacyJsonFile } from '../server/persistence/postgres.js';
import { migrationStatus, runSchemaMigrations } from '../server/persistence/migrations.js';
import { resolvePersistenceConfig } from '../server/persistence/config.js';

dotenv.config();

const command = process.argv[2] || 'status';
if (!['status', 'apply', 'import-json'].includes(command)) throw new Error('Use status, apply, or import-json.');

const fallbackFile = path.resolve(process.env.GXA_DB_FILE || 'db.json');
const config = resolvePersistenceConfig({ ...process.env, PERSISTENCE_PROVIDER: 'postgres' }, fallbackFile);
const pool = createPostgresPool(config.directDatabaseUrl!, config, 1);

try {
  if (command === 'status') {
    const status = await migrationStatus(pool);
    console.log(JSON.stringify({ provider: 'postgres', applied: status.applied, pending: status.pending }, null, 2));
  } else {
    const migrations = await runSchemaMigrations(pool);
    if (command === 'apply') {
      console.log(JSON.stringify({ provider: 'postgres', applied: migrations.applied, pending: migrations.pending }, null, 2));
    } else {
      const fileArgument = process.argv.find(argument => argument.startsWith('--file='))?.slice('--file='.length);
      const file = path.resolve(fileArgument || process.env.GXA_JSON_MIGRATION_FILE || fallbackFile);
      const result = await importLegacyJsonFile(pool, file, 'manual-json-import');
      console.log(JSON.stringify({ provider: 'postgres', migrationsApplied: migrations.applied, imported: result.imported, importedKeys: result.keys, importedRecords: result.records, sourceHash: result.sourceHash }, null, 2));
    }
  }
} catch {
  console.error(JSON.stringify({ provider: 'postgres', error: 'PostgreSQL migration failed.', code: 'POSTGRES_MIGRATION_FAILED' }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
