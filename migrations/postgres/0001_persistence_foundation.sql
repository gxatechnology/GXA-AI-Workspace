CREATE TABLE IF NOT EXISTS gxa_schema_migrations (
  id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gxa_state_records (
  namespace TEXT NOT NULL,
  record_key TEXT NOT NULL,
  value JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (namespace, record_key)
);

CREATE TABLE IF NOT EXISTS gxa_json_imports (
  source_hash TEXT PRIMARY KEY,
  source_label TEXT NOT NULL,
  imported_keys INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gxa_state_records_namespace_idx
  ON gxa_state_records (namespace, updated_at DESC);
