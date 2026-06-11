-- ============================================================
-- Senior Companion – Extend Senior Profiles
-- Adds managed-profile support, extended senior fields,
-- booking address/transport fields, and new RLS policies.
-- ============================================================

-- ── 1. Make profiles.user_id nullable ────────────────────────
-- Allows family members to create "managed" senior profiles
-- for seniors who may not have their own auth accounts.
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- ── 2. Managed-profile columns on profiles ───────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_managed           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS managed_by_profile_id UUID    REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS street_address        TEXT;

-- ── 3. Extended senior-profile fields ────────────────────────
ALTER TABLE senior_profiles
  ADD COLUMN IF NOT EXISTS preferred_name             TEXT,
  ADD COLUMN IF NOT EXISTS contact_email              TEXT,
  ADD COLUMN IF NOT EXISTS additional_languages       TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_companion_gender TEXT    CHECK (preferred_companion_gender IN ('male','female','no_preference')),
  ADD COLUMN IF NOT EXISTS interests                  TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS dietary_notes              TEXT,
  ADD COLUMN IF NOT EXISTS free_text_notes            TEXT;

-- ── 4. Booking address + transportation fields ───────────────
-- transportation_mode intentionally excludes personal/companion vehicle
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS destination_address TEXT,
  ADD COLUMN IF NOT EXISTS transportation_mode TEXT
    CHECK (transportation_mode IN ('walk','public_transit','rideshare','other'));

-- ── 5. RLS policies for managed profiles ─────────────────────

-- Family can view profiles they directly manage
CREATE POLICY "Family can view managed profiles they own"
  ON profiles FOR SELECT
  USING (
    is_managed = TRUE
    AND managed_by_profile_id = auth_profile_id()
  );

-- Family can insert managed senior profiles
CREATE POLICY "Family can insert managed senior profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    is_managed = TRUE
    AND managed_by_profile_id = auth_profile_id()
    AND user_id IS NULL
    AND role = 'senior'
  );

-- Family can update managed profiles they own
CREATE POLICY "Family can update managed profiles they own"
  ON profiles FOR UPDATE
  USING (
    is_managed = TRUE
    AND managed_by_profile_id = auth_profile_id()
  );

-- Family can update senior_profiles for directly managed seniors
CREATE POLICY "Family can update senior_profiles for managed seniors"
  ON senior_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = senior_profiles.profile_id
        AND p.managed_by_profile_id = auth_profile_id()
    )
    OR EXISTS (
      SELECT 1 FROM family_senior_relationships fsr
      WHERE fsr.senior_profile_id = senior_profiles.profile_id
        AND fsr.family_profile_id = auth_profile_id()
    )
  );

-- Family can insert senior_profiles rows for managed seniors
CREATE POLICY "Family can insert senior_profiles for managed seniors"
  ON senior_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = senior_profiles.profile_id
        AND p.managed_by_profile_id = auth_profile_id()
    )
  );

-- Family can manage emergency contacts for linked/managed seniors
CREATE POLICY "Family can manage emergency contacts for linked seniors"
  ON emergency_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_senior_relationships fsr
      WHERE fsr.senior_profile_id = emergency_contacts.senior_profile_id
        AND fsr.family_profile_id = auth_profile_id()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = emergency_contacts.senior_profile_id
        AND p.managed_by_profile_id = auth_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_senior_relationships fsr
      WHERE fsr.senior_profile_id = emergency_contacts.senior_profile_id
        AND fsr.family_profile_id = auth_profile_id()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = emergency_contacts.senior_profile_id
        AND p.managed_by_profile_id = auth_profile_id()
    )
  );
