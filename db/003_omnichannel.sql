CREATE TABLE channel_connections (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN ('telegram','whatsapp','viber','instagram')),
 label text NOT NULL,
 account_id text,
 credentials text NOT NULL,
 settings jsonb NOT NULL DEFAULT '{}',
 enabled boolean NOT NULL DEFAULT false,
 verified_at timestamptz,
 last_webhook_at timestamptz,
 last_error text,
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,account_id)
);
ALTER TABLE conversations ADD COLUMN channel text NOT NULL DEFAULT 'website' CHECK(channel IN ('website','telegram','whatsapp','viber','instagram'));
ALTER TABLE conversations ADD COLUMN connection_id uuid REFERENCES channel_connections(id);
ALTER TABLE conversations ADD COLUMN external_key text;
ALTER TABLE conversations ADD COLUMN destination jsonb NOT NULL DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN last_inbound_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE conversations ADD COLUMN assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN lead_stage text NOT NULL DEFAULT 'new' CHECK(lead_stage IN ('new','qualified','won','lost'));
ALTER TABLE conversations ADD COLUMN deal_value numeric(12,2) NOT NULL DEFAULT 0 CHECK(deal_value>=0);
ALTER TABLE conversations ADD COLUMN gross_profit numeric(12,2);
ALTER TABLE conversations ADD COLUMN deal_currency text NOT NULL DEFAULT 'UAH' CHECK(deal_currency IN ('UAH','USD','EUR','PLN'));
ALTER TABLE conversations ADD COLUMN outcome_at timestamptz;
ALTER TABLE conversations ADD COLUMN next_step text NOT NULL DEFAULT '';
ALTER TABLE conversations ADD COLUMN attribution jsonb NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX conversations_external ON conversations(connection_id,external_key) WHERE external_key IS NOT NULL;
CREATE TABLE conversation_notes (
 id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL,content text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE inbound_events (
 id uuid PRIMARY KEY,connection_id uuid NOT NULL REFERENCES channel_connections(id),external_id text NOT NULL,
 payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(connection_id,external_id)
);
CREATE TABLE delivery_outbox (
 id uuid PRIMARY KEY,seq bigint GENERATED ALWAYS AS IDENTITY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
 part integer NOT NULL,content text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','delivered','read','failed','uncertain','cancelled')),
 provider_message_id text,last_error text,lease_until timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(message_id,part)
);
CREATE INDEX delivery_status ON delivery_outbox(status,seq);
CREATE TABLE background_jobs (
 id uuid PRIMARY KEY,seq bigint GENERATED ALWAYS AS IDENTITY,key text UNIQUE NOT NULL,
 organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('incoming','delivery','notification','email')),
 payload jsonb NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','failed')),
 attempts integer NOT NULL DEFAULT 0,run_at timestamptz NOT NULL DEFAULT now(),lease_until timestamptz,lock_token uuid,last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_pending ON background_jobs(status,run_at,seq);
CREATE TABLE team_invites (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 email text NOT NULL,role text NOT NULL CHECK(role IN ('admin','agent')),token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '48 hours',used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE password_resets (
 token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE channel_costs (
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('website','telegram','whatsapp','viber','instagram')),
 month date NOT NULL CHECK(EXTRACT(DAY FROM month)=1),currency text NOT NULL CHECK(currency IN ('UAH','USD','EUR','PLN')),
 amount numeric(12,2) NOT NULL CHECK(amount>=0),version integer NOT NULL DEFAULT 1,
 PRIMARY KEY(organization_id,channel,month,currency)
);
CREATE TABLE notification_preferences (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE billing_accounts (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
 stripe_customer_id text UNIQUE,stripe_subscription_id text UNIQUE,
 plan text NOT NULL DEFAULT 'pilot',status text NOT NULL DEFAULT 'manual',period_end timestamptz,
 last_event_at bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing_events (id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());

-- The outbox is committed in the same transaction as the message. A process crash
-- cannot save an operator/AI reply while losing its delivery task.
CREATE FUNCTION queue_conversation_message() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c conversations%ROWTYPE; n integer; part_id uuid; piece text; width integer;
BEGIN
 SELECT * INTO c FROM conversations WHERE id=NEW.conversation_id;
 IF c.channel <> 'website' AND NEW.sender IN ('assistant','operator','system') THEN
  width := CASE WHEN c.channel='instagram' THEN 1000 ELSE 4000 END;
  FOR n IN 0..((char_length(NEW.content)-1)/width) LOOP
   part_id := gen_random_uuid(); piece := substring(NEW.content FROM n*width+1 FOR width);
   INSERT INTO delivery_outbox(id,organization_id,conversation_id,message_id,part,content)
    VALUES(part_id,c.organization_id,c.id,NEW.id,n,piece);
   INSERT INTO background_jobs(id,key,organization_id,kind,payload)
    VALUES(gen_random_uuid(),'delivery:'||part_id,c.organization_id,'delivery',jsonb_build_object('id',part_id));
  END LOOP;
 END IF;
 IF c.mode='human' AND c.status='open' THEN
  INSERT INTO background_jobs(id,key,organization_id,kind,payload)
   VALUES(gen_random_uuid(),'notify:'||c.id||':'||floor(extract(epoch FROM now())/300),c.organization_id,'notification',jsonb_build_object('id',c.id)) ON CONFLICT(key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION queue_conversation_message();
CREATE FUNCTION queue_handoff_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.mode='human' AND OLD.mode<>'human' AND NEW.status='open' THEN
  INSERT INTO background_jobs(id,key,organization_id,kind,payload)
   VALUES(gen_random_uuid(),'notify:'||NEW.id||':'||floor(extract(epoch FROM now())/300),NEW.organization_id,'notification',jsonb_build_object('id',NEW.id)) ON CONFLICT(key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_handoff AFTER UPDATE OF mode ON conversations FOR EACH ROW EXECUTE FUNCTION queue_handoff_notification();
ALTER TABLE billing_accounts ADD COLUMN checkout_url text;
ALTER TABLE billing_accounts ADD COLUMN checkout_expires_at timestamptz;
CREATE INDEX conversations_channel ON conversations(organization_id,channel,updated_at DESC);
CREATE INDEX conversations_assigned ON conversations(organization_id,assigned_to,updated_at DESC);
-- Conversation message activity must not invalidate an unrelated deal form edit.
ALTER TABLE conversations ADD COLUMN outcome_version integer NOT NULL DEFAULT 1;
