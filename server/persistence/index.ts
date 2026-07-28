import { AsyncLocalStorage } from 'async_hooks';
import type express from 'express';
import { resolvePersistenceConfig, type PersistenceConfig } from './config.js';
import { JsonDatabaseAdapter } from './json.js';
import { PostgresDatabaseAdapter, PersistenceConflictError, PersistenceUnavailableError, type DatabaseAdapter, type DatabaseSnapshot } from './postgres.js';

interface RequestDatabaseScope {
  data: Record<string, any>;
  dirty: boolean;
  closed: boolean;
  afterCommit: Array<() => void>;
}

type EndArguments = any[];

export class ApplicationPersistence {
  readonly config: PersistenceConfig;
  readonly adapter: DatabaseAdapter;
  private readonly storage = new AsyncLocalStorage<RequestDatabaseScope>();

  constructor(env: NodeJS.ProcessEnv, jsonFile: string, adapter?: DatabaseAdapter) {
    this.config = resolvePersistenceConfig(env, jsonFile);
    this.adapter = adapter || (this.config.provider === 'postgres' ? new PostgresDatabaseAdapter(this.config) : new JsonDatabaseAdapter(this.config.jsonFile));
  }

  get provider() { return this.adapter.provider; }

  async initialize() { await this.adapter.initialize(); }

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
      let snapshot: DatabaseSnapshot;
      try { snapshot = await this.adapter.load(); }
      catch (error) { return this.sendPersistenceError(response, error); }

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
