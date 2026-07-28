import crypto from 'crypto';
import fs from 'fs/promises';
import type { Pool, PoolConfig, PoolClient } from 'pg';
import pg from 'pg';
import { changedRootKeys, mergeLegacyData } from './merge.js';
import { normalizeApplicationDatabase } from './defaultDatabase.js';
import { runSchemaMigrations } from './migrations.js';
import type { PersistenceConfig } from './config.js';

const { Pool: PgPool } = pg;
const APPLICATION_NAMESPACE = 'application';

export class PersistenceConflictError extends Error {
  readonly code = 'PERSISTENCE_CONFLICT';
  readonly status = 409;

  constructor() {
    super('The workspace changed during this request. Retry the operation so no data is overwritten.');
    this.name = 'PersistenceConflictError';
  }
}

export class PersistenceUnavailableError extends Error {
  readonly code = 'PERSISTENCE_UNAVAILABLE';
  readonly status = 503;

  constructor() {
    super('Workspace storage is temporarily unavailable. Your local input has not been removed.');
    this.name = 'PersistenceUnavailableError';
  }
}

export interface DatabaseSnapshot {
  data: Record<string, any>;
  original: Record<string, any>;
  versions: Map<string, number>;
  token?: string;
}

export interface DatabaseAdapter {
  readonly provider: 'postgres' | 'json';
  initialize(): Promise<void>;
  load(): Promise<DatabaseSnapshot>;
  commit(snapshot: DatabaseSnapshot, data: Record<string, any>): Promise<void>;
  close(): Promise<void>;
}

export function postgresPoolConfig(connectionString: string, config: PersistenceConfig, maximum = config.poolMax): PoolConfig {
  return {
    connectionString,
    max: maximum,
    connectionTimeoutMillis: config.poolTimeoutMs,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
    ssl: config.ssl,
    application_name: 'gxa-ai-workspace',
  };
}

export function createPostgresPool(connectionString: string, config: PersistenceConfig, maximum?: number) {
  const pool = new PgPool(postgresPoolConfig(connectionString, config, maximum));
  pool.on('error', () => console.error(JSON.stringify({ event: 'database.pool_error', code: 'POSTGRES_POOL_ERROR' })));
  return pool;
}

async function readRows(client: Pick<Pool, 'query'> | PoolClient) {
  const result = await client.query<{ record_key: string; value: any; version: string }>(
    'SELECT record_key, value, version FROM gxa_state_records WHERE namespace = $1 ORDER BY record_key',
    [APPLICATION_NAMESPACE],
  );
  const data: Record<string, any> = {};
  const versions = new Map<string, number>();
  for (const row of result.rows) {
    data[row.record_key] = row.value;
    versions.set(row.record_key, Number(row.version));
  }
  return { data, versions };
}

export async function loadPostgresSnapshot(pool: Pick<Pool, 'query'>): Promise<DatabaseSnapshot> {
  const loaded = await readRows(pool);
  const original = structuredClone(loaded.data);
  return { data: normalizeApplicationDatabase(loaded.data), original, versions: loaded.versions };
}

export async function commitPostgresSnapshot(pool: Pool, snapshot: DatabaseSnapshot, data: Record<string, any>) {
  const changed = changedRootKeys(snapshot.original, data);
  if (!changed.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const key of changed) {
      const version = snapshot.versions.get(key);
      if (data[key] === undefined) {
        const deleted = await client.query('DELETE FROM gxa_state_records WHERE namespace = $1 AND record_key = $2 AND version = $3', [APPLICATION_NAMESPACE, key, version]);
        if (deleted.rowCount !== 1) throw new PersistenceConflictError();
      } else if (version === undefined) {
        const inserted = await client.query('INSERT INTO gxa_state_records (namespace, record_key, value) VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING', [APPLICATION_NAMESPACE, key, JSON.stringify(data[key])]);
        if (inserted.rowCount !== 1) throw new PersistenceConflictError();
      } else {
        const updated = await client.query('UPDATE gxa_state_records SET value = $3::jsonb, version = version + 1, updated_at = NOW() WHERE namespace = $1 AND record_key = $2 AND version = $4', [APPLICATION_NAMESPACE, key, JSON.stringify(data[key]), version]);
        if (updated.rowCount !== 1) throw new PersistenceConflictError();
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof PersistenceConflictError) throw error;
    throw new PersistenceUnavailableError();
  } finally {
    client.release();
  }
}

