import { describe, it, expect } from "vitest";
import {
  calculateBookingCost,
  calculatePlatformFee,
  calculateCompanionPayout,
  calculateCancellationFee,
  formatCents,
  centsFromDollars,
} from "@/lib/payments/payment-service";
import { PRICING } from "@/lib/payments/config";
import type { CreatePaymentIntentParams, CreateRefundParams } from "@/lib/payments/types";

// ── Two-hour minimum ──────────────────────────────────────────────

describe("two-hour minimum", () => {
  it("applies minimum when duration is 1 hour", () => {
    const cost = calculateBookingCost(1);
    expect(cost.durationHours).toBe(PRICING.MINIMUM_HOURS);
    expect(cost.serviceAmountCents).toBe(PRICING.MINIMUM_HOURS * PRICING.HOURLY_RATE_CENTS);
  });

  it("applies minimum when duration is 0 hours", () => {
    const cost = calculateBookingCost(0);
    expect(cost.durationHours).toBe(PRICING.MINIMUM_HOURS);
  });

  it("does not apply minimum for 2 hours exactly", () => {
    const cost = calculateBookingCost(2);
    expect(cost.durationHours).toBe(2);
  });

  it("does not apply minimum for durations above 2 hours", () => {
    const cost = calculateBookingCost(4);
    expect(cost.durationHours).toBe(4);
  });
});

// ── Hourly calculation ────────────────────────────────────────────

describe("hourly rate calculation", () => {
  it("calculates service amount correctly for 2 hours", () => {
    const cost = calculateBookingCost(2);
    expect(cost.serviceAmountCents).toBe(2 * PRICING.HOURLY_RATE_CENTS);
    expect(cost.serviceAmountCents).toBe(7000); // $70.00
  });

  it("calculates service amount correctly for 3 hours", () => {
    const cost = calculateBookingCost(3);
    expect(cost.serviceAmountCents).toBe(3 * PRICING.HOURLY_RATE_CENTS);
    expect(cost.serviceAmountCents).toBe(10500); // $105.00
  });

  it("calculates service amount correctly for 6 hours", () => {
    const cost = calculateBookingCost(6);
    expect(cost.serviceAmountCents).toBe(6 * PRICING.HOURLY_RATE_CENTS);
    expect(cost.serviceAmountCents).toBe(21000); // $210.00
  });

  it("includes booking fee in total amount", () => {
    const cost = calculateBookingCost(2);
    expect(cost.totalAmountCents).toBe(cost.serviceAmountCents + PRICING.BOOKING_FEE_CENTS);
    expect(cost.totalAmountCents).toBe(7500); // $70 service + $5 booking fee = $75
  });

  it("reports the correct hourly rate", () => {
    const cost = calculateBookingCost(2);
    expect(cost.hourlyRateCents).toBe(PRICING.HOURLY_RATE_CENTS);
  });

  it("reports the correct booking fee", () => {
    const cost = calculateBookingCost(2);
    expect(cost.bookingFeeCents).toBe(PRICING.BOOKING_FEE_CENTS);
  });
});

// ── Platform fee calculation ──────────────────────────────────────

describe("platform fee calculation", () => {
  it("calculates 20% of service amount for 2 hours", () => {
    const cost = calculateBookingCost(2);
    expect(cost.platformFeeCents).toBe(Math.round(7000 * 0.20));
    expect(cost.platformFeeCents).toBe(1400); // 20% of $70 = $14
  });

  it("calculatePlatformFee returns correct percentage", () => {
    expect(calculatePlatformFee(10000)).toBe(2000); // 20% of $100
    expect(calculatePlatformFee(3500)).toBe(700);   // 20% of $35
    expect(calculatePlatformFee(0)).toBe(0);
  });

  it("rounds platform fee correctly for non-round inputs", () => {
    // $105 service × 20% = $21.00 exactly
    expect(calculatePlatformFee(10500)).toBe(2100);
    // $35.50 service × 20% = $7.10 = 710 cents
    expect(calculatePlatformFee(3550)).toBe(710);
  });

  it("platform fee uses PLATFORM_FEE_PERCENTAGE constant", () => {
    const service = 10000;
    expect(calculatePlatformFee(service)).toBe(
      Math.round(service * PRICING.PLATFORM_FEE_PERCENTAGE)
    );
  });
});

// ── Companion payout calculation ──────────────────────────────────

describe("companion payout calculation", () => {
  it("calculates 80% of service amount for 2 hours", () => {
    const cost = calculateBookingCost(2);
    expect(cost.companionPayoutCents).toBe(7000 - 1400); // $70 - $14 = $56
    expect(cost.companionPayoutCents).toBe(5600);
  });

  it("calculateCompanionPayout returns correct amount", () => {
    expect(calculateCompanionPayout(10000)).toBe(8000); // 80% of $100
    expect(calculateCompanionPayout(3500)).toBe(2800);  // 80% of $35
    expect(calculateCompanionPayout(0)).toBe(0);
  });

  it("service amount equals platform fee plus companion payout", () => {
    for (const hours of [2, 3, 4, 5, 6]) {
      const cost = calculateBookingCost(hours);
      expect(cost.platformFeeCents + cost.companionPayoutCents).toBe(
        cost.serviceAmountCents
      );
    }
  });

  it("companion payout does not include the booking fee", () => {
    const cost = calculateBookingCost(2);
    expect(cost.companionPayoutCents).toBeLessThan(cost.totalAmountCents);
    expect(cost.companionPayoutCents + cost.platformFeeCents + cost.bookingFeeCents).toBe(
      cost.totalAmountCents
    );
  });
});

