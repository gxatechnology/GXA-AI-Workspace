CREATE TABLE IF NOT EXISTS gxa_admin_users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  language TEXT NOT NULL DEFAULT 'English',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deletion_pending', 'deleted')),
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_by TEXT,
  suspension_reason TEXT,
  selected_plan TEXT NOT NULL DEFAULT 'free',
  effective_plan TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'free',
  billing_mode TEXT,
  activation_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  latest_successful_payment_at TIMESTAMPTZ,
  workspace_id TEXT,
  workspace_type TEXT NOT NULL DEFAULT 'personal',
  workspace_role TEXT NOT NULL DEFAULT 'owner',
  projects_count INTEGER NOT NULL DEFAULT 0 CHECK (projects_count >= 0),
  documents_count INTEGER NOT NULL DEFAULT 0 CHECK (documents_count >= 0),
  history_count INTEGER NOT NULL DEFAULT 0 CHECK (history_count >= 0),
  saved_prompts_count INTEGER NOT NULL DEFAULT 0 CHECK (saved_prompts_count >= 0)
);

CREATE TABLE IF NOT EXISTS gxa_admin_audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  sanitized_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS gxa_admin_users_created_idx ON gxa_admin_users (created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_admin_users_last_active_idx ON gxa_admin_users (last_active_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS gxa_admin_users_verified_idx ON gxa_admin_users (email_verified_at);
CREATE INDEX IF NOT EXISTS gxa_admin_users_role_idx ON gxa_admin_users (role);
CREATE INDEX IF NOT EXISTS gxa_admin_users_status_idx ON gxa_admin_users (status);
CREATE INDEX IF NOT EXISTS gxa_admin_users_effective_plan_idx ON gxa_admin_users (effective_plan);
CREATE INDEX IF NOT EXISTS gxa_admin_users_subscription_status_idx ON gxa_admin_users (subscription_status);
CREATE INDEX IF NOT EXISTS gxa_admin_users_company_lower_idx ON gxa_admin_users (lower(company));
CREATE INDEX IF NOT EXISTS gxa_admin_users_phone_idx ON gxa_admin_users (phone);
CREATE INDEX IF NOT EXISTS gxa_admin_audit_created_idx ON gxa_admin_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_admin_audit_action_idx ON gxa_admin_audit_events (action, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_admin_audit_actor_idx ON gxa_admin_audit_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gxa_admin_audit_target_idx ON gxa_admin_audit_events (target_type, target_id, created_at DESC);
