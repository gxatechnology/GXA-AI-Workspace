import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { DataType, newDb } from 'pg-mem';
import request from 'supertest';
import { resolvePersistenceConfig, PersistenceConfigurationError } from '../server/persistence/config.js';
import { normalizeApplicationDatabase } from '../server/persistence/defaultDatabase.js';
import { ApplicationPersistence } from '../server/persistence/index.js';
import { JsonDatabaseAdapter } from '../server/persistence/json.js';
import { mergeLegacyData } from '../server/persistence/merge.js';
import { migrationStatus, runSchemaMigrations } from '../server/persistence/migrations.js';
import { commitPostgresSnapshot, importLegacyJson, loadPostgresSnapshot, PersistenceConflictError, PersistenceUnavailableError, previewLegacyJsonImport, verifyPostgresRuntime } from '../server/persistence/postgres.js';
import { hashPassword } from '../server/platform.js';

function memoryPool() {
  const database = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
  database.public.registerFunction({ name: 'hashtext', args: [DataType.text], returns: DataType.integer, implementation: () => 1 });
  database.public.registerFunction({ name: 'pg_advisory_xact_lock', args: [DataType.integer], returns: DataType.integer, implementation: () => 1 });
  const adapter = database.adapters.createPg();
  return new adapter.Pool() as unknown as Pool;
}

