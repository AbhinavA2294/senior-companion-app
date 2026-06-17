-- Phase 5: Admin Dashboard
-- audit_log, internal_notes, mock_refunds, seed data

-- audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID NOT NULL REFERENCES profiles(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx   ON audit_log(actor_profile_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON audit_log FOR SELECT USING (auth_user_role() = 'admin');
CREATE POLICY "Service role can insert audit log" ON audit_log FOR INSERT WITH CHECK (TRUE);

-- internal_notes
CREATE TABLE IF NOT EXISTS internal_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id UUID NOT NULL REFERENCES profiles(id),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  note            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS internal_notes_entity_idx ON internal_notes(entity_type, entity_id);
CREATE TRIGGER internal_notes_updated_at BEFORE UPDATE ON internal_notes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage internal notes" ON internal_notes FOR ALL USING (auth_user_role() = 'admin');

-- mock_refunds
CREATE TABLE IF NOT EXISTS mock_refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  issued_by_profile_id UUID NOT NULL REFERENCES profiles(id),
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','pending','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE mock_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mock refunds" ON mock_refunds FOR ALL USING (auth_user_role() = 'admin');

-- needs_review_reason
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS needs_review_reason TEXT;
