-- ============================================================
-- Senior Companion – Initial Schema Migration
-- Run via: supabase db push  OR  supabase migration up
-- ============================================================

-- ── Enable required extensions ──────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Custom ENUM types ────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'senior',
  'family',
  'companion',
  'admin'
);

CREATE TYPE booking_status AS ENUM (
  'draft',
  'requested',
  'assigned',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
  'needs_review'
);

CREATE TYPE companion_verification_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'rejected',
  'suspended'
);

CREATE TYPE check_in_event_type AS ENUM (
  'check_in',
  'check_out',
  'waypoint'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app',
  'email',
  'sms'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'read'
);

CREATE TYPE incident_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- ── Helper: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── profiles ─────────────────────────────────────────────────
-- One row per auth.users account; holds common identity fields.

CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  date_of_birth DATE,
  city         TEXT,
  state        TEXT,
  zip_code     TEXT,
  bio          TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── senior_profiles ──────────────────────────────────────────

CREATE TABLE senior_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mobility_notes        TEXT,
  accessibility_needs   TEXT,
  preferred_language    TEXT NOT NULL DEFAULT 'English',
  -- Non-medical contextual info only (e.g., "wears hearing aid")
  medical_alert_info    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id)
);

CREATE TRIGGER senior_profiles_updated_at
  BEFORE UPDATE ON senior_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── family_senior_relationships ──────────────────────────────

CREATE TABLE family_senior_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  senior_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_label  TEXT NOT NULL DEFAULT 'Family Member',
  can_book            BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_summaries  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_profile_id, senior_profile_id)
);

-- ── companion_profiles ───────────────────────────────────────

CREATE TABLE companion_profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_status         companion_verification_status NOT NULL DEFAULT 'pending',
  background_check_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  hourly_rate                 NUMERIC(8,2) NOT NULL DEFAULT 0,
  max_travel_miles            INTEGER NOT NULL DEFAULT 10,
  languages_spoken            TEXT[] NOT NULL DEFAULT ARRAY['English'],
  activity_preferences        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  years_experience            INTEGER,
  linkedin_url                TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id)
);

CREATE TRIGGER companion_profiles_updated_at
  BEFORE UPDATE ON companion_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── companion_verifications ──────────────────────────────────

CREATE TABLE companion_verifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_profile_id  UUID NOT NULL REFERENCES companion_profiles(id) ON DELETE CASCADE,
  document_type         TEXT NOT NULL,
  document_url          TEXT,
  status                companion_verification_status NOT NULL DEFAULT 'pending',
  reviewer_notes        TEXT,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER companion_verifications_updated_at
  BEFORE UPDATE ON companion_verifications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── activity_types ───────────────────────────────────────────

CREATE TABLE activity_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_name   TEXT NOT NULL DEFAULT 'heart',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── bookings ─────────────────────────────────────────────────

CREATE TABLE bookings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_profile_id       UUID NOT NULL REFERENCES profiles(id),
  companion_profile_id    UUID REFERENCES companion_profiles(id),
  booked_by_profile_id    UUID NOT NULL REFERENCES profiles(id),
  activity_type_id        UUID NOT NULL REFERENCES activity_types(id),
  status                  booking_status NOT NULL DEFAULT 'draft',
  scheduled_date          DATE NOT NULL,
  scheduled_start_time    TIME NOT NULL,
  duration_hours          NUMERIC(4,2) NOT NULL DEFAULT 2,
  location_description    TEXT NOT NULL,
  special_notes           TEXT,
  companion_summary       TEXT,
  total_amount            NUMERIC(10,2),
  -- Senior Companion disclaimer must be acknowledged before booking confirms
  disclaimer_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bookings_senior_idx       ON bookings(senior_profile_id);
CREATE INDEX bookings_companion_idx    ON bookings(companion_profile_id);
CREATE INDEX bookings_status_idx       ON bookings(status);
CREATE INDEX bookings_scheduled_idx    ON bookings(scheduled_date);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── booking_status_history ───────────────────────────────────

CREATE TABLE booking_status_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status                  booking_status NOT NULL,
  changed_by_profile_id   UUID NOT NULL REFERENCES profiles(id),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX booking_status_history_booking_idx ON booking_status_history(booking_id);

