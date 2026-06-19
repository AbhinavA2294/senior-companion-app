-- Phase 8: Accessibility and Voice-Assisted Booking
-- Adds UI language, text size, and reduced-complexity preferences to profiles.
-- Voice booking submits through the existing bookings table (no schema change needed).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ui_language TEXT NOT NULL DEFAULT 'en'
    CHECK (ui_language IN ('en', 'es', 'hi', 'ta')),
  ADD COLUMN IF NOT EXISTS text_size TEXT NOT NULL DEFAULT 'normal'
    CHECK (text_size IN ('normal', 'large', 'xl')),
  ADD COLUMN IF NOT EXISTS reduced_complexity_mode BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN profiles.ui_language IS 'Preferred display language for the app UI (BCP-47 code)';
COMMENT ON COLUMN profiles.text_size IS 'Font size preference: normal (16px), large (19px), xl (22px)';
COMMENT ON COLUMN profiles.reduced_complexity_mode IS 'When true, hide advanced metrics and show simplified dashboard';
