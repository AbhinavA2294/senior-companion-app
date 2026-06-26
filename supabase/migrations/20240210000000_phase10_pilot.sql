-- ============================================================
-- Phase 10: Pilot Readiness
-- Admin-configurable settings, booking feedback, pilot metrics
-- ============================================================

-- ── 1. pilot_settings (key-value config store) ───────────────────────────────
CREATE TABLE IF NOT EXISTS pilot_settings (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  value_type   TEXT NOT NULL DEFAULT 'text'  -- 'text' | 'number' | 'boolean' | 'time'
    CHECK (value_type IN ('text', 'number', 'boolean', 'time')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES profiles(id)
);

COMMENT ON TABLE pilot_settings IS
  'Admin-configurable operational settings for the pilot. '
  'All enforcement happens server-side; this table is the source of truth.';

ALTER TABLE pilot_settings ENABLE ROW LEVEL SECURITY;

-- Only admins may read/write settings.
-- Server actions that need settings use the service role.
CREATE POLICY "Admins manage pilot settings"
  ON pilot_settings FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY "Service role manages pilot settings"
  ON pilot_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Seed defaults
INSERT INTO pilot_settings (key, value, label, description, value_type) VALUES
  ('service_hours_start',          '08:00', 'Service opens',                     'Earliest allowed booking start time (HH:MM, 24-hour).', 'time'),
  ('service_hours_end',            '20:00', 'Service closes',                    'Latest allowed booking END time (HH:MM, 24-hour). A 2-hour booking starting at 18:00 ends at 20:00 — exactly allowed.', 'time'),
  ('min_booking_hours',            '2',     'Minimum booking duration (hours)',   'Shortest booking the system will accept.', 'number'),
  ('max_booking_hours',            '6',     'Maximum booking duration (hours)',   'Longest booking the system will accept. Overnight bookings are always blocked regardless of this setting.', 'number'),
  ('min_advance_hours',            '12',    'Minimum advance notice (hours)',     'How far ahead a booking must be made.', 'number'),
  ('max_advance_days',             '30',    'Maximum advance booking (days)',     'How far in the future a booking may be scheduled.', 'number'),
  ('support_phone',                '1-800-555-CARE', 'Support phone number',     'Displayed to users during bookings and on the support page.', 'text'),
  ('support_email',                'support@seniorcompanion.example.com', 'Support email', 'Contact email shown to users.', 'text'),
  ('service_area_description',     'Greater Metro Area (Pilot)',  'Service area description', 'Plain-text description shown to users.', 'text'),
  ('service_zip_codes',            '',      'Allowed ZIP codes',                 'Comma-separated ZIP codes (leave blank to allow any area during pilot).', 'text'),
  ('pilot_max_seniors',            '25',    'Maximum pilot seniors',             'Soft cap on active senior accounts during the pilot.', 'number'),
  ('pilot_max_companions',         '20',    'Maximum pilot companions',          'Soft cap on active companion accounts during the pilot.', 'number'),
  ('require_first_booking_review', 'true',  'Flag first booking for review',     'When enabled, a senior''s first-ever booking is flagged for admin attention before assignment.', 'boolean'),
  ('require_human_ai_review',      'true',  'Require human review of AI matches','When enabled, admins must manually confirm companion recommendations from the matching engine.', 'boolean'),
  ('feedback_enabled',             'true',  'Post-booking feedback form',        'Allow seniors and family members to submit a satisfaction survey after each completed visit.', 'boolean')
ON CONFLICT (key) DO NOTHING;

-- ── 2. is_first_booking column on bookings ───────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_first_booking BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN bookings.is_first_booking IS
  'True when this is the first-ever booking for the senior. '
  'Set by the server action at creation time and used by admins to prioritise review.';

-- ── 3. booking_feedback (post-visit satisfaction survey) ─────────────────────
CREATE TABLE IF NOT EXISTS booking_feedback (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  submitted_by_profile_id UUID NOT NULL REFERENCES profiles(id),
  submitted_by_role      TEXT NOT NULL CHECK (submitted_by_role IN ('senior', 'family')),
  overall_rating         SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  companion_punctual     BOOLEAN,
  felt_safe              BOOLEAN,
  would_rebook           BOOLEAN,
  feedback_text          TEXT CHECK (LENGTH(feedback_text) <= 1000),
  submitted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, submitted_by_profile_id)
);

COMMENT ON TABLE booking_feedback IS
  'Short satisfaction survey submitted after a completed visit. '
  'Separate from star ratings in the ratings table. Pilot KPI source.';

CREATE INDEX booking_feedback_booking_idx ON booking_feedback(booking_id);

ALTER TABLE booking_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seniors and family submit their own feedback"
  ON booking_feedback FOR INSERT
  WITH CHECK (
    submitted_by_profile_id = auth_profile_id()
    AND submitted_by_role IN ('senior', 'family')
  );

CREATE POLICY "Users view their own submitted feedback"
  ON booking_feedback FOR SELECT
  USING (submitted_by_profile_id = auth_profile_id());

CREATE POLICY "Admins view all feedback"
  ON booking_feedback FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "Service role manages feedback"
  ON booking_feedback FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. Pilot metrics view ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW pilot_metrics AS
SELECT
  COUNT(*)                                                              AS total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed')                         AS completed_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled')                         AS cancelled_bookings,
  COUNT(*) FILTER (WHERE status IN ('requested', 'assigned'))          AS pending_bookings,
  COUNT(*) FILTER (WHERE status = 'in_progress')                       AS active_bookings,
  COUNT(*) FILTER (WHERE late_checkin_flag = TRUE)                     AS late_checkins,
  COUNT(*) FILTER (WHERE late_checkout_flag = TRUE)                    AS late_checkouts,
  COUNT(*) FILTER (WHERE is_first_booking = TRUE)                      AS first_bookings,
  COUNT(DISTINCT senior_profile_id)                                    AS unique_seniors,
  COUNT(DISTINCT companion_profile_id)
    FILTER (WHERE companion_profile_id IS NOT NULL)                    AS unique_companions
FROM bookings;

COMMENT ON VIEW pilot_metrics IS
  'Aggregate pilot KPIs derived from the bookings table. '
  'Refresh with SELECT * FROM pilot_metrics.';