-- ── check_in_events ──────────────────────────────────────────

CREATE TABLE check_in_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type  check_in_event_type NOT NULL,
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX check_in_events_booking_idx ON check_in_events(booking_id);

-- ── ratings ──────────────────────────────────────────────────

CREATE TABLE ratings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rated_by_profile_id   UUID NOT NULL REFERENCES profiles(id),
  rated_profile_id      UUID NOT NULL REFERENCES profiles(id),
  rating                SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, rated_by_profile_id)
);

-- ── emergency_contacts ───────────────────────────────────────

CREATE TABLE emergency_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  relationship        TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── notifications ────────────────────────────────────────────

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  channel             notification_channel NOT NULL DEFAULT 'in_app',
  status              notification_status NOT NULL DEFAULT 'pending',
  related_booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_profile_idx ON notifications(profile_id);
CREATE INDEX notifications_status_idx  ON notifications(status);

-- ── incident_reports ─────────────────────────────────────────

CREATE TABLE incident_reports (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                UUID NOT NULL REFERENCES bookings(id),
  reported_by_profile_id    UUID NOT NULL REFERENCES profiles(id),
  description               TEXT NOT NULL,
  severity                  incident_severity NOT NULL DEFAULT 'low',
  admin_notes               TEXT,
  resolved_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER incident_reports_updated_at
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY POLICIES
-- ════════════════════════════════════════════════════════════

ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_senior_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports          ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get the profile id of the calling user ─
CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Helper function: get the role of the calling user ───────
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── profiles policies ────────────────────────────────────────
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (auth_user_role() = 'admin');

CREATE POLICY "Authenticated users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Companions can see senior/family profiles for booking context
CREATE POLICY "Companions can view senior and family profiles"
  ON profiles FOR SELECT
  USING (
    auth_user_role() = 'companion'
    AND role IN ('senior', 'family')
  );

-- ── senior_profiles policies ─────────────────────────────────
CREATE POLICY "Seniors can manage their own senior_profile"
  ON senior_profiles FOR ALL
  USING (profile_id = auth_profile_id());

CREATE POLICY "Family can view linked seniors"
  ON senior_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_senior_relationships fsr
      WHERE fsr.senior_profile_id = senior_profiles.profile_id
        AND fsr.family_profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins can view all senior_profiles"
  ON senior_profiles FOR SELECT
  USING (auth_user_role() = 'admin');

-- ── companion_profiles policies ──────────────────────────────
CREATE POLICY "Companions manage their own profile"
  ON companion_profiles FOR ALL
  USING (profile_id = auth_profile_id());

CREATE POLICY "Authenticated can view approved companions"
  ON companion_profiles FOR SELECT
  USING (verification_status = 'approved' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can view and update all companion_profiles"
  ON companion_profiles FOR ALL
  USING (auth_user_role() = 'admin');

-- ── activity_types policies ──────────────────────────────────
CREATE POLICY "Anyone authenticated can read activity types"
  ON activity_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage activity types"
  ON activity_types FOR ALL
  USING (auth_user_role() = 'admin');

-- ── bookings policies ────────────────────────────────────────
CREATE POLICY "Seniors can see their own bookings"
  ON bookings FOR SELECT
  USING (senior_profile_id = auth_profile_id());

CREATE POLICY "Bookers can see bookings they created"
  ON bookings FOR SELECT
  USING (booked_by_profile_id = auth_profile_id());

CREATE POLICY "Companions can see their assigned bookings"
  ON bookings FOR SELECT
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Family can see bookings for their seniors"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_senior_relationships fsr
      WHERE fsr.senior_profile_id = bookings.senior_profile_id
        AND fsr.family_profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Seniors and family can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    auth_user_role() IN ('senior', 'family')
    AND booked_by_profile_id = auth_profile_id()
  );

CREATE POLICY "Booker can cancel their own bookings"
  ON bookings FOR UPDATE
  USING (booked_by_profile_id = auth_profile_id());

CREATE POLICY "Companions can update their assigned bookings"
  ON bookings FOR UPDATE
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  USING (auth_user_role() = 'admin');

-- ── notifications policies ───────────────────────────────────
CREATE POLICY "Users see their own notifications"
  ON notifications FOR SELECT
  USING (profile_id = auth_profile_id());

CREATE POLICY "Users can mark their notifications read"
  ON notifications FOR UPDATE
  USING (profile_id = auth_profile_id());

CREATE POLICY "Admins manage notifications"
  ON notifications FOR ALL
  USING (auth_user_role() = 'admin');

-- ── emergency_contacts policies ──────────────────────────────
CREATE POLICY "Seniors manage their own emergency contacts"
  ON emergency_contacts FOR ALL
  USING (senior_profile_id = auth_profile_id());

CREATE POLICY "Family can view emergency contacts for their seniors"
  ON emergency_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_senior_relationships fsr
      WHERE fsr.senior_profile_id = emergency_contacts.senior_profile_id
        AND fsr.family_profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins can view all emergency contacts"
  ON emergency_contacts FOR SELECT
  USING (auth_user_role() = 'admin');

-- ── ratings policies ─────────────────────────────────────────
CREATE POLICY "Participants in a booking can rate"
  ON ratings FOR INSERT
  WITH CHECK (rated_by_profile_id = auth_profile_id());

CREATE POLICY "Anyone authenticated can read ratings"
  ON ratings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── incident_reports policies ────────────────────────────────
CREATE POLICY "Participants can report an incident"
  ON incident_reports FOR INSERT
  WITH CHECK (reported_by_profile_id = auth_profile_id());

CREATE POLICY "Reporter can view their own reports"
  ON incident_reports FOR SELECT
  USING (reported_by_profile_id = auth_profile_id());

CREATE POLICY "Admins manage all incident reports"
  ON incident_reports FOR ALL
  USING (auth_user_role() = 'admin');

-- ── booking_status_history policies ─────────────────────────
CREATE POLICY "Booking participants can see history"
  ON booking_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id
        AND (
          b.senior_profile_id = auth_profile_id()
          OR b.booked_by_profile_id = auth_profile_id()
          OR b.companion_profile_id IN (
            SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
          )
        )
    )
    OR auth_user_role() = 'admin'
  );

