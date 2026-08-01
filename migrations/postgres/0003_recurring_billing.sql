CREATE TABLE IF NOT EXISTS gxa_billing_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  workspace_id TEXT NOT NULL,
  tenant_type TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  internal_plan_key TEXT NOT NULL,
  billing_mode TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_plan_id TEXT,
  provider_subscription_id TEXT UNIQUE,
  provider_customer_id TEXT,
  status TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  amount_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_charge_at TIMESTAMPTZ,
  authenticated_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  halted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  latest_payment_id TEXT UNIQUE,
  latest_invoice_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS gxa_billing_subscription_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES gxa_billing_subscriptions(id),
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  provider_created_at TIMESTAMPTZ,
  payload_hash TEXT NOT NULL,
  processing_status TEXT NOT NULL,
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_user_idx ON gxa_billing_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_workspace_idx ON gxa_billing_subscriptions (workspace_id);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_status_idx ON gxa_billing_subscriptions (status);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_plan_idx ON gxa_billing_subscriptions (internal_plan_key);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_period_end_idx ON gxa_billing_subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_next_charge_idx ON gxa_billing_subscriptions (next_charge_at);
CREATE INDEX IF NOT EXISTS gxa_billing_subscriptions_created_idx ON gxa_billing_subscriptions (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS gxa_billing_subscriptions_one_open_recurring_idx
  ON gxa_billing_subscriptions (tenant_type, tenant_id)
  WHERE billing_mode = 'recurring_subscription' AND status IN ('created', 'authenticated', 'active', 'pending', 'halted', 'paused');
CREATE INDEX IF NOT EXISTS gxa_billing_subscription_events_subscription_idx ON gxa_billing_subscription_events (subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_billing_subscription_events_status_idx ON gxa_billing_subscription_events (processing_status, created_at DESC);
