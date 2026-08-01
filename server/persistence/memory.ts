import { normalizeApplicationDatabase } from './defaultDatabase.js';
import { changedRootKeys } from './merge.js';
import { PersistenceConflictError, type DatabaseAdapter, type DatabaseSnapshot } from './postgres.js';

/**
 * Process-local availability fallback. Data is intentionally non-durable and
 * never grants authority that must survive a restart, such as a subscription.
 */
export class MemoryDatabaseAdapter implements DatabaseAdapter {
  readonly provider = 'memory' as const;
  private data = normalizeApplicationDatabase({});
  private version = 0;

  async initialize() {}

  async load(): Promise<DatabaseSnapshot> {
    const data = structuredClone(this.data);
    return {
      data,
      original: structuredClone(data),
      versions: new Map(),
      token: String(this.version),
    };
  }

  async commit(snapshot: DatabaseSnapshot, data: Record<string, any>) {
    if (!changedRootKeys(snapshot.original, data).length) return;
    if (snapshot.token !== String(this.version)) throw new PersistenceConflictError();
    this.data = normalizeApplicationDatabase(structuredClone(data));
    this.version += 1;
  }

  async close() {}
}
