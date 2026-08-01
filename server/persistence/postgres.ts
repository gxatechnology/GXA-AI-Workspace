import crypto from 'crypto';
import fs from 'fs/promises';
import type { Pool, PoolConfig, PoolClient } from 'pg';
import pg from 'pg';
import { changedRootKeys, mergeLegacyData } from './merge.js';
import { normalizeApplicationDatabase } from './defaultDatabase.js';
import { migrationStatus } from './migrations.js';
import type { PersistenceConfig } from './config.js';
import { projectAdminUser } from '../admin.js';

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
  readonly provider: 'postgres' | 'json' | 'memory';
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
    await synchronizeBillingProjections(client, data, changed);
    await synchronizeAdminProjections(client, data, changed, snapshot.original);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof PersistenceConflictError) throw error;
    throw new PersistenceUnavailableError();
  } finally {
    client.release();
  }
}

export async function synchronizeBillingProjections(client: PoolClient, data: Record<string, any>, changed: string[] = ['subscriptions', 'subscriptionEvents', 'pendingCheckouts', 'subscriptionPayments', 'billingReconciliationRuns']) {
  if (changed.includes('subscriptions')) {
    for (const subscription of Object.values<any>(data.subscriptions || {})) {
      const billingMode = subscription.billingMode || (subscription.providerSubscriptionId ? 'recurring_subscription' : 'one_time_monthly');
      const userId = subscription.userId || (subscription.tenantType === 'personal' ? subscription.tenantId : null);
      const tenantId = subscription.tenantId || userId;
      const planKey = subscription.internalPlanKey || subscription.planId;
      if (!subscription.id || !tenantId || !planKey) continue;
      await client.query(`
        INSERT INTO gxa_billing_subscriptions (
          id, user_id, workspace_id, tenant_type, tenant_id, internal_plan_key, billing_mode, provider,
          provider_plan_id, provider_subscription_id, provider_customer_id, status, quantity, billing_interval,
          amount_paise, currency, current_period_start, current_period_end, next_charge_at, authenticated_at,
          activated_at, paused_at, resumed_at, cancelled_at, cancel_at_period_end, completed_at, halted_at,
          expired_at, latest_payment_id, latest_invoice_id, created_at, updated_at, billing_environment,
          reconciliation_status, last_reconciled_at, last_provider_event_at, latest_payment_at, verification_error
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id=EXCLUDED.user_id, workspace_id=EXCLUDED.workspace_id, internal_plan_key=EXCLUDED.internal_plan_key,
          billing_mode=EXCLUDED.billing_mode, provider_plan_id=EXCLUDED.provider_plan_id,
          provider_subscription_id=EXCLUDED.provider_subscription_id, provider_customer_id=EXCLUDED.provider_customer_id,
          status=EXCLUDED.status, quantity=EXCLUDED.quantity, amount_paise=EXCLUDED.amount_paise,
          current_period_start=EXCLUDED.current_period_start, current_period_end=EXCLUDED.current_period_end,
          next_charge_at=EXCLUDED.next_charge_at, authenticated_at=EXCLUDED.authenticated_at,
          activated_at=EXCLUDED.activated_at, paused_at=EXCLUDED.paused_at, resumed_at=EXCLUDED.resumed_at,
          cancelled_at=EXCLUDED.cancelled_at, cancel_at_period_end=EXCLUDED.cancel_at_period_end,
          completed_at=EXCLUDED.completed_at, halted_at=EXCLUDED.halted_at, expired_at=EXCLUDED.expired_at,
          latest_payment_id=EXCLUDED.latest_payment_id, latest_invoice_id=EXCLUDED.latest_invoice_id,
          updated_at=EXCLUDED.updated_at, billing_environment=EXCLUDED.billing_environment,
          reconciliation_status=EXCLUDED.reconciliation_status, last_reconciled_at=EXCLUDED.last_reconciled_at,
          last_provider_event_at=EXCLUDED.last_provider_event_at, latest_payment_at=EXCLUDED.latest_payment_at,
          verification_error=EXCLUDED.verification_error
      `, [
        subscription.id, userId, subscription.workspaceId || tenantId, subscription.tenantType || 'personal', tenantId,
        planKey, billingMode, subscription.provider || 'razorpay', subscription.providerPlanId || null,
        subscription.providerSubscriptionId || null, subscription.providerCustomerId || null, subscription.status || 'created', Number(subscription.quantity || 1),
        subscription.billingInterval || 'monthly', Number(subscription.amountMinor || subscription.amountPaise || 0), subscription.currency || 'INR',
        subscription.currentPeriodStart || null, subscription.currentPeriodEnd || null, subscription.nextChargeAt || null, subscription.authenticatedAt || null,
        subscription.activatedAt || null, subscription.pausedAt || null, subscription.resumedAt || null, subscription.cancelledAt || null,
        Boolean(subscription.cancelAtPeriodEnd), subscription.completedAt || null, subscription.haltedAt || null, subscription.expiredAt || null,
        subscription.latestPaymentId || null, subscription.latestInvoiceId || null, subscription.createdAt || new Date().toISOString(), subscription.updatedAt || subscription.createdAt || new Date().toISOString(),
        ['test', 'live'].includes(subscription.billingEnvironment) ? subscription.billingEnvironment : 'unknown', subscription.reconciliationStatus || 'not_checked',
        subscription.lastReconciledAt || null, subscription.lastProviderEventAt || null, subscription.latestPaymentAt || null, subscription.verificationError || null,
      ]);
    }
  }
  if (changed.includes('subscriptionEvents')) {
    for (const event of Object.values<any>(data.subscriptionEvents || {})) {
      if (!event.id || !event.providerEventId || !event.eventType || !event.payloadHash || !event.processingStatus) continue;
      await client.query(`
        INSERT INTO gxa_billing_subscription_events (
          id, subscription_id, provider_event_id, event_type, provider_created_at, payload_hash,
          processing_status, processing_error, processed_at, created_at, billing_environment
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (provider_event_id) DO UPDATE SET
          subscription_id=EXCLUDED.subscription_id, processing_status=EXCLUDED.processing_status,
          processing_error=EXCLUDED.processing_error, processed_at=EXCLUDED.processed_at,
          billing_environment=EXCLUDED.billing_environment
      `, [event.id, event.subscriptionId || null, event.providerEventId, event.eventType, event.providerCreatedAt || null, event.payloadHash,
        event.processingStatus, event.processingError || null, event.processedAt || null, event.createdAt || new Date().toISOString(),
        ['test', 'live'].includes(event.billingEnvironment) ? event.billingEnvironment : 'unknown']);
    }
  }
  if (changed.includes('pendingCheckouts') || changed.includes('subscriptionPayments')) {
    const subscriptions = data.subscriptions || {};
    const records = [
      ...Object.values<any>(data.pendingCheckouts || {}).map(record => ({ record, source: 'one_time' })),
      ...Object.values<any>(data.subscriptionPayments || {}).map(record => ({ record, source: 'subscription' })),
    ];
    const unique = new Map<string, { record: any; source: string }>();
    for (const item of records) if (item.record?.id) unique.set(String(item.record.id), item);
    for (const { record, source } of unique.values()) {
      const subscription = record.subscriptionId ? subscriptions[record.subscriptionId] : null;
      const providerPaymentId = record.providerPaymentId || record.paymentId || null;
      const amount = Number(record.amountMinor || record.amountPaise || 0); const expected = Number(record.expectedAmountPaise || subscription?.amountMinor || amount);
      // Historical captured labels are not enough to prove webhook/signature verification.
      // Only records carrying the server-written verification receipt may enter revenue totals.
      const signatureVerified = record.signatureVerified === true;
      const verified = record.status === 'captured' && signatureVerified && Boolean(providerPaymentId) && amount === expected && String(record.currency || 'INR').toUpperCase() === 'INR';
      const verificationState = verified ? 'verified' : ['verification_failed', 'webhook_rejected'].includes(record.status) ? 'failed' : 'unverified';
      const environment = ['test', 'live'].includes(record.billingEnvironment || subscription?.billingEnvironment) ? (record.billingEnvironment || subscription.billingEnvironment) : 'unknown';
      await client.query(`INSERT INTO gxa_billing_payments (
        id,user_id,workspace_id,tenant_type,tenant_id,internal_plan_key,billing_type,provider,
        provider_payment_id,provider_order_id,provider_subscription_id,subscription_id,amount_paise,
        expected_amount_paise,currency,status,signature_verified,verification_state,billing_environment,
        captured_at,access_period_start,access_period_end,failure_code,reconciliation_status,last_reconciled_at,
        created_at,updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      ON CONFLICT (id) DO UPDATE SET
        user_id=EXCLUDED.user_id,workspace_id=EXCLUDED.workspace_id,internal_plan_key=EXCLUDED.internal_plan_key,
        billing_type=EXCLUDED.billing_type,provider_payment_id=EXCLUDED.provider_payment_id,
        provider_order_id=EXCLUDED.provider_order_id,provider_subscription_id=EXCLUDED.provider_subscription_id,
        subscription_id=EXCLUDED.subscription_id,amount_paise=EXCLUDED.amount_paise,
        expected_amount_paise=EXCLUDED.expected_amount_paise,currency=EXCLUDED.currency,status=EXCLUDED.status,
        signature_verified=EXCLUDED.signature_verified,verification_state=EXCLUDED.verification_state,
        billing_environment=EXCLUDED.billing_environment,captured_at=EXCLUDED.captured_at,
        access_period_start=EXCLUDED.access_period_start,access_period_end=EXCLUDED.access_period_end,
        failure_code=EXCLUDED.failure_code,reconciliation_status=EXCLUDED.reconciliation_status,
        last_reconciled_at=EXCLUDED.last_reconciled_at,updated_at=EXCLUDED.updated_at`, [
        record.id, record.userId || subscription?.userId || null, record.workspaceId || subscription?.workspaceId || record.tenantId || subscription?.tenantId || null,
        record.tenantType || subscription?.tenantType || 'personal', record.tenantId || subscription?.tenantId || record.userId,
        record.internalPlanKey || record.planKey || record.planId || subscription?.internalPlanKey || subscription?.planId,
        record.billingType || (source === 'subscription' ? 'recurring_renewal' : 'one_time_monthly'), record.provider || subscription?.provider || 'razorpay',
        providerPaymentId, record.providerOrderId || null, record.providerSubscriptionId || subscription?.providerSubscriptionId || null,
        record.subscriptionId || null, amount, expected, String(record.currency || subscription?.currency || 'INR').toUpperCase(), record.status || 'pending',
        signatureVerified, verificationState, environment, record.capturedAt || record.paidAt || null, record.accessPeriodStart || record.periodStart || null,
        record.accessPeriodEnd || record.periodEnd || null, record.failureCode || null, record.reconciliationStatus || 'not_checked',
        record.lastReconciledAt || null, record.createdAt || new Date().toISOString(), record.updatedAt || record.paidAt || record.createdAt || new Date().toISOString(),
      ]);
    }
  }
  if (changed.includes('billingReconciliationRuns')) {
    for (const run of Object.values<any>(data.billingReconciliationRuns || {})) {
      if (!run.id) continue;
      await client.query(`INSERT INTO gxa_billing_reconciliation_runs (
        id,billing_environment,status,records_checked,records_unchanged,records_synchronized,
        records_attention,error_count,started_at,completed_at,created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,records_checked=EXCLUDED.records_checked,
        records_unchanged=EXCLUDED.records_unchanged,records_synchronized=EXCLUDED.records_synchronized,
        records_attention=EXCLUDED.records_attention,error_count=EXCLUDED.error_count,completed_at=EXCLUDED.completed_at`, [
        run.id, ['test', 'live'].includes(run.billingEnvironment) ? run.billingEnvironment : 'unknown', run.status || 'completed',
        Number(run.recordsChecked || 0), Number(run.recordsUnchanged || 0), Number(run.recordsSynchronized || 0),
        Number(run.recordsAttention || 0), Number(run.errorCount || 0), run.startedAt || run.createdAt || new Date().toISOString(),
        run.completedAt || null, run.createdAt || run.startedAt || new Date().toISOString(),
      ]);
    }
  }
}