function recordCount(database: Record<string, any>) {
  return Object.values(database).reduce((total, value) => total + (Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 1), 0);
}

export async function importLegacyJson(pool: Pool, source: Record<string, any>, sourceHash: string, sourceLabel: string) {
  const normalized = normalizeApplicationDatabase(source);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gxa-json-import'))");
    const alreadyImported = await client.query('SELECT 1 FROM gxa_json_imports WHERE source_hash = $1', [sourceHash]);
    if (alreadyImported.rowCount) {
      await client.query('COMMIT');
      return { imported: false, sourceHash, keys: 0, records: 0 };
    }
    const current = await readRows(client);
    let importedKeys = 0;
    for (const [key, sourceValue] of Object.entries(normalized)) {
      const existingValue = current.data[key];
      const merged = existingValue === undefined ? sourceValue : mergeLegacyData(existingValue, sourceValue);
      if (existingValue === undefined) {
        await client.query('INSERT INTO gxa_state_records (namespace, record_key, value) VALUES ($1, $2, $3::jsonb)', [APPLICATION_NAMESPACE, key, JSON.stringify(merged)]);
        importedKeys += 1;
      } else if (JSON.stringify(merged) !== JSON.stringify(existingValue)) {
        await client.query('UPDATE gxa_state_records SET value = $3::jsonb, version = version + 1, updated_at = NOW() WHERE namespace = $1 AND record_key = $2', [APPLICATION_NAMESPACE, key, JSON.stringify(merged)]);
        importedKeys += 1;
      }
    }
    await client.query('INSERT INTO gxa_json_imports (source_hash, source_label, imported_keys) VALUES ($1, $2, $3)', [sourceHash, sourceLabel.slice(0, 200), importedKeys]);
    await client.query('COMMIT');
    return { imported: true, sourceHash, keys: importedKeys, records: recordCount(normalized) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function importLegacyJsonFile(pool: Pool, file: string, sourceLabel = 'legacy-json') {
  const bytes = await fs.readFile(file);
  const sourceHash = crypto.createHash('sha256').update(bytes).digest('hex');
  let parsed: unknown;
  try { parsed = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error('The legacy JSON database is invalid and was not imported.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The legacy JSON database must contain an object.');
  return importLegacyJson(pool, parsed as Record<string, any>, sourceHash, sourceLabel);
}

export class PostgresDatabaseAdapter implements DatabaseAdapter {
  readonly provider = 'postgres' as const;
  readonly pool: Pool;
  private migrationPool: Pool | null;
  private readonly legacyJsonFile: string;

  constructor(private readonly config: PersistenceConfig) {
    this.pool = createPostgresPool(config.databaseUrl!, config);
    this.migrationPool = createPostgresPool(config.directDatabaseUrl!, config, 1);
    this.legacyJsonFile = config.jsonFile;
  }

  async initialize() {
    try {
      const migrationPool = this.migrationPool;
      if (!migrationPool) throw new PersistenceUnavailableError();
      await runSchemaMigrations(migrationPool);
      await this.pool.query('SELECT 1');
      const existing = await this.pool.query('SELECT 1 FROM gxa_state_records WHERE namespace = $1 LIMIT 1', [APPLICATION_NAMESPACE]);
      if (!existing.rowCount) {
        try { await importLegacyJsonFile(migrationPool, this.legacyJsonFile, 'automatic-initial-import'); }
        catch (error: any) {
          if (error?.code === 'ENOENT') {
            const empty = normalizeApplicationDatabase({});
            const hash = crypto.createHash('sha256').update(JSON.stringify(empty)).digest('hex');
            await importLegacyJson(migrationPool, empty, hash, 'empty-database-bootstrap');
          } else throw error;
        }
      }
    } catch {
      throw new PersistenceUnavailableError();
    } finally {
      if (this.migrationPool) {
        await this.migrationPool.end().catch(() => undefined);
        this.migrationPool = null;
      }
    }
  }

  async load(): Promise<DatabaseSnapshot> {
    try {
      return await loadPostgresSnapshot(this.pool);
    } catch {
      throw new PersistenceUnavailableError();
    }
  }

  async commit(snapshot: DatabaseSnapshot, data: Record<string, any>) {
    await commitPostgresSnapshot(this.pool, snapshot, data);
  }

  async close() {
    await this.pool.end();
    if (this.migrationPool) await this.migrationPool.end();
  }
}
