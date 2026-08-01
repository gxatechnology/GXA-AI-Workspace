import type { PoolConfig } from 'pg';

export type PersistenceProvider = 'postgres' | 'json' | 'memory';

export interface PersistenceConfig {
  provider: PersistenceProvider;
  databaseUrl?: string;
  directDatabaseUrl?: string;
  poolMax: number;
  poolTimeoutMs: number;
  ssl: PoolConfig['ssl'];
  jsonFile: string;
  production: boolean;
  fallbackReason?: 'missing_database_url';
}

export class PersistenceConfigurationError extends Error {
  readonly code: string;

  constructor(message: string, code = 'PERSISTENCE_CONFIGURATION_INVALID') {
    super(message);
    this.name = 'PersistenceConfigurationError';
    this.code = code;
  }
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new PersistenceConfigurationError('A database pool setting is invalid. Check the configured variable names without exposing their values.');
  }
  return parsed;
}

function sslConfiguration(value: string | undefined): PoolConfig['ssl'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || ['prefer', 'require', 'true', '1'].includes(normalized)) return { rejectUnauthorized: false };
  if (['verify-full', 'verify_ca', 'verify-ca'].includes(normalized)) return { rejectUnauthorized: true };
  if (['disable', 'false', '0'].includes(normalized)) return false;
  throw new PersistenceConfigurationError('DATABASE_SSL must be disable, require, or verify-full.');
}

export function resolvePersistenceConfig(env: NodeJS.ProcessEnv, jsonFile: string): PersistenceConfig {
  const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const requested = String(env.PERSISTENCE_PROVIDER || '').trim().toLowerCase();
  const inferred: PersistenceProvider = env.DATABASE_URL ? 'postgres' : production ? 'memory' : 'json';
  let provider = (requested || inferred) as PersistenceProvider;
  let fallbackReason: PersistenceConfig['fallbackReason'] = production && !env.DATABASE_URL ? 'missing_database_url' : undefined;

  if (!['postgres', 'json', 'memory'].includes(provider)) {
    throw new PersistenceConfigurationError('PERSISTENCE_PROVIDER must be postgres, json, or memory.');
  }
  if (production && provider === 'json') {
    provider = 'memory';
  }
  if (provider === 'postgres' && !env.DATABASE_URL) {
    provider = 'memory';
    fallbackReason = 'missing_database_url';
  }

  return {
    provider,
    databaseUrl: env.DATABASE_URL,
    directDatabaseUrl: env.DIRECT_DATABASE_URL || env.DATABASE_URL,
    poolMax: boundedInteger(env.DATABASE_POOL_MAX, 5, 1, 50),
    poolTimeoutMs: boundedInteger(env.DATABASE_POOL_TIMEOUT_MS, 10_000, 500, 60_000),
    ssl: provider === 'postgres' ? sslConfiguration(env.DATABASE_SSL) : false,
    jsonFile,
    production,
    fallbackReason,
  };
}
