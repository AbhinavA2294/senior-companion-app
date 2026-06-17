-- Phase 6: Payment Architecture
-- payments, payment_refunds tables. MockPaymentProvider only — no Stripe keys.

-- payments: one record per booking, tracks the full payment lifecycle
CREATE TABLE IF NOT EXISTS payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID NOT NULL REFERENCES bookings(id),
  provider                TEXT NOT NULL DEFAULT 'mock',
  provider_payment_id     TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','captured','refunded','partially_refunded','failed','cancelled')),
  amount_cents            INTEGER NOT NULL,
  service_amount_cents    INTEGER NOT NULL,
  booking_fee_cents       INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents      INTEGER NOT NULL DEFAULT 0,
  companion_payout_cents  INTEGER NOT NULL DEFAULT 0,
  currency                TEXT NOT NULL DEFAULT 'usd',
  authorized_at           TIMESTAMPTZ,
  captured_at             TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  failed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_booking_idx ON payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- payment_refunds: one record per refund issued against a payment
CREATE TABLE IF NOT EXISTS payment_refunds (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id              UUID NOT NULL REFERENCES payments(id),
  provider_refund_id      TEXT NOT NULL,
  amount_cents            INTEGER NOT NULL,
  reason                  TEXT NOT NULL,
  issued_by_profile_id    UUID NOT NULL REFERENCES profiles(id),
  status                  TEXT NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('succeeded','pending','failed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_refunds_payment_idx ON payment_refunds(payment_id);
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

-- RLS: admins (using admin client with service role) bypass RLS automatically.
-- These policies cover client-side reads.

CREATE POLICY "Admins read all payments"
  ON payments FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "Bookers read their booking payments"
  ON payments FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN profiles p ON p.id = b.booked_by_profile_id
      WHERE p.user_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN profiles p ON p.id = b.senior_profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Companions read their earnings"
  ON payments FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN companion_profiles cp ON cp.id = b.companion_profile_id
      JOIN profiles p ON p.id = cp.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all payment refunds"
  ON payment_refunds FOR SELECT
  USING (auth_user_role() = 'admin');

CREATE POLICY "Bookers read refunds on their payments"
  ON payment_refunds FOR SELECT
  USING (
    payment_id IN (
      SELECT pay.id FROM payments pay
      JOIN bookings b ON b.id = pay.booking_id
      JOIN profiles p ON p.id = b.booked_by_profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Service role inserts (used by server actions via createAdminClient)
CREATE POLICY "Service role manages payments"
  ON payments FOR ALL WITH CHECK (TRUE);

CREATE POLICY "Service role manages payment refunds"
  ON payment_refunds FOR ALL WITH CHECK (TRUE);
