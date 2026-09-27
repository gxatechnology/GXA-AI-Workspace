CREATE TABLE IF NOT EXISTS gxa_rate_limit_buckets (
  limiter_key TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (limiter_key, subject_hash, window_started_at)
);

CREATE INDEX IF NOT EXISTS gxa_rate_limit_buckets_expiry_idx
  ON gxa_rate_limit_buckets (expires_at);

CREATE INDEX IF NOT EXISTS gxa_rate_limit_buckets_limiter_idx
  ON gxa_rate_limit_buckets (limiter_key, window_started_at DESC);
