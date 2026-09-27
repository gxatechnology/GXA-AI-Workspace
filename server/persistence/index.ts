import { AsyncLocalStorage } from 'async_hooks';
import type express from 'express';
import { resolvePersistenceConfig, type PersistenceConfig } from './config.js';
import { JsonDatabaseAdapter } from './json.js';
import { MemoryDatabaseAdapter } from './memory.js';
import { PostgresDatabaseAdapter, PersistenceConflictError, PersistenceUnavailableError, type DatabaseAdapter, type DatabaseSnapshot } from './postgres.js';

interface RequestDatabaseScope {
  data: Record<string, any>;
  dirty: boolean;
  closed: boolean;
  afterCommit: Array<() => void>;
}

type EndArguments = any[];
export type DatabaseReadiness = 'DATABASE_INITIALIZING' | 'DATABASE_READY' | 'DATABASE_UNAVAILABLE';

const STATELESS_API_PATHS = new Set([
  '/api/health/readiness',
  '/api/pricing/plans',
  '/api/platform/plans',
]);

export class ApplicationPersistence {
  readonly config: PersistenceConfig;
  private adapter: DatabaseAdapter;
  private readonly storage = new AsyncLocalStorage<RequestDatabaseScope>();
  private databaseReadiness: DatabaseReadiness = 'DATABASE_INITIALIZING';
  private unavailableReason: 'missing_database_url' | 'production_requires_postgres' | 'postgres_unavailable' | 'persistence_unavailable' | null = null;

  constructor(env: NodeJS.ProcessEnv, jsonFile: string, adapter?: DatabaseAdapter) {
    this.config = resolvePersistenceConfig(env, jsonFile);
    this.adapter = adapter || (this.config.provider === 'postgres'
      ? new PostgresDatabaseAdapter(this.config)
      : this.config.provider === 'json'
        ? new JsonDatabaseAdapter(this.config.jsonFile)
        : new MemoryDatabaseAdapter());
  }

  get provider() { return this.adapter.provider; }
  get postgresPool() { return this.adapter instanceof PostgresDatabaseAdapter ? this.adapter.pool : null; }
  get readiness() { return this.databaseReadiness; }
  get readinessStatus() {
    return {
      status: this.databaseReadiness,
      configuredProvider: this.config.fallbackReason ? 'postgres' : this.config.provider,
      activeProvider: this.adapter.provider,
      reason: this.unavailableReason,
    } as const;
  }

  async initialize() {
    if (this.config.fallbackReason) {
      if (this.config.fallbackReason === 'missing_database_url') console.warn(JSON.stringify({ event: 'persistence.database_url_missing', message: 'Missing DATABASE_URL' }));
      else console.warn(JSON.stringify({ event: 'persistence.production_provider_invalid', message: 'Production requires PostgreSQL persistence' }));
      console.warn(JSON.stringify({ event: 'persistence.fallback', message: 'Falling back to Memory', reason: this.config.fallbackReason }));
      this.unavailableReason = this.config.fallbackReason;
    }
    try {
      await this.adapter.initialize();
      this.databaseReadiness = this.config.fallbackReason ? 'DATABASE_UNAVAILABLE' : 'DATABASE_READY';
      if (this.adapter.provider === 'postgres') console.info(JSON.stringify({ event: 'persistence.postgres_connected', message: 'Postgres connected' }));
    } catch (error) {
      const failedProvider = this.adapter.provider;
      console.warn(JSON.stringify({
        event: 'persistence.initialization_failed',
        provider: failedProvider,
        code: error instanceof PersistenceUnavailableError ? error.code : 'PERSISTENCE_INITIALIZATION_FAILED',
      }));
      try { await this.adapter.close(); } catch {}
      this.adapter = new MemoryDatabaseAdapter();
      await this.adapter.initialize();
      this.databaseReadiness = 'DATABASE_UNAVAILABLE';
      this.unavailableReason = failedProvider === 'postgres' ? 'postgres_unavailable' : 'persistence_unavailable';
      console.warn(JSON.stringify({ event: 'persistence.fallback', message: 'Falling back to Memory', reason: `${failedProvider}_unavailable` }));
    }
    console.info(JSON.stringify({ event: 'persistence.active', message: 'Persistence mode currently active', provider: this.adapter.provider, readiness: this.databaseReadiness }));
  }

  read() {
    const scope = this.storage.getStore();
    if (!scope || scope.closed) throw new PersistenceUnavailableError();
    return scope.data;
  }

