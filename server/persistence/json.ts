import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { normalizeApplicationDatabase } from './defaultDatabase.js';
import { changedRootKeys } from './merge.js';
import { PersistenceConflictError, PersistenceUnavailableError, type DatabaseAdapter, type DatabaseSnapshot } from './postgres.js';

async function fileDigest(file: string) {
  try { return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'); }
  catch (error: any) { if (error?.code === 'ENOENT') return ''; throw error; }
}

export class JsonDatabaseAdapter implements DatabaseAdapter {
  readonly provider = 'json' as const;

  constructor(private readonly file: string) {}

  async initialize() {
    const snapshot = await this.load();
    if (!snapshot.token || changedRootKeys(snapshot.original, snapshot.data).length) await this.commit(snapshot, snapshot.data);
  }

  async load(): Promise<DatabaseSnapshot> {
    try {
      const bytes = await fs.readFile(this.file);
      let parsed: unknown;
      try { parsed = JSON.parse(bytes.toString('utf8')); }
      catch { throw new PersistenceUnavailableError(); }
      const original = structuredClone(parsed as Record<string, any>);
      return { data: normalizeApplicationDatabase(parsed), original, versions: new Map(), token: crypto.createHash('sha256').update(bytes).digest('hex') };
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        if (error instanceof PersistenceUnavailableError) throw error;
        throw new PersistenceUnavailableError();
      }
      return { data: normalizeApplicationDatabase({}), original: {}, versions: new Map(), token: '' };
    }
  }

  async commit(snapshot: DatabaseSnapshot, data: Record<string, any>) {
    if (!changedRootKeys(snapshot.original, data).length && snapshot.token) return;
    try {
      const currentToken = await fileDigest(this.file);
      if (currentToken !== String(snapshot.token || '')) throw new PersistenceConflictError();
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${process.pid}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
      await fs.rename(temporary, this.file);
    } catch (error) {
      if (error instanceof PersistenceConflictError) throw error;
      throw new PersistenceUnavailableError();
    }
  }

  async close() {}
}