test('production persistence requires PostgreSQL and never falls back to JSON', () => {
  assert.throws(() => resolvePersistenceConfig({ NODE_ENV: 'production', PERSISTENCE_PROVIDER: 'json' }, 'db.json'), (error: any) => error instanceof PersistenceConfigurationError && error.code === 'POSTGRES_REQUIRED_IN_PRODUCTION');
  assert.throws(() => resolvePersistenceConfig({ NODE_ENV: 'production', PERSISTENCE_PROVIDER: 'postgres' }, 'db.json'), (error: any) => error instanceof PersistenceConfigurationError && error.code === 'DATABASE_URL_REQUIRED');
  const config = resolvePersistenceConfig({ NODE_ENV: 'production', PERSISTENCE_PROVIDER: 'postgres', DATABASE_URL: 'server-only-placeholder', DATABASE_SSL: 'verify-full' }, 'db.json');
  assert.equal(config.provider, 'postgres');
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test('PostgreSQL persistence never creates or writes the JSON fallback file', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gxa-postgres-selection-'));
  const jsonFile = path.join(directory, 'db.json');
  const persistence = new ApplicationPersistence({
    NODE_ENV: 'test',
    PERSISTENCE_PROVIDER: 'postgres',
    DATABASE_URL: 'postgresql://postgres:placeholder@127.0.0.1:1/gxa',
  }, jsonFile);
  try {
    assert.equal(persistence.provider, 'postgres');
    await assert.rejects(fs.access(jsonFile), (error: NodeJS.ErrnoException) => error.code === 'ENOENT');
  } finally {
    await persistence.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('normalization preserves password hashes, saved documents, and settings', () => {
  const password = hashPassword('migration-password', '0123456789abcdef0123456789abcdef');
  const source: any = {
    users: { user: { id: 'user', email: 'user@example.test', password } },
    documents: { user: [{ id: 'document-1', content: 'preserve me' }] },
    config: { paraphrase_word_limit: 777, custom_setting: true },
    usage: { user: { '2026-01-01': { chats: 2 } } },
  };
  const normalized = normalizeApplicationDatabase(source);
  assert.equal(normalized.users.user.password, password);
  assert.deepEqual(normalized.documents.user, source.documents.user);
  assert.equal(normalized.config.paraphrase_word_limit, 777);
  assert.equal(normalized.config.custom_setting, true);
  assert.deepEqual(normalized.usage, source.usage);
});

test('legacy merge is additive, destination-authoritative, and idempotent', () => {
  const destination: any = { users: { existing: { id: 'existing', name: 'Current' } }, documents: [{ id: 'doc-1', title: 'Current' }] };
  const source: any = { users: { existing: { id: 'existing', name: 'Legacy', locale: 'en' }, added: { id: 'added' } }, documents: [{ id: 'doc-1', title: 'Legacy' }, { id: 'doc-2' }] };
  const once = mergeLegacyData(destination, source);
  const twice = mergeLegacyData(once, source);
  assert.equal(once.users.existing.name, 'Current');
  assert.equal(once.users.existing.locale, 'en');
  assert.ok(once.users.added);
  assert.deepEqual(once.documents.map((item: any) => item.id), ['doc-1', 'doc-2']);
  assert.deepEqual(twice, once);
});

test('JSON remains an atomic local fallback and rejects stale writers', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gxa-json-adapter-'));
  const file = path.join(directory, 'db.json');
  const adapter = new JsonDatabaseAdapter(file);
  try {
    await adapter.initialize();
    const first = await adapter.load();
    const stale = await adapter.load();
    first.data.users.user = { id: 'user', password: 'scrypt$preserved' };
    await adapter.commit(first, first.data);
    stale.data.documents.user = [{ id: 'doc-1' }];
    await assert.rejects(adapter.commit(stale, stale.data), PersistenceConflictError);
    const saved = await adapter.load();
    assert.equal(saved.data.users.user.password, 'scrypt$preserved');
    assert.equal(saved.data.documents.user, undefined);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('request middleware commits before returning a successful response', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gxa-persistence-middleware-'));
  const file = path.join(directory, 'db.json');
  const persistence = new ApplicationPersistence({ NODE_ENV: 'test', PERSISTENCE_PROVIDER: 'json' }, file);
  const app = express();
  app.use(express.json());
  app.use(persistence.middleware());
  app.post('/api/value', (_req, response) => {
    const database = persistence.read();
    database.settings = { preserved: true };
    persistence.write(database);
    response.status(201).json({ saved: true });
  });
  app.get('/api/value', (_req, response) => response.json(persistence.read().settings));
  try {
    await persistence.initialize();
    await request(app).post('/api/value').expect(201, { saved: true });
    await request(app).get('/api/value').expect(200, { preserved: true });
  } finally {
    await persistence.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('request middleware replaces an uncommitted success with a safe conflict', async () => {
  const initial = normalizeApplicationDatabase({});
  const conflictingAdapter: any = {
    provider: 'json',
    initialize: async () => undefined,
    load: async () => ({ data: structuredClone(initial), original: structuredClone(initial), versions: new Map(), token: 'one' }),
    commit: async () => { throw new PersistenceConflictError(); },
    close: async () => undefined,
  };
  const persistence = new ApplicationPersistence({ NODE_ENV: 'test', PERSISTENCE_PROVIDER: 'json' }, 'unused.json', conflictingAdapter);
  const app = express();
  app.use(persistence.middleware());
  app.post('/api/value', (_req, response) => {
    const database = persistence.read();
    database.settings = { changed: true };
    persistence.write(database);
    response.status(201).json({ saved: true });
  });
  const response = await request(app).post('/api/value').expect(409);
  assert.equal(response.body.code, 'PERSISTENCE_CONFLICT');
  assert.equal(response.body.saved, undefined);
});

test('PostgreSQL migrations and JSON import are idempotent and non-destructive', async () => {
  const pool = memoryPool();
  try {
    const initialStatus = await migrationStatus(pool);
    assert.deepEqual(initialStatus.applied, []);
    assert.deepEqual(initialStatus.pending, ['0001_persistence_foundation', '0002_phase1_account_foundation']);
    const firstMigration = await runSchemaMigrations(pool);
    const secondMigration = await runSchemaMigrations(pool);
    assert.deepEqual(firstMigration.applied, ['0001_persistence_foundation', '0002_phase1_account_foundation']);
    assert.deepEqual(secondMigration.applied, []);

    const password = hashPassword('migration-password', 'abcdefabcdefabcdefabcdefabcdefab');
    const source: any = { users: { user: { id: 'user', password } }, documents: { user: [{ id: 'doc-1', content: 'saved' }] }, config: { paraphrase_word_limit: 321 }, usage: {} };
    const preview = await previewLegacyJsonImport(pool, source, 'source-hash-1');
    assert.equal(preview.wouldImport, true);
    assert.equal((await pool.query('SELECT COUNT(*) AS count FROM gxa_state_records')).rows[0].count, 0);
    assert.equal((await pool.query('SELECT COUNT(*) AS count FROM gxa_json_imports')).rows[0].count, 0);
    const firstImport = await importLegacyJson(pool, source, 'source-hash-1', 'test');
    const secondImport = await importLegacyJson(pool, source, 'source-hash-1', 'test');
    const repeatedPreview = await previewLegacyJsonImport(pool, source, 'source-hash-1');
    assert.equal(firstImport.imported, true);
    assert.equal(secondImport.imported, false);
    assert.equal(repeatedPreview.wouldImport, false);
    const snapshot = await loadPostgresSnapshot(pool);
    assert.equal(snapshot.data.users.user.password, password);
    assert.equal(snapshot.data.documents.user[0].content, 'saved');
    assert.equal(snapshot.data.config.paraphrase_word_limit, 321);
  } finally { await pool.end(); }
});

test('PostgreSQL runtime readiness uses the pooled connection and requires the migrated import receipt', async () => {
  const pool = memoryPool();
  try {
    await assert.rejects(verifyPostgresRuntime(pool), PersistenceUnavailableError);
    await runSchemaMigrations(pool);
    await assert.rejects(verifyPostgresRuntime(pool), PersistenceUnavailableError);
    await importLegacyJson(pool, { users: {}, documents: {}, config: {}, usage: {} }, 'runtime-seed-hash', 'test');
    await verifyPostgresRuntime(pool);
  } finally { await pool.end(); }
});

test('PostgreSQL commits allow independent stores and reject same-store lost updates', async () => {
  const pool = memoryPool();
  try {
    await runSchemaMigrations(pool);
    await importLegacyJson(pool, { users: {}, documents: {}, config: {}, usage: {} }, 'seed-hash', 'test');
    const usersWriter = await loadPostgresSnapshot(pool);
    const documentsWriter = await loadPostgresSnapshot(pool);
    usersWriter.data.users.user = { id: 'user' };
    documentsWriter.data.documents.user = [{ id: 'doc-1' }];
    await commitPostgresSnapshot(pool, usersWriter, usersWriter.data);
    await commitPostgresSnapshot(pool, documentsWriter, documentsWriter.data);

    const first = await loadPostgresSnapshot(pool);
    const stale = await loadPostgresSnapshot(pool);
    first.data.users.user.name = 'First';
    stale.data.users.user.name = 'Stale';
    await commitPostgresSnapshot(pool, first, first.data);
    await assert.rejects(commitPostgresSnapshot(pool, stale, stale.data), PersistenceConflictError);
    const saved = await loadPostgresSnapshot(pool);
    assert.equal(saved.data.users.user.name, 'First');
    assert.equal(saved.data.documents.user[0].id, 'doc-1');
  } finally { await pool.end(); }
});
