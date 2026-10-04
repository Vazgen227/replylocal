CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL CHECK (email = lower(email)),
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  industry text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Europe/Kyiv',
  currency text NOT NULL DEFAULT 'UAH',
  ai_settings jsonb NOT NULL DEFAULT '{"systemPrompt":"","tone":"friendly","offHoursMessage":""}',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','agent')),
  PRIMARY KEY (user_id, organization_id)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, organization_id) REFERENCES memberships(user_id, organization_id) ON DELETE CASCADE
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE knowledge_entries (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('service','product','rule')),
  title text NOT NULL,
  content text NOT NULL,
  price numeric(12,2) CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'UAH',
  duration_minutes integer CHECK (duration_minutes BETWEEN 1 AND 10080),
  sku text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_org_kind ON knowledge_entries(organization_id,kind);
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  business_type text NOT NULL DEFAULT '',
  plan text NOT NULL,
  locale text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_org ON audit_events(organization_id,created_at DESC);
