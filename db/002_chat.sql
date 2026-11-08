CREATE TABLE chat_configs (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
 public_id uuid UNIQUE NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 auto_reply boolean NOT NULL DEFAULT true,
 welcome text NOT NULL DEFAULT '',
 daily_limit integer NOT NULL DEFAULT 50 CHECK(daily_limit BETWEEN 1 AND 1000),
 version integer NOT NULL DEFAULT 1
);
INSERT INTO chat_configs(organization_id,public_id) SELECT id,id FROM organizations;
CREATE TABLE conversations (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL,
 visitor_name text NOT NULL,
 visitor_contact text NOT NULL DEFAULT '',
 locale text NOT NULL CHECK(locale IN ('ru','uk','en')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 mode text NOT NULL DEFAULT 'ai' CHECK(mode IN ('ai','human')),
 processing_id uuid,
 processing_until timestamptz,
 version integer NOT NULL DEFAULT 1,
 consent_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,organization_id)
);
CREATE INDEX conversations_org_updated ON conversations(organization_id,updated_at DESC);
CREATE TABLE messages (
 id uuid PRIMARY KEY,
 conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 client_id uuid,
 sender text NOT NULL CHECK(sender IN ('visitor','assistant','operator','system')),
 content text NOT NULL,
 sources jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(conversation_id,client_id)
);
CREATE INDEX messages_conversation_time ON messages(conversation_id,created_at,id);
CREATE TABLE ai_usage (
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
 attempts integer NOT NULL DEFAULT 0,
 input_tokens integer NOT NULL DEFAULT 0,
 output_tokens integer NOT NULL DEFAULT 0,
 PRIMARY KEY(organization_id,day)
);
CREATE TABLE chat_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
 code text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
