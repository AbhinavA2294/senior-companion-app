-- ============================================================
-- Senior Companion – Companion Phase 3
-- Adds companion onboarding fields, availability, booking
-- assignment workflow, references, training records, and
-- companion status history.  Tightens companion RLS so
-- companions only see senior data for their accepted visits.
-- ============================================================

-- ── 1. New columns on companion_profiles ─────────────────────

ALTER TABLE companion_profiles
  ADD COLUMN IF NOT EXISTS interests                         TEXT[]   NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS activities_supported              TEXT[]   NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS has_prior_experience              BOOLEAN  NOT NULL DEFAULT FALSE,
  -- Government-ID verification (no raw images stored in MVP)
  ADD COLUMN IF NOT EXISTS id_verification_status           TEXT     NOT NULL DEFAULT 'not_submitted'
    CHECK (id_verification_status IN
      ('not_submitted','submitted','under_review','verified','rejected')),
  ADD COLUMN IF NOT EXISTS id_provider_reference            TEXT,
  ADD COLUMN IF NOT EXISTS id_verification_notes            TEXT,
  ADD COLUMN IF NOT EXISTS id_verified_at                   TIMESTAMPTZ,
  -- Background check (adapter interface; no live provider in MVP)
  ADD COLUMN IF NOT EXISTS background_check_status          TEXT     NOT NULL DEFAULT 'not_requested'
    CHECK (background_check_status IN
      ('not_requested','requested','in_progress','completed','rejected')),
  ADD COLUMN IF NOT EXISTS background_check_consent         BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS background_check_consent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS background_check_provider_ref    TEXT,
  ADD COLUMN IF NOT EXISTS background_check_admin_notes     TEXT,
  ADD COLUMN IF NOT EXISTS background_check_requested_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS background_check_completed_at    TIMESTAMPTZ,
  -- Compliance checkboxes
  ADD COLUMN IF NOT EXISTS code_of_conduct_accepted         BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS code_of_conduct_accepted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emergency_protocol_completed     BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS emergency_protocol_completed_at  TIMESTAMPTZ;

-- ── 2. assignment_status enum ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM ('pending', 'accepted', 'declined');
  END IF;
END$$;

-- ── 3. companion_availability ─────────────────────────────────
-- Stores weekly recurring time blocks per companion.
-- day_of_week: 0 = Sunday … 6 = Saturday.

CREATE TABLE IF NOT EXISTS companion_availability (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_profile_id UUID     NOT NULL REFERENCES companion_profiles(id) ON DELETE CASCADE,
  day_of_week          SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time           TIME     NOT NULL,
  end_time             TIME     NOT NULL,
  is_active            BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS companion_availability_companion_idx
  ON companion_availability(companion_profile_id);

CREATE TRIGGER companion_availability_updated_at
  BEFORE UPDATE ON companion_availability
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── 4. booking_assignments ────────────────────────────────────
-- Admin offers a booking to one or more approved companions.
-- The first companion to accept confirms the booking.

CREATE TABLE IF NOT EXISTS booking_assignments (
  id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID              NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  companion_profile_id    UUID              NOT NULL REFERENCES companion_profiles(id),
  assigned_by_profile_id  UUID              NOT NULL REFERENCES profiles(id),
  status                  assignment_status NOT NULL DEFAULT 'pending',
  assigned_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  responded_at            TIMESTAMPTZ,
  decline_reason          TEXT,
  created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, companion_profile_id)
);

CREATE INDEX IF NOT EXISTS booking_assignments_booking_idx
  ON booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS booking_assignments_companion_idx
  ON booking_assignments(companion_profile_id);
CREATE INDEX IF NOT EXISTS booking_assignments_status_idx
  ON booking_assignments(status);

CREATE TRIGGER booking_assignments_updated_at
  BEFORE UPDATE ON booking_assignments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── 5. companion_references ───────────────────────────────────

CREATE TABLE IF NOT EXISTS companion_references (
  id                   UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_profile_id UUID     NOT NULL REFERENCES companion_profiles(id) ON DELETE CASCADE,
  reference_name       TEXT     NOT NULL,
  reference_phone      TEXT     NOT NULL,
  reference_email      TEXT,
  relationship         TEXT     NOT NULL,
  sort_order           SMALLINT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS companion_references_companion_idx
  ON companion_references(companion_profile_id);

CREATE TRIGGER companion_references_updated_at
  BEFORE UPDATE ON companion_references
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── 6. companion_training_records ─────────────────────────────

CREATE TABLE IF NOT EXISTS companion_training_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_profile_id    UUID NOT NULL REFERENCES companion_profiles(id) ON DELETE CASCADE,
  training_type           TEXT NOT NULL,
  completed_at            TIMESTAMPTZ,
  notes                   TEXT,
  recorded_by_profile_id  UUID REFERENCES profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS companion_training_companion_idx
  ON companion_training_records(companion_profile_id);

CREATE TRIGGER companion_training_records_updated_at
  BEFORE UPDATE ON companion_training_records
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── 7. companion_status_history ───────────────────────────────

CREATE TABLE IF NOT EXISTS companion_status_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_profile_id    UUID NOT NULL REFERENCES companion_profiles(id) ON DELETE CASCADE,
  previous_status         companion_verification_status,
  new_status              companion_verification_status NOT NULL,
  changed_by_profile_id   UUID NOT NULL REFERENCES profiles(id),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS companion_status_history_companion_idx
  ON companion_status_history(companion_profile_id);

-- ── 8. Enable RLS on new tables ───────────────────────────────

ALTER TABLE companion_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_references      ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_status_history  ENABLE ROW LEVEL SECURITY;

-- ── 9. RLS policies: companion_availability ───────────────────

CREATE POLICY "Companions manage their own availability"
  ON companion_availability FOR ALL
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins manage all companion availability"
  ON companion_availability FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY "Authenticated users view approved companion availability"
  ON companion_availability FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE verification_status = 'approved'
    )
  );