  write(data: Record<string, any>) {
    const scope = this.storage.getStore();
    if (!scope || scope.closed) throw new PersistenceUnavailableError();
    scope.data = data;
    scope.dirty = true;
  }

  afterCommit(operation: () => void) {
    const scope = this.storage.getStore();
    if (!scope || scope.closed) return operation();
    scope.afterCommit.push(operation);
  }

  async runStandalone<T>(operation: (database: Record<string, any>) => T | Promise<T>) {
    if (this.databaseReadiness !== 'DATABASE_READY') throw new PersistenceUnavailableError();
    const snapshot = await this.adapter.load();
    const scope: RequestDatabaseScope = { data: snapshot.data, dirty: false, closed: false, afterCommit: [] };
    try {
      const result = await this.storage.run(scope, () => operation(scope.data));
      if (scope.dirty) await this.adapter.commit(snapshot, scope.data);
      for (const callback of scope.afterCommit) callback();
      return result;
    } finally {
      scope.closed = true;
    }
  }

  middleware(): express.RequestHandler {
    return async (request, response, next) => {
      if (!request.path.startsWith('/api')) return next();
      if (request.method === 'GET' && STATELESS_API_PATHS.has(request.path)) return next();
      if (this.databaseReadiness !== 'DATABASE_READY') return this.sendPersistenceError(response, new PersistenceUnavailableError());
      let snapshot: DatabaseSnapshot;
      try { snapshot = await this.adapter.load(); }
      catch (error) { this.databaseReadiness = 'DATABASE_UNAVAILABLE'; this.unavailableReason = this.adapter.provider === 'postgres' ? 'postgres_unavailable' : 'persistence_unavailable'; return this.sendPersistenceError(response, error); }

      const scope: RequestDatabaseScope = { data: snapshot.data, dirty: false, closed: false, afterCommit: [] };
      const originalEnd = response.end.bind(response) as express.Response['end'];
      let endArguments: EndArguments | null = null;
      let finished = false;
      let resolveFinished!: () => void;
      const finishedPromise = new Promise<void>(resolve => { resolveFinished = resolve; });

      response.end = ((...args: EndArguments) => {
        if (!finished) {
          finished = true;
          endArguments = args;
          resolveFinished();
        }
        return response;
      }) as express.Response['end'];

      const onClose = () => {
        if (!finished) {
          finished = true;
          resolveFinished();
        }
      };
      response.once('close', onClose);

      try {
        await this.storage.run(scope, async () => {
          next();
          await finishedPromise;
        });
        if (scope.dirty) await this.adapter.commit(snapshot, scope.data);
        scope.closed = true;
        response.removeListener('close', onClose);
        const completedResponse = endArguments !== null ? Reflect.apply(originalEnd as any, response, endArguments as any[]) : response;
        for (const callback of scope.afterCommit) callback();
        return completedResponse;
        return response;
      } catch (error) {
        scope.closed = true;
        response.removeListener('close', onClose);
        if (!(error instanceof PersistenceConflictError)) { this.databaseReadiness = 'DATABASE_UNAVAILABLE'; this.unavailableReason = this.adapter.provider === 'postgres' ? 'postgres_unavailable' : 'persistence_unavailable'; }
        if (response.headersSent) {
          console.error(JSON.stringify({ event: 'database.commit_failed_after_headers', code: error instanceof PersistenceConflictError ? error.code : 'PERSISTENCE_UNAVAILABLE' }));
          return originalEnd();
        }
        return this.sendPersistenceError(response, error, originalEnd);
      }
    };
  }

  private sendPersistenceError(response: express.Response, error: unknown, end = response.end.bind(response) as express.Response['end']) {
    const conflict = error instanceof PersistenceConflictError;
    const status = conflict ? 409 : 503;
    const body = JSON.stringify({
      error: conflict ? error.message : 'Workspace storage is temporarily unavailable. Your local input has not been removed.',
      code: conflict ? error.code : 'PERSISTENCE_UNAVAILABLE',
    });
    response.statusCode = status;
    response.removeHeader('Content-Length');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Content-Length', Buffer.byteLength(body));
    return end(body);
  }

  async close() { await this.adapter.close(); }
}

export { PersistenceConfigurationError, resolvePersistenceConfig } from './config.js';
export { PersistenceConflictError, PersistenceUnavailableError } from './postgres.js';
