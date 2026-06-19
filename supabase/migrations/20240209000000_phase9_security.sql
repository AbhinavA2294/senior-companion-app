-- ============================================================
-- Phase 9: Security and Privacy Hardening
-- ============================================================

-- ── 1. Prevent companions from self-escalating verification_status ───────────
-- Companions manage their own profile rows (hourly_rate, languages, etc.)
-- but must NOT be able to change their own verification_status.
-- Only service-role calls (admin actions) may change that field.

CREATE OR REPLACE FUNCTION prevent_companion_status_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.uid() returns NULL when called via service role (admin operations).
  -- If there IS a calling user and they are changing verification_status,
  -- block it — verification is an admin-only operation.
  IF auth.uid() IS NOT NULL
     AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'verification_status can only be changed by administrators.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER companion_profiles_guard_status
  BEFORE UPDATE ON companion_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_companion_status_self_escalation();

-- ── 2. Tighten companion visibility of senior/family profiles ────────────────
-- Old policy gave ALL companions read access to ALL senior/family profiles.
-- New policy restricts to seniors who share at least one booking with the companion.

DROP POLICY IF EXISTS "Companions can view senior and family profiles" ON profiles;

CREATE POLICY "Companions can view profiles for their bookings"
  ON profiles FOR SELECT
  USING (
    auth_user_role() = 'companion'
    AND (
      -- Seniors: only those with a shared booking
      (role = 'senior' AND EXISTS (
        SELECT 1
        FROM bookings b
        JOIN companion_profiles cp ON cp.id = b.companion_profile_id
        WHERE cp.profile_id = auth_profile_id()
          AND b.senior_profile_id = profiles.id
      ))
      OR
      -- Family: only those who booked a shared visit
      (role = 'family' AND EXISTS (
        SELECT 1
        FROM bookings b
        JOIN companion_profiles cp ON cp.id = b.companion_profile_id
        WHERE cp.profile_id = auth_profile_id()
          AND b.booked_by_profile_id = profiles.id
      ))
    )
  );

-- ── 3. Harden handle_new_user trigger — block admin self-promotion ───────────
-- The original trigger reads 'role' from raw_user_meta_data, which the
-- client controls during signUp(). An attacker could register as 'admin'.
-- Fix: only allow safe roles; admin must be granted by an existing admin.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  safe_role user_role;
  meta_role TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
    meta_role := NEW.raw_user_meta_data->>'role';
    -- Whitelist safe self-registration roles. 'admin' is intentionally excluded.
    safe_role := CASE
      WHEN meta_role IN ('senior', 'family', 'companion') THEN meta_role::user_role
      ELSE 'senior'::user_role
    END;

    INSERT INTO profiles (user_id, role, first_name, last_name)
    VALUES (
      NEW.id,
      safe_role,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
      COALESCE(NEW.raw_user_meta_data->>'last_name',  'User')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Consent records table ─────────────────────────────────────────────────
-- Records when users consented to terms, privacy policy, location use, etc.
-- Required for GDPR/CCPA compliance during the pilot.

CREATE TABLE IF NOT EXISTS user_consent_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type  TEXT NOT NULL
    CHECK (consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'location_data_checkin',
      'data_processing',
      'marketing_emails'
    )),
  version       TEXT NOT NULL,       -- e.g. '2024-06-01'
  consented_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address    INET,                -- captured at consent time for legal record
  user_agent    TEXT,
  withdrawn_at  TIMESTAMPTZ,         -- set when user withdraws consent
  UNIQUE (profile_id, consent_type)
);

COMMENT ON TABLE user_consent_records IS
  'Immutable audit log of user consent events. Required for GDPR Art.7 and CCPA. '
  'Do not delete rows — set withdrawn_at instead.';

ALTER TABLE user_consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own consent records"
  ON user_consent_records FOR SELECT
  USING (profile_id = auth_profile_id());

CREATE POLICY "Service role manages consent records"
  ON user_consent_records FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins view all consent records"
  ON user_consent_records FOR SELECT
  USING (auth_user_role() = 'admin');

-- ── 5. Data deletion request queue ──────────────────────────────────────────
-- Placeholder table for Right-to-Erasure (GDPR Art.17) / CCPA requests.
-- A manual or automated workflow must process these within 30 days.

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason          TEXT,
  processed_at    TIMESTAMPTZ,
  processed_by    UUID REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'denied')),
  notes           TEXT
);

COMMENT ON TABLE account_deletion_requests IS
  'PLACEHOLDER: Right-to-Erasure queue. Before pilot launch, implement a '
  'workflow that: (1) anonymizes bookings for financial records, '
  '(2) deletes personal profile fields, (3) deletes auth.users record, '
  '(4) logs to an immutable audit trail. Target: 30-day SLA.';

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can request their own deletion"
  ON account_deletion_requests FOR INSERT
  WITH CHECK (profile_id = auth_profile_id());

CREATE POLICY "Users can view their own deletion request"
  ON account_deletion_requests FOR SELECT
  USING (profile_id = auth_profile_id());

CREATE POLICY "Admins manage all deletion requests"
  ON account_deletion_requests FOR ALL
  USING (auth_user_role() = 'admin');

-- ── 6. Data retention comments ───────────────────────────────────────────────

COMMENT ON TABLE check_in_events IS
  'GPS coordinates stored only at check-in and check-out — not continuously tracked. '
  'Retention policy (TO BE ENFORCED): anonymize latitude/longitude after 90 days; '
  'retain the event record (without coordinates) for 2 years for dispute resolution.';

COMMENT ON TABLE bookings IS
  'Booking records. Retention: retain for 7 years for financial/legal obligations. '
  'After retention period, anonymize senior/companion names but retain aggregate stats.';

COMMENT ON TABLE profiles IS
  'User profiles. On account deletion request: anonymize first_name, last_name, phone, '
  'date_of_birth, bio, avatar_url. Retain the UUID for referential integrity.';

COMMENT ON TABLE emergency_contacts IS
  'Emergency contact PII. Delete when the linked senior profile is deleted. '
  'Access: restricted to the senior, their linked family members, and admins only.';

COMMENT ON TABLE incident_reports IS
  'Incident reports. Retention: retain indefinitely for safety record-keeping. '
  'Redact description PII on account deletion if legally permissible.';

COMMENT ON COLUMN senior_profiles.medical_alert_info IS
  'Non-medical contextual info only (e.g. "wears hearing aid", "uses walker"). '
  'MUST NOT contain diagnoses, prescriptions, insurance, or SSN. '
  'Enforced by UI disclaimer — consider adding a DB CHECK constraint before launch.';

-- ── 7. Verify verification document storage is private (manual step) ─────────
-- companion_verifications.document_url must point to a Supabase Storage
-- PRIVATE bucket, never a public bucket. Access requires the companion's own
-- JWT or an admin JWT via a signed URL. This cannot be enforced at the DB
-- level; it must be enforced in the storage bucket policy.
-- ACTION REQUIRED: Confirm 'companion-documents' bucket has RLS enabled
-- and no public read access before accepting document uploads.

COMMENT ON COLUMN companion_verifications.document_url IS
  'URL to a verification document in a PRIVATE Supabase Storage bucket. '
  'Must never point to a public bucket. Generate signed URLs for access.';