-- ── 10. RLS policies: booking_assignments ─────────────────────

-- Companions see assignments directed at them
CREATE POLICY "Companions see their own assignments"
  ON booking_assignments FOR SELECT
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

-- Companions respond to their own pending assignments
CREATE POLICY "Companions update their own assignments"
  ON booking_assignments FOR UPDATE
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

-- Seniors and family see accepted assignments for their bookings
CREATE POLICY "Seniors see accepted assignments for their bookings"
  ON booking_assignments FOR SELECT
  USING (
    status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_assignments.booking_id
        AND (
          b.senior_profile_id = auth_profile_id()
          OR b.booked_by_profile_id = auth_profile_id()
          OR EXISTS (
            SELECT 1 FROM family_senior_relationships fsr
            WHERE fsr.senior_profile_id = b.senior_profile_id
              AND fsr.family_profile_id = auth_profile_id()
          )
        )
    )
  );

-- Admins manage all assignments
CREATE POLICY "Admins manage all booking assignments"
  ON booking_assignments FOR ALL
  USING (auth_user_role() = 'admin');

-- ── 11. RLS policies: companion_references ────────────────────

CREATE POLICY "Companions manage their own references"
  ON companion_references FOR ALL
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins view all companion references"
  ON companion_references FOR SELECT
  USING (auth_user_role() = 'admin');

-- ── 12. RLS policies: companion_training_records ──────────────

CREATE POLICY "Companions view their own training records"
  ON companion_training_records FOR SELECT
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins manage all training records"
  ON companion_training_records FOR ALL
  USING (auth_user_role() = 'admin');

-- ── 13. RLS policies: companion_status_history ────────────────

CREATE POLICY "Companions view their own status history"
  ON companion_status_history FOR SELECT
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins manage all companion status history"
  ON companion_status_history FOR ALL
  USING (auth_user_role() = 'admin');

-- ── 14. Tighten companion access to profiles ──────────────────
-- Replace the broad policy (all senior/family profiles) with one
-- that exposes only seniors whose booking the companion has accepted.

DROP POLICY IF EXISTS "Companions can view senior and family profiles" ON profiles;

-- Companions see their own profile (covered by "Users can view their own profile"
-- but also allow via role check for dashboard queries)
CREATE POLICY "Companions see their own profile row"
  ON profiles FOR SELECT
  USING (
    auth_user_role() = 'companion'
    AND user_id = auth.uid()
  );

-- Companions see senior profiles only for accepted assignments
CREATE POLICY "Companions see seniors for accepted assignments"
  ON profiles FOR SELECT
  USING (
    auth_user_role() = 'companion'
    AND role = 'senior'
    AND id IN (
      SELECT b.senior_profile_id
      FROM bookings b
      JOIN booking_assignments ba ON ba.booking_id = b.id
      WHERE ba.companion_profile_id IN (
        SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
      )
        AND ba.status = 'accepted'
    )
  );

-- ── 15. Companions see senior_profiles for accepted assignments ─

CREATE POLICY "Companions see senior_profiles for accepted assignments"
  ON senior_profiles FOR SELECT
  USING (
    auth_user_role() = 'companion'
    AND profile_id IN (
      SELECT b.senior_profile_id
      FROM bookings b
      JOIN booking_assignments ba ON ba.booking_id = b.id
      WHERE ba.companion_profile_id IN (
        SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
      )
        AND ba.status = 'accepted'
    )
  );

-- ── 16. Companions see emergency contacts for accepted visits ──

CREATE POLICY "Companions see emergency contacts for accepted assignments"
  ON emergency_contacts FOR SELECT
  USING (
    auth_user_role() = 'companion'
    AND senior_profile_id IN (
      SELECT b.senior_profile_id
      FROM bookings b
      JOIN booking_assignments ba ON ba.booking_id = b.id
      WHERE ba.companion_profile_id IN (
        SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
      )
        AND ba.status = 'accepted'
    )
  );

-- ── 17. Companions see bookings they have any assignment for ───
-- Allows companions to view booking details while responding.

CREATE POLICY "Companions see bookings via assignments"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_assignments ba
      WHERE ba.booking_id = bookings.id
        AND ba.companion_profile_id IN (
          SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
        )
    )
  );
