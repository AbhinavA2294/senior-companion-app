import { PRICING } from './config'
import type { BookingCost } from './types'

// All functions are pure — no DB access, no side effects.
// UI components and server actions both import from here.

export function calculateBookingCost(durationHours: number): BookingCost {
  const effectiveHours = Math.max(durationHours, PRICING.MINIMUM_HOURS)
  const serviceAmountCents = effectiveHours * PRICING.HOURLY_RATE_CENTS
  const bookingFeeCents = PRICING.BOOKING_FEE_CENTS
  const totalAmountCents = serviceAmountCents + bookingFeeCents
  const platformFeeCents = calculatePlatformFee(serviceAmountCents)
  const companionPayoutCents = calculateCompanionPayout(serviceAmountCents)

  return {
    durationHours: effectiveHours,
    hourlyRateCents: PRICING.HOURLY_RATE_CENTS,
    serviceAmountCents,
    bookingFeeCents,
    totalAmountCents,
    platformFeeCents,
    companionPayoutCents,
    currency: PRICING.CURRENCY,
  }
}

export function calculatePlatformFee(serviceAmountCents: number): number {
  return Math.round(serviceAmountCents * PRICING.PLATFORM_FEE_PERCENTAGE)
}

export function calculateCompanionPayout(serviceAmountCents: number): number {
  return serviceAmountCents - calculatePlatformFee(serviceAmountCents)
}

export function calculateCancellationFee(): number {
  return PRICING.CANCELLATION_FEE_CENTS
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function centsFromDollars(dollars: number): number {
  return Math.round(dollars * 100)
}