-- ── check_in_events policies ─────────────────────────────────
CREATE POLICY "Companions can insert check-in events"
  ON check_in_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = check_in_events.booking_id
        AND b.companion_profile_id IN (
          SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
        )
    )
  );

CREATE POLICY "Booking participants can read check-in events"
  ON check_in_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = check_in_events.booking_id
        AND (
          b.senior_profile_id = auth_profile_id()
          OR b.booked_by_profile_id = auth_profile_id()
          OR b.companion_profile_id IN (
            SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
          )
        )
    )
    OR auth_user_role() = 'admin'
  );

-- ── family_senior_relationships policies ─────────────────────
CREATE POLICY "Family members manage their own relationships"
  ON family_senior_relationships FOR ALL
  USING (family_profile_id = auth_profile_id());

CREATE POLICY "Seniors can view relationships involving them"
  ON family_senior_relationships FOR SELECT
  USING (senior_profile_id = auth_profile_id());

CREATE POLICY "Admins manage all relationships"
  ON family_senior_relationships FOR ALL
  USING (auth_user_role() = 'admin');

-- ── companion_verifications policies ─────────────────────────
CREATE POLICY "Companions view their own verifications"
  ON companion_verifications FOR SELECT
  USING (
    companion_profile_id IN (
      SELECT id FROM companion_profiles WHERE profile_id = auth_profile_id()
    )
  );

CREATE POLICY "Admins manage all verifications"
  ON companion_verifications FOR ALL
  USING (auth_user_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE TRIGGER
-- Creates a profiles row when a new auth.users row is inserted
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile is inserted by the app immediately after signUp.
  -- This function is a safety net for cases where the app insert fails.
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
    INSERT INTO profiles (user_id, role, first_name, last_name)
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'senior'),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'User')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════
-- AUTO-CREATE ROLE-SPECIFIC PROFILE
-- When profiles.role is companion or senior, create sub-profile
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'companion' THEN
    INSERT INTO companion_profiles (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF NEW.role = 'senior' THEN
    INSERT INTO senior_profiles (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();
