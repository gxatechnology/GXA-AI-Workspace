import type { PoolConfig } from 'pg';

export type PersistenceProvider = 'postgres' | 'json';

export interface PersistenceConfig {
  provider: PersistenceProvider;
  databaseUrl?: string;
  directDatabaseUrl?: string;
  poolMax: number;
  poolTimeoutMs: number;
  ssl: PoolConfig['ssl'];
  jsonFile: string;
  production: boolean;
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
  const inferred = env.DATABASE_URL ? 'postgres' : 'json';
  const provider = (requested || inferred) as PersistenceProvider;

  if (!['postgres', 'json'].includes(provider)) {
    throw new PersistenceConfigurationError('PERSISTENCE_PROVIDER must be postgres or json.');
  }
  if (production && provider !== 'postgres') {
    throw new PersistenceConfigurationError('PostgreSQL persistence is required in production.', 'POSTGRES_REQUIRED_IN_PRODUCTION');
  }
  if (provider === 'postgres' && !env.DATABASE_URL) {
    throw new PersistenceConfigurationError('DATABASE_URL is required when PostgreSQL persistence is enabled.', 'DATABASE_URL_REQUIRED');
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
  };
}
