CREATE TABLE IF NOT EXISTS gxa_billing_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  workspace_id TEXT,
  tenant_type TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  internal_plan_key TEXT NOT NULL,
  billing_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_payment_id TEXT,
  provider_order_id TEXT,
  provider_subscription_id TEXT,
  subscription_id TEXT,
  amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (amount_paise >= 0),
  expected_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (expected_amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_state TEXT NOT NULL DEFAULT 'unverified',
  billing_environment TEXT NOT NULL DEFAULT 'unknown' CHECK (billing_environment IN ('test', 'live', 'unknown')),
  captured_at TIMESTAMPTZ,
  access_period_start TIMESTAMPTZ,
  access_period_end TIMESTAMPTZ,
  failure_code TEXT,
  reconciliation_status TEXT NOT NULL DEFAULT 'not_checked',
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE gxa_billing_subscriptions ADD COLUMN IF NOT EXISTS billing_environment TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE gxa_billing_subscriptions ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'not_checked';
ALTER TABLE gxa_billing_subscriptions ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ;
ALTER TABLE gxa_billing_subscriptions ADD COLUMN IF NOT EXISTS last_provider_event_at TIMESTAMPTZ;
ALTER TABLE gxa_billing_subscriptions ADD COLUMN IF NOT EXISTS latest_payment_at TIMESTAMPTZ;
ALTER TABLE gxa_billing_subscriptions ADD COLUMN IF NOT EXISTS verification_error TEXT;
ALTER TABLE gxa_billing_subscription_events ADD COLUMN IF NOT EXISTS billing_environment TEXT NOT NULL DEFAULT 'unknown';

CREATE TABLE IF NOT EXISTS gxa_billing_reconciliation_runs (
  id TEXT PRIMARY KEY,
  billing_environment TEXT NOT NULL DEFAULT 'unknown' CHECK (billing_environment IN ('test', 'live', 'unknown')),
  status TEXT NOT NULL,
  records_checked INTEGER NOT NULL DEFAULT 0,
  records_unchanged INTEGER NOT NULL DEFAULT 0,
  records_synchronized INTEGER NOT NULL DEFAULT 0,
  records_attention INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS gxa_billing_payments_captured_idx ON gxa_billing_payments (billing_environment, captured_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS gxa_billing_payments_provider_unique_idx ON gxa_billing_payments (billing_environment, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gxa_billing_payments_status_idx ON gxa_billing_payments (billing_environment, status, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_payments_plan_idx ON gxa_billing_payments (billing_environment, internal_plan_key, captured_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_payments_type_idx ON gxa_billing_payments (billing_environment, billing_type, captured_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_payments_user_idx ON gxa_billing_payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_payments_order_idx ON gxa_billing_payments (provider_order_id);
CREATE INDEX IF NOT EXISTS gxa_billing_payments_subscription_idx ON gxa_billing_payments (provider_subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_payments_verification_idx ON gxa_billing_payments (verification_state, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_environment_idx ON gxa_billing_subscriptions (billing_environment, status, current_period_end);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_reconciliation_idx ON gxa_billing_subscriptions (reconciliation_status, last_reconciled_at);
CREATE INDEX IF NOT EXISTS gxa_billing_subscription_events_environment_idx ON gxa_billing_subscription_events (billing_environment, processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_reconciliation_runs_created_idx ON gxa_billing_reconciliation_runs (billing_environment, created_at DESC);
