-- ============================================================
-- Senior Companion – Phase 4: Visit Lifecycle
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS visit_note              TEXT,
  ADD COLUMN IF NOT EXISTS visit_note_updated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_out_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS late_checkin_flag       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS late_checkout_flag      BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_category') THEN
    CREATE TYPE incident_category AS ENUM (
      'senior_did_not_answer',
      'companion_delayed',
      'senior_felt_unwell',
      'transportation_issue',
      'safety_concern',
      'inappropriate_behavior',
      'lost_property',
      'other'
    );
  END IF;
END$$;

ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS category          incident_category NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS reported_by_role  TEXT,
  ADD COLUMN IF NOT EXISTS is_resolved       BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'general';