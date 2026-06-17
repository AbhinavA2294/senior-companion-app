// All monetary values in cents (USD).
// Change these constants to adjust pricing for the entire application.
export const PRICING = {
  HOURLY_RATE_CENTS: 3500,        // $35.00/hr — what the customer pays
  PLATFORM_FEE_PERCENTAGE: 0.20,  // 20% of service amount
  MINIMUM_HOURS: 2,               // two-hour minimum per booking
  BOOKING_FEE_CENTS: 500,         // $5.00 flat booking fee (kept by platform)
  CANCELLATION_FEE_CENTS: 1500,   // $15.00 cancellation fee
  CURRENCY: 'usd',
} as const

// Derived (for reference):
// Companion payout = HOURLY_RATE_CENTS × (1 - PLATFORM_FEE_PERCENTAGE) = $28.00/hr
// Platform earns   = HOURLY_RATE_CENTS × PLATFORM_FEE_PERCENTAGE + BOOKING_FEE_CENTS
//                  = $7.00/hr + $5.00 flat fee