function changedNestedKeys(before: any, after: any) {
  const result = new Set<string>();
  const previous = before && typeof before === 'object' ? before : {};
  const current = after && typeof after === 'object' ? after : {};
  for (const key of new Set([...Object.keys(previous), ...Object.keys(current)])) if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) result.add(key);
  return result;
}

export async function synchronizeAdminProjections(client: PoolClient, data: Record<string, any>, changed?: string[], original: Record<string, any> = {}) {
  const full = !changed;
  const roots = new Set(changed || []);
  const affected = new Set<string>(full ? Object.keys(data.users || {}) : []);
  const directStores = ['users', 'projects', 'documents', 'chats', 'analyses', 'translations', 'savedPrompts'];
  for (const store of directStores) if (roots.has(store)) for (const key of changedNestedKeys(original[store], data[store])) if (data.users?.[key] || original.users?.[key]) affected.add(key);
  for (const store of ['sessions', 'subscriptions', 'subscriptionPayments', 'processedPayments', 'pendingCheckouts', 'workspaces']) {
    if (!full && !roots.has(store)) continue;
    const keys = full ? new Set(Object.keys(data[store] || {})) : changedNestedKeys(original[store], data[store]);
    for (const key of keys) {
      const records = [original[store]?.[key], data[store]?.[key]].filter(Boolean);
      for (const record of records) {
        const userId = record.userId || record.ownerId || (record.tenantType === 'personal' ? record.tenantId : null);
        if (userId && (data.users?.[userId] || original.users?.[userId])) affected.add(userId);
      }
    }
  }
  for (const userId of affected) {
    const user = data.users?.[userId];
    if (!user) { await client.query('DELETE FROM gxa_admin_users WHERE user_id = $1', [userId]); continue; }
    const projected = projectAdminUser(data, user);
    await client.query(`INSERT INTO gxa_admin_users (
      user_id, name, email, email_normalized, avatar_url, phone, company, timezone, language, role, status,
      email_verified_at, created_at, updated_at, last_active_at, suspended_at, suspended_by, suspension_reason,
      selected_plan, effective_plan, subscription_status, billing_mode, activation_date, current_period_start,
      current_period_end, next_billing_date, cancel_at_period_end, latest_successful_payment_at, workspace_id,
      workspace_type, workspace_role, projects_count, documents_count, history_count, saved_prompts_count
    ) VALUES (${Array.from({ length: 35 }, (_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (user_id) DO UPDATE SET
      name=EXCLUDED.name, email=EXCLUDED.email, email_normalized=EXCLUDED.email_normalized, avatar_url=EXCLUDED.avatar_url,
      phone=EXCLUDED.phone, company=EXCLUDED.company, timezone=EXCLUDED.timezone, language=EXCLUDED.language,
      role=EXCLUDED.role, status=EXCLUDED.status, email_verified_at=EXCLUDED.email_verified_at,
      updated_at=EXCLUDED.updated_at, last_active_at=EXCLUDED.last_active_at, suspended_at=EXCLUDED.suspended_at,
      suspended_by=EXCLUDED.suspended_by, suspension_reason=EXCLUDED.suspension_reason,
      selected_plan=EXCLUDED.selected_plan, effective_plan=EXCLUDED.effective_plan,
      subscription_status=EXCLUDED.subscription_status, billing_mode=EXCLUDED.billing_mode,
      activation_date=EXCLUDED.activation_date, current_period_start=EXCLUDED.current_period_start,
      current_period_end=EXCLUDED.current_period_end, next_billing_date=EXCLUDED.next_billing_date,
      cancel_at_period_end=EXCLUDED.cancel_at_period_end, latest_successful_payment_at=EXCLUDED.latest_successful_payment_at,
      workspace_id=EXCLUDED.workspace_id, workspace_type=EXCLUDED.workspace_type, workspace_role=EXCLUDED.workspace_role,
      projects_count=EXCLUDED.projects_count, documents_count=EXCLUDED.documents_count,
      history_count=EXCLUDED.history_count, saved_prompts_count=EXCLUDED.saved_prompts_count`, [
      projected.userId, projected.name, projected.email, projected.emailNormalized, projected.avatarUrl, projected.phone,
      projected.company, projected.timezone, projected.language, projected.role, projected.status, projected.emailVerifiedAt,
      projected.createdAt, projected.updatedAt, projected.lastActiveAt, projected.suspendedAt, projected.suspendedBy,
      projected.suspensionReason, projected.selectedPlan, projected.effectivePlan, projected.subscriptionStatus,
      projected.billingMode, projected.activationDate, projected.currentPeriodStart, projected.currentPeriodEnd,
      projected.nextBillingDate, projected.cancelAtPeriodEnd, projected.latestSuccessfulPaymentAt, projected.workspaceId,
      projected.workspaceType, projected.workspaceRole, projected.projectsCount, projected.documentsCount,
      projected.historyCount, projected.savedPromptsCount,
    ]);
  }
  if (full || roots.has('adminAuditEvents')) {
    const previousIds = new Set(Object.values<any>(original.adminAuditEvents || []).map(item => item.id));
    for (const event of Object.values<any>(data.adminAuditEvents || {}).filter(item => full || !previousIds.has(item.id))) {
      if (!event?.id || !event.action || !event.targetType || !event.targetId || !event.createdAt) continue;
      await client.query(`INSERT INTO gxa_admin_audit_events (
        id, actor_user_id, actor_role, action, target_type, target_id, reason, sanitized_metadata_json,
        ip_address_hash, user_agent, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11) ON CONFLICT (id) DO NOTHING`, [
        event.id, event.actorUserId || null, event.actorRole || 'system', event.action, event.targetType, event.targetId,
        event.reason || null, JSON.stringify(event.metadata || {}), event.ipAddressHash || null, event.userAgent || null, event.createdAt,
      ]);
    }
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

export async function previewLegacyJsonImport(pool: Pool, source: Record<string, any>, sourceHash: string) {
  const normalized = normalizeApplicationDatabase(source);
  const alreadyImported = await pool.query('SELECT 1 FROM gxa_json_imports WHERE source_hash = $1', [sourceHash]);
  if (alreadyImported.rowCount) return { wouldImport: false, sourceHash, keys: 0, records: recordCount(normalized) };
  const current = await readRows(pool);
  let changedKeys = 0;
  for (const [key, sourceValue] of Object.entries(normalized)) {
    const existingValue = current.data[key];
    const merged = existingValue === undefined ? sourceValue : mergeLegacyData(existingValue, sourceValue);
    if (existingValue === undefined || JSON.stringify(merged) !== JSON.stringify(existingValue)) changedKeys += 1;
  }
  return { wouldImport: true, sourceHash, keys: changedKeys, records: recordCount(normalized) };
}

async function readLegacyJsonFile(file: string) {
  const bytes = await fs.readFile(file);
  const sourceHash = crypto.createHash('sha256').update(bytes).digest('hex');
  let parsed: unknown;
  try { parsed = JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error('The legacy JSON database is invalid and was not imported.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The legacy JSON database must contain an object.');
  return { sourceHash, source: parsed as Record<string, any> };
}

export async function importLegacyJsonFile(pool: Pool, file: string, sourceLabel = 'legacy-json') {
  const { sourceHash, source } = await readLegacyJsonFile(file);
  return importLegacyJson(pool, source, sourceHash, sourceLabel);
}

export async function previewLegacyJsonFile(pool: Pool, file: string) {
  const { sourceHash, source } = await readLegacyJsonFile(file);
  return previewLegacyJsonImport(pool, source, sourceHash);
}

export async function verifyPostgresRuntime(pool: Pool) {
  const status = await migrationStatus(pool);
  if (status.pending.length) throw new PersistenceUnavailableError();
  await pool.query('SELECT 1');
  const imported = await pool.query('SELECT 1 FROM gxa_json_imports LIMIT 1');
  if (!imported.rowCount) throw new PersistenceUnavailableError();
}

export class PostgresDatabaseAdapter implements DatabaseAdapter {
  readonly provider = 'postgres' as const;
  readonly pool: Pool;

  constructor(config: PersistenceConfig) {
    this.pool = createPostgresPool(config.databaseUrl!, config);
  }

  async initialize() {
    try {
      await verifyPostgresRuntime(this.pool);
      const snapshot = await loadPostgresSnapshot(this.pool);
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await synchronizeBillingProjections(client, snapshot.data);
        await synchronizeAdminProjections(client, snapshot.data);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
      await commitPostgresSnapshot(this.pool, snapshot, snapshot.data);
    } catch {
      throw new PersistenceUnavailableError();
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
  }
}