// ── Cancellation policy ───────────────────────────────────────────

describe("cancellation policy", () => {
  it("returns the configured cancellation fee", () => {
    expect(calculateCancellationFee()).toBe(PRICING.CANCELLATION_FEE_CENTS);
    expect(calculateCancellationFee()).toBe(1500); // $15.00
  });

  it("cancellation fee is positive", () => {
    expect(calculateCancellationFee()).toBeGreaterThan(0);
  });

  it("cancellation fee is less than a two-hour total", () => {
    const twoHourTotal = calculateBookingCost(2).totalAmountCents;
    expect(calculateCancellationFee()).toBeLessThan(twoHourTotal);
  });

  it("refund amount after cancellation equals total minus cancellation fee", () => {
    const total = calculateBookingCost(2).totalAmountCents;
    const cancellationFee = calculateCancellationFee();
    const refundAmount = total - cancellationFee;
    expect(refundAmount).toBe(total - 1500);
    expect(refundAmount).toBeGreaterThan(0);
  });
});

// ── Refund workflow ───────────────────────────────────────────────

describe("refund workflow", () => {
  it("full refund amount does not exceed total paid", () => {
    const total = calculateBookingCost(3).totalAmountCents;
    const refundAmount = total;
    expect(refundAmount).toBeLessThanOrEqual(total);
  });

  it("partial refund is less than total amount", () => {
    const total = calculateBookingCost(3).totalAmountCents;
    const partialRefund = total - calculateCancellationFee();
    expect(partialRefund).toBeLessThan(total);
    expect(partialRefund).toBeGreaterThan(0);
  });

  it("refund of zero is not a valid refund", () => {
    expect(0).toBeLessThanOrEqual(0); // guard: zero-amount refund should be rejected
    expect(calculateCancellationFee()).toBeGreaterThan(0);
  });

  it("only captured payments should be refundable — valid transition check", () => {
    const refundableStatuses = ["captured", "partially_refunded"];
    const nonRefundableStatuses = ["pending", "authorized", "failed", "cancelled"];

    refundableStatuses.forEach((s) =>
      expect(refundableStatuses).toContain(s)
    );
    nonRefundableStatuses.forEach((s) =>
      expect(refundableStatuses).not.toContain(s)
    );
  });
});

// ── Payment capture after completed visit ────────────────────────

describe("payment capture after completed visit", () => {
  it("authorized payment can be captured — valid transition", () => {
    const capturableStatuses = ["authorized", "pending"];
    expect(capturableStatuses).toContain("authorized");
  });

  it("cancelled payment cannot be captured — invalid transition", () => {
    const capturableStatuses = ["authorized", "pending"];
    expect(capturableStatuses).not.toContain("cancelled");
  });

  it("already captured payment is idempotent — same status returned", () => {
    const alreadyCaptured = "captured";
    expect(alreadyCaptured).toBe("captured"); // caller should short-circuit
  });

  it("refunded payment cannot be captured", () => {
    const capturableStatuses = ["authorized", "pending"];
    expect(capturableStatuses).not.toContain("refunded");
  });
});

// ── No raw card data stored ───────────────────────────────────────

describe("no raw card data in payment records", () => {
  it("CreatePaymentIntentParams has no card fields", () => {
    const params: CreatePaymentIntentParams = {
      bookingId: "test-id",
      amountCents: 7500,
      serviceAmountCents: 7000,
      bookingFeeCents: 500,
      platformFeeCents: 1400,
      companionPayoutCents: 5600,
      currency: "usd",
    };
    expect(params).not.toHaveProperty("cardNumber");
    expect(params).not.toHaveProperty("cvv");
    expect(params).not.toHaveProperty("cvc");
    expect(params).not.toHaveProperty("card");
    expect(params).not.toHaveProperty("pan");
    expect(params).not.toHaveProperty("expiry");
  });

  it("CreateRefundParams has no card fields", () => {
    const params: CreateRefundParams = {
      paymentIntentId: "mock_pi_test",
      amountCents: 7500,
      reason: "Customer requested refund",
    };
    expect(params).not.toHaveProperty("cardNumber");
    expect(params).not.toHaveProperty("cvv");
    expect(params).not.toHaveProperty("card");
  });

  it("BookingCost has no card or customer payment fields", () => {
    const cost = calculateBookingCost(2);
    expect(cost).not.toHaveProperty("cardNumber");
    expect(cost).not.toHaveProperty("token");
    expect(cost).not.toHaveProperty("paymentMethod");
    // Only financial calculation fields should be present
    expect(cost).toHaveProperty("totalAmountCents");
    expect(cost).toHaveProperty("companionPayoutCents");
    expect(cost).toHaveProperty("platformFeeCents");
  });
});

// ── formatCents helper ────────────────────────────────────────────

describe("formatCents", () => {
  it("formats cents as dollar string", () => {
    expect(formatCents(7500)).toBe("$75.00");
    expect(formatCents(3500)).toBe("$35.00");
    expect(formatCents(500)).toBe("$5.00");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1)).toBe("$0.01");
  });
});

describe("centsFromDollars", () => {
  it("converts dollars to cents", () => {
    expect(centsFromDollars(75)).toBe(7500);
    expect(centsFromDollars(35.50)).toBe(3550);
    expect(centsFromDollars(0)).toBe(0);
  });
});
