-- 0.5: service station booking. Online appointments are always preliminary until
-- a team member confirms them; capacity is checked against working hours and bays.
ALTER TABLE organizations ADD COLUMN booking_settings jsonb NOT NULL DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN booking_version integer NOT NULL DEFAULT 1;
ALTER TABLE conversations ADD COLUMN intake jsonb NOT NULL DEFAULT '{}';
CREATE TABLE appointments (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
 service_entry_id uuid REFERENCES knowledge_entries(id) ON DELETE SET NULL,
 service_title text NOT NULL DEFAULT '',
 starts_at timestamptz NOT NULL,
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 5 AND 1440),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','confirmed','cancelled','done','no_show')),
 customer_name text NOT NULL DEFAULT '',
 customer_phone text NOT NULL DEFAULT '',
 vehicle jsonb NOT NULL DEFAULT '{}',
 note text NOT NULL DEFAULT '',
 source text NOT NULL DEFAULT 'operator' CHECK(source IN ('ai','operator')),
 created_by uuid REFERENCES users(id) ON DELETE SET NULL,
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointments_org_start ON appointments(organization_id,starts_at);
CREATE INDEX appointments_conversation ON appointments(conversation_id);
ALTER TABLE background_jobs DROP CONSTRAINT background_jobs_kind_check;
ALTER TABLE background_jobs ADD CONSTRAINT background_jobs_kind_check CHECK(kind IN ('incoming','delivery','notification','email','reminder'));
