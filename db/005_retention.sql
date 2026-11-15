-- 0.6: Telegram alerts for the team, customer history by phone, next-service
-- follow-ups and voice message transcription.

-- A team member links a private Telegram chat to receive alerts with action buttons.
-- The one-time link code is stored only as a hash and expires after 15 minutes.
CREATE TABLE telegram_links (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 chat_id text,
 code_hash text UNIQUE,
 code_expires_at timestamptz,
 locale text NOT NULL DEFAULT 'ru' CHECK(locale IN ('ru','uk','en')),
 linked_at timestamptz,
 PRIMARY KEY(user_id,organization_id)
);
CREATE INDEX telegram_links_chat ON telegram_links(chat_id) WHERE chat_id IS NOT NULL;

-- Visit amount for customer history, and a normalized phone key (last 9 digits)
-- so "+380 50 111-22-33" and "0501112233" are the same customer.
ALTER TABLE appointments ADD COLUMN amount numeric(12,2);
ALTER TABLE appointments ADD COLUMN phone_key text GENERATED ALWAYS AS (
 CASE WHEN length(regexp_replace(customer_phone,'\D','','g'))>=9
  THEN right(regexp_replace(customer_phone,'\D','','g'),9) END
) STORED;
CREATE INDEX appointments_phone ON appointments(organization_id,phone_key) WHERE phone_key IS NOT NULL;

-- One follow-up per finished visit: "time for the next service, shall we book you?"
-- Sent into the original chat when the channel allows it, otherwise listed for a call.
CREATE TABLE service_followups (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
 conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
 due_at timestamptz NOT NULL,
 months integer NOT NULL CHECK(months BETWEEN 1 AND 36),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','call','done','cancelled','skipped')),
 reason text,
 sent_at timestamptz,
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_followups_due ON service_followups(organization_id,status,due_at);

ALTER TABLE background_jobs DROP CONSTRAINT background_jobs_kind_check;
ALTER TABLE background_jobs ADD CONSTRAINT background_jobs_kind_check CHECK(kind IN ('incoming','delivery','notification','email','reminder','followup'));
