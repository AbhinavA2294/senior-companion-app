-- Phase 7: AI-Powered Companion Matching
-- Adds a matching_recommendations table to persist recommendation runs for audit.

CREATE TABLE IF NOT EXISTS matching_recommendations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  run_by_profile_id    UUID NOT NULL REFERENCES profiles(id),
  candidate_count      INTEGER NOT NULL DEFAULT 0,
  excluded_count       INTEGER NOT NULL DEFAULT 0,
  candidates           JSONB NOT NULL DEFAULT '[]',
  weights_used         JSONB NOT NULL DEFAULT '{}',
  feature_flags        JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS matching_recommendations_booking_idx
  ON matching_recommendations(booking_id);
CREATE INDEX IF NOT EXISTS matching_recommendations_run_by_idx
  ON matching_recommendations(run_by_profile_id);
CREATE INDEX IF NOT EXISTS matching_recommendations_created_idx
  ON matching_recommendations(created_at DESC);

ALTER TABLE matching_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage matching recommendations"
  ON matching_recommendations FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY "Service role manages matching recommendations"
  ON matching_recommendations FOR ALL
  WITH CHECK (TRUE);

-- Add internal_notes author column alias (was missing from phase 5 query)
-- The internal_notes table uses author_profile_id but page queries use author:profiles(...)
-- This is a view alias; no schema change needed — just documenting the join.

-- Notification type column was added in phase 4; ensure it exists on older instances.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'general';
