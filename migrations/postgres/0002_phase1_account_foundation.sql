CREATE INDEX IF NOT EXISTS gxa_state_records_value_gin_idx
  ON gxa_state_records USING GIN (value jsonb_path_ops);

CREATE INDEX IF NOT EXISTS gxa_json_imports_imported_at_idx
  ON gxa_json_imports (imported_at DESC);
