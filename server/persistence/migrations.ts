import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Pool, PoolClient } from 'pg';

export interface SchemaMigration {
  id: string;
  checksum: string;
  sql: string;
}

export interface MigrationResult {
  applied: string[];
  pending: string[];
}

const migrationDirectory = () => path.join(process.cwd(), 'migrations', 'postgres');

export async function loadSchemaMigrations(directory = migrationDirectory()): Promise<SchemaMigration[]> {
  const entries = (await fs.readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /^\d+.*\.sql$/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  const migrations: SchemaMigration[] = [];
  for (const entry of entries) {
    const sql = await fs.readFile(path.join(directory, entry.name), 'utf8');
    migrations.push({ id: entry.name.replace(/\.sql$/, ''), checksum: crypto.createHash('sha256').update(sql).digest('hex'), sql });
  }
  if (!migrations.length) throw new Error('No PostgreSQL schema migrations were found.');
  return migrations;
}

async function ensureMigrationTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS gxa_schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function migrationStatus(pool: Pool, directory?: string): Promise<MigrationResult> {
  const migrations = await loadSchemaMigrations(directory);
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    const result = await client.query<{ id: string; checksum: string }>('SELECT id, checksum FROM gxa_schema_migrations ORDER BY id');
    const appliedById = new Map(result.rows.map(row => [row.id, row.checksum]));
    for (const migration of migrations) {
      const checksum = appliedById.get(migration.id);
      if (checksum && checksum !== migration.checksum) throw new Error(`Applied migration checksum mismatch: ${migration.id}`);
    }
    return { applied: migrations.filter(item => appliedById.has(item.id)).map(item => item.id), pending: migrations.filter(item => !appliedById.has(item.id)).map(item => item.id) };
  } finally {
    client.release();
  }
}

export async function runSchemaMigrations(pool: Pool, directory?: string): Promise<MigrationResult> {
  const migrations = await loadSchemaMigrations(directory);
  const applied: string[] = [];
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    for (const migration of migrations) {
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('gxa-schema-migrations'))");
        const existing = await client.query<{ checksum: string }>('SELECT checksum FROM gxa_schema_migrations WHERE id = $1', [migration.id]);
        if (existing.rowCount) {
          if (existing.rows[0].checksum !== migration.checksum) throw new Error(`Applied migration checksum mismatch: ${migration.id}`);
          await client.query('COMMIT');
          continue;
        }
        await client.query(migration.sql);
        await client.query('INSERT INTO gxa_schema_migrations (id, checksum) VALUES ($1, $2)', [migration.id, migration.checksum]);
        await client.query('COMMIT');
        applied.push(migration.id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
  const status = await migrationStatus(pool, directory);
  return { applied, pending: status.pending };
}
