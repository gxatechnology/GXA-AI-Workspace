import crypto from 'crypto';
import type express from 'express';
import type { Pool } from 'pg';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set([
  '/api/webhooks/razorpay',
  '/api/billing/webhook',
  '/api/platform/billing/webhook',
]);

const localDevelopmentOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
};

export function configuredOrigins(env: NodeJS.ProcessEnv) {
  return String(env.APP_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try {
        const parsed = new URL(value);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
      } catch { return ''; }
    })
    .filter(Boolean);
}

function requestOrigin(request: express.Request) {
  const origin = String(request.headers.origin || '').trim();
  if (origin) return origin;
  const referer = String(request.headers.referer || '').trim();
  if (!referer) return '';
  try { return new URL(referer).origin; } catch { return ''; }
}

function isApiKeyRequest(request: express.Request) {
  return request.path.startsWith('/api/v1/') && /^Bearer\s+\S+/i.test(String(request.headers.authorization || ''));
}

export function browserMutationCsrf(env: NodeJS.ProcessEnv = process.env): express.RequestHandler {
  const production = env.NODE_ENV === 'production';
  return (request, response, next) => {
    if (!MUTATION_METHODS.has(request.method.toUpperCase()) || !request.path.startsWith('/api/')) return next();
    if (CSRF_EXEMPT_PATHS.has(request.path) || isApiKeyRequest(request)) return next();

    const configured = configuredOrigins(env);
    if (production && configured.length === 0) {
      return response.status(403).json({ error: 'This request origin could not be verified.', code: 'CSRF_CONFIGURATION_REQUIRED', requestId: (request as any).requestId });
    }

    const origin = requestOrigin(request);
    if (!origin) {
      if (!production) return next();
      return response.status(403).json({ error: 'This request origin could not be verified.', code: 'CSRF_ORIGIN_REQUIRED', requestId: (request as any).requestId });
    }

    if (configured.includes(origin) || (!production && localDevelopmentOrigin(origin))) return next();
    return response.status(403).json({ error: 'This request origin is not allowed.', code: 'CSRF_ORIGIN_DENIED', requestId: (request as any).requestId });
  };
}

export function contentSecurityPolicy(production: boolean) {
  const scriptSources = ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com'];
  const connectSources = ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'];
  if (!production) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push('ws:', 'http://localhost:*', 'http://127.0.0.1:*');
  }
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    `connect-src ${connectSources.join(' ')}`,
    "frame-src https://api.razorpay.com https://*.razorpay.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function securityHeaders(env: NodeJS.ProcessEnv = process.env): express.RequestHandler {
  const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const allowedOrigins = configuredOrigins(env);
  return (request, response, next) => {
    response.setHeader('Content-Security-Policy', contentSecurityPolicy(production));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('X-Frame-Options', 'DENY');
    if (production) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (request.path.startsWith('/admin')) response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const origin = String(request.headers.origin || '');
    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    next();
  };
}

export const SESSION_ABSOLUTE_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookie(token: string, secure: boolean, now = Date.now(), clear = false) {
  const maxAge = clear ? 0 : SESSION_ABSOLUTE_LIFETIME_SECONDS;
  const expires = new Date(clear ? 0 : now + maxAge * 1000).toUTCString();
  return `gxa_session=${clear ? '' : encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; Expires=${expires}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

type RateBucket = { count: number; resetAt: number };
const localRateBuckets = new Map<string, RateBucket>();
let cleanupCounter = 0;

const rateLimitSubject = (request: express.Request) => {
  const ip = String(request.ip || request.socket.remoteAddress || 'unknown');
  const identifier = String(request.body?.email || request.body?.token || '').trim().toLowerCase().slice(0, 320);
  return crypto.createHash('sha256').update(`${ip}\u0000${identifier}`).digest('hex');
};

export interface RateLimitResult { count: number; resetAt: number }

export async function consumePostgresRateLimit(pool: Pool, limiter: string, subjectHash: string, windowMs: number, now = Date.now()): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs;
  const result = await pool.query<{ request_count: number; expires_at: Date }>(`
    INSERT INTO gxa_rate_limit_buckets (limiter_key, subject_hash, window_started_at, expires_at, request_count)
    VALUES ($1, $2, $3, $4, 1)
    ON CONFLICT (limiter_key, subject_hash, window_started_at)
    DO UPDATE SET request_count = gxa_rate_limit_buckets.request_count + 1, expires_at = EXCLUDED.expires_at, updated_at = NOW()
    RETURNING request_count, expires_at
  `, [limiter, subjectHash, new Date(windowStart), new Date(expiresAt)]);
  cleanupCounter += 1;
  if (cleanupCounter % 128 === 0) void pool.query("DELETE FROM gxa_rate_limit_buckets WHERE expires_at < NOW() - INTERVAL '1 hour'").catch(() => undefined);
  return { count: Number(result.rows[0].request_count), resetAt: Date.parse(String(result.rows[0].expires_at)) || expiresAt };
}

export function createRateLimiter(pool: () => Pool | null, env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  return (name: string, limit: number, windowMs: number): express.RequestHandler => async (request, response, next) => {
    const subjectHash = rateLimitSubject(request);
    const database = pool();
    let bucket: RateLimitResult;
    try {
      if (database) bucket = await consumePostgresRateLimit(database, name, subjectHash, windowMs);
      else if (production) return response.status(503).json({ error: 'Workspace storage is temporarily unavailable. Your local input has not been removed.', code: 'PERSISTENCE_UNAVAILABLE', requestId: (request as any).requestId });
      else {
        const key = `${name}:${subjectHash}`;
        const now = Date.now();
        const current = localRateBuckets.get(key);
        bucket = !current || current.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { count: current.count + 1, resetAt: current.resetAt };
        localRateBuckets.set(key, bucket);
      }
    } catch {
      return response.status(503).json({ error: 'Workspace storage is temporarily unavailable. Your local input has not been removed.', code: 'PERSISTENCE_UNAVAILABLE', requestId: (request as any).requestId });
    }

    response.setHeader('RateLimit-Limit', String(limit));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
    response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > limit) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000))));
      console.warn(JSON.stringify({ event: 'security.rate_limited', requestId: (request as any).requestId, limiter: name, subjectHash: subjectHash.slice(0, 24) }));
      return response.status(429).json({ error: 'Too many requests. Try again later.', code: 'RATE_LIMITED', requestId: (request as any).requestId });
    }
    next();
  };
}
