import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { DataType, newDb } from 'pg-mem';
import request from 'supertest';
import { resolvePersistenceConfig } from '../server/persistence/config.js';
import { normalizeApplicationDatabase } from '../server/persistence/defaultDatabase.js';
import { ApplicationPersistence } from '../server/persistence/index.js';
import { JsonDatabaseAdapter } from '../server/persistence/json.js';
import { MemoryDatabaseAdapter } from '../server/persistence/memory.js';
import { mergeLegacyData } from '../server/persistence/merge.js';
import { migrationStatus, runSchemaMigrations } from '../server/persistence/migrations.js';
import { commitPostgresSnapshot, importLegacyJson, loadPostgresSnapshot, PersistenceConflictError, PersistenceUnavailableError, previewLegacyJsonImport, synchronizeAdminProjections, verifyPostgresRuntime } from '../server/persistence/postgres.js';
import { hashPassword } from '../server/platform.js';
import { PostgresAdminRepository } from '../server/admin.js';

function memoryPool() {
  const database = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
  database.public.registerFunction({ name: 'hashtext', args: [DataType.text], returns: DataType.integer, implementation: () => 1 });
  database.public.registerFunction({ name: 'pg_advisory_xact_lock', args: [DataType.integer], returns: DataType.integer, implementation: () => 1 });
  const adapter = database.adapters.createPg();
  return new adapter.Pool() as unknown as Pool;
}

test('production prefers PostgreSQL and uses memory when DATABASE_URL is unavailable', async () => {
  const emptyProduction = resolvePersistenceConfig({ NODE_ENV: 'production' }, 'db.json');
  assert.equal(emptyProduction.provider, 'memory');
  assert.equal(emptyProduction.fallbackReason, 'missing_database_url');
  const missingPostgres = resolvePersistenceConfig({ NODE_ENV: 'production', PERSISTENCE_PROVIDER: 'postgres' }, 'db.json');
  assert.equal(missingPostgres.provider, 'memory');
  assert.equal(missingPostgres.fallbackReason, 'missing_database_url');
  assert.equal(resolvePersistenceConfig({ NODE_ENV: 'production', PERSISTENCE_PROVIDER: 'json' }, 'db.json').provider, 'memory');
  const config = resolvePersistenceConfig({ NODE_ENV: 'production', PERSISTENCE_PROVIDER: 'postgres', DATABASE_URL: 'server-only-placeholder', DATABASE_SSL: 'verify-full' }, 'db.json');
  assert.equal(config.provider, 'postgres');
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  const persistence = new ApplicationPersistence({ NODE_ENV: 'production' }, 'unused.json');
  await persistence.initialize();
  assert.equal(persistence.provider, 'memory');
});

test('failed PostgreSQL initialization falls back to process-local memory', async () => {
  const failingPostgres: any = {
    provider: 'postgres',
    initialize: async () => { throw new PersistenceUnavailableError(); },
    load: async () => { throw new PersistenceUnavailableError(); },
    commit: async () => { throw new PersistenceUnavailableError(); },
    close: async () => undefined,
  };
  const persistence = new ApplicationPersistence({
    NODE_ENV: 'production',
    PERSISTENCE_PROVIDER: 'postgres',
    DATABASE_URL: 'server-only-placeholder',
  }, 'unused.json', failingPostgres);
  await persistence.initialize();
  assert.equal(persistence.provider, 'memory');
  await persistence.runStandalone(database => {
    database.config.fallback = true;
    persistence.write(database);
  });
  assert.equal(await persistence.runStandalone(database => database.config.fallback), true);
});

test('memory persistence supports request snapshots without writing a file', async () => {
  const adapter = new MemoryDatabaseAdapter();
  await adapter.initialize();
  const snapshot = await adapter.load();
  snapshot.data.config.memory = true;
  await adapter.commit(snapshot, snapshot.data);
  assert.equal((await adapter.load()).data.config.memory, true);
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

test('public plan definitions bypass unavailable persistence at request time', async () => {
  const unavailableAdapter: any = {
    provider: 'postgres',
    initialize: async () => undefined,
    load: async () => { throw new PersistenceUnavailableError(); },
    commit: async () => undefined,
    close: async () => undefined,
  };
  const persistence = new ApplicationPersistence({
    NODE_ENV: 'production',
    PERSISTENCE_PROVIDER: 'postgres',
    DATABASE_URL: 'server-only-placeholder',
  }, 'unused.json', unavailableAdapter);
  const app = express();
  app.use(persistence.middleware());
  app.get('/api/pricing/plans', (_request, response) => response.json({ plans: ['registry-owned'] }));
  app.get('/api/account', (_request, response) => response.json(persistence.read()));
  await request(app).get('/api/pricing/plans').expect(200, { plans: ['registry-owned'] });
  await request(app).get('/api/account').expect(503).expect(response => assert.equal(response.body.code, 'PERSISTENCE_UNAVAILABLE'));
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
    assert.deepEqual(initialStatus.pending, ['0001_persistence_foundation', '0002_phase1_account_foundation', '0003_recurring_billing', '0004_admin_foundation', '0005_billing_analytics']);
    const firstMigration = await runSchemaMigrations(pool);
    const secondMigration = await runSchemaMigrations(pool);
    assert.deepEqual(firstMigration.applied, ['0001_persistence_foundation', '0002_phase1_account_foundation', '0003_recurring_billing', '0004_admin_foundation', '0005_billing_analytics']);
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

test('PostgreSQL projects recurring subscriptions and idempotent event receipts into constrained billing tables', async () => {
  const pool = memoryPool();
  try {
    await runSchemaMigrations(pool);
    await importLegacyJson(pool, { users: {}, documents: {}, config: {}, usage: {} }, 'billing-projection-seed', 'test');
    const snapshot = await loadPostgresSnapshot(pool); const now = new Date().toISOString();
    snapshot.data.subscriptions.subscription = { id: 'subscription', userId: 'user', workspaceId: 'workspace', tenantType: 'personal', tenantId: 'user', planId: 'pro', internalPlanKey: 'pro', billingMode: 'recurring_subscription', provider: 'razorpay', providerPlanId: 'plan_starter', providerSubscriptionId: 'provider_subscription', status: 'active', quantity: 1, billingInterval: 'monthly', amountMinor: 9900, currency: 'INR', activatedAt: now, currentPeriodStart: now, currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(), latestPaymentId: 'payment_unique', createdAt: now, updatedAt: now };
    snapshot.data.subscriptionEvents.event = { id: 'event', subscriptionId: 'subscription', providerEventId: 'provider_event', eventType: 'subscription.activated', providerCreatedAt: now, payloadHash: 'hash-only', processingStatus: 'processed', processedAt: now, createdAt: now };
    snapshot.data.subscriptionPayments.payment = { id: 'payment', subscriptionId: 'subscription', userId: 'user', workspaceId: 'workspace', tenantType: 'personal', tenantId: 'user', internalPlanKey: 'pro', billingType: 'initial_subscription_payment', provider: 'razorpay', providerPaymentId: 'payment_unique', providerSubscriptionId: 'provider_subscription', amountMinor: 9900, expectedAmountPaise: 9900, currency: 'INR', status: 'captured', signatureVerified: true, billingEnvironment: 'test', capturedAt: now, createdAt: now, updatedAt: now };
    snapshot.data.billingReconciliationRuns = { run: { id: 'run', billingEnvironment: 'test', status: 'completed', recordsChecked: 1, recordsUnchanged: 1, recordsSynchronized: 0, recordsAttention: 0, errorCount: 0, startedAt: now, completedAt: now, createdAt: now } };
    await commitPostgresSnapshot(pool, snapshot, snapshot.data);
    const subscription = await pool.query('SELECT provider_subscription_id, amount_paise FROM gxa_billing_subscriptions WHERE id = $1', ['subscription']);
    const event = await pool.query('SELECT provider_event_id, payload_hash FROM gxa_billing_subscription_events WHERE id = $1', ['event']);
    const payment = await pool.query('SELECT provider_payment_id, verification_state, billing_type FROM gxa_billing_payments WHERE id = $1', ['payment']);
    const reconciliation = await pool.query('SELECT status, records_checked FROM gxa_billing_reconciliation_runs WHERE id = $1', ['run']);
    assert.deepEqual(subscription.rows[0], { provider_subscription_id: 'provider_subscription', amount_paise: 9900 });
    assert.deepEqual(event.rows[0], { provider_event_id: 'provider_event', payload_hash: 'hash-only' });
    assert.deepEqual(payment.rows[0], { provider_payment_id: 'payment_unique', verification_state: 'verified', billing_type: 'initial_subscription_payment' });
    assert.deepEqual(reconciliation.rows[0], { status: 'completed', records_checked: 1 });
  } finally { await pool.end(); }
});

test('PostgreSQL admin projection supports server search, filters, pagination, details and audit without secrets', async () => {
  const pool = memoryPool();
  try {
    await runSchemaMigrations(pool);
    const now = new Date().toISOString(); const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const password = hashPassword('admin-projection-password', '11111111111111111111111111111111');
    await importLegacyJson(pool, {
      users: {
        owner: { id: 'owner', name: 'Owner Admin', email: 'owner@example.test', password, role: 'super_admin', status: 'active', subscription: 'free', emailVerifiedAt: now, createdAt: now, updatedAt: now, profile: { company: 'GXA' }, preferences: {} },
        paid: { id: 'paid', name: 'Paid Member', email: 'paid@example.test', password, role: 'user', status: 'active', subscription: 'free', emailVerifiedAt: null, createdAt: now, updatedAt: now, profile: { company: 'Customer' }, preferences: {} },
      }, projects: { paid: [{ id: 'project', name: 'Real project', createdAt: now }] }, documents: { paid: [{ id: 'document', name: 'Real document', createdAt: now }] }, chats: {}, savedPrompts: {}, config: {}, usage: {},
    }, 'admin-projection-seed', 'test');
    const snapshot = await loadPostgresSnapshot(pool);
    snapshot.data.subscriptions.paid = { id: 'paid-subscription', userId: 'paid', workspaceId: 'paid', tenantType: 'personal', tenantId: 'paid', planId: 'pro', status: 'active', sourcePaymentId: 'payment', currentPeriodStart: now, currentPeriodEnd: future, activatedAt: now, createdAt: now, updatedAt: now };
    snapshot.data.adminAuditEvents.push({ id: 'audit-1', actorUserId: 'owner', actorRole: 'super_admin', action: 'users.exported', targetType: 'users', targetId: 'filtered', reason: 'Test export', metadata: { rowCount: 1 }, createdAt: now });
    await commitPostgresSnapshot(pool, snapshot, snapshot.data);
    const client = await pool.connect(); try { await synchronizeAdminProjections(client, snapshot.data); } finally { client.release(); }

    const repository = new PostgresAdminRepository(pool);
    const users = await repository.listUsers({ search: 'Paid', status: 'active', verified: 'false', plan: 'pro', subscriptionStatus: 'active', role: 'user', signupFrom: '', signupTo: '', activeFrom: '', activeTo: '', sort: 'newest', page: 1, pageSize: 25 });
    assert.equal(users.pagination.total, 1); assert.equal(users.users[0].email, 'paid@example.test'); assert.equal(users.users[0].projectsCount, 1); assert.equal(users.users[0].documentsCount, 1);
    assert.equal('password' in users.users[0], false); assert.equal('tokenHash' in users.users[0], false);
    const detail = await repository.userDetail('paid'); assert.equal(detail?.recentProjects[0].name, 'Real project'); assert.equal(detail?.recentDocuments[0].name, 'Real document');
    const audit = await repository.audit({ action: 'users.exported', page: '1', pageSize: '25' }); assert.equal(audit.events.length, 1); assert.deepEqual(audit.events[0].metadata, { rowCount: 1 });
    const projectionCount = await pool.query('SELECT count(*)::int AS count FROM gxa_admin_users'); assert.equal(projectionCount.rows[0].count, 2);
  } finally { await pool.end(); }
});
