"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { paymentProvider, calculateBookingCost } from "@/lib/payments";

export type ActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!profile || profile.role !== "admin") return null;
  return profile;
}

// ── Create and authorize a payment when a booking is submitted ────
export async function createPaymentForBooking(
  bookingId: string,
  durationHours: number
): Promise<ActionResult & { paymentId?: string }> {
  const admin = createAdminClient();

  const cost = calculateBookingCost(durationHours);

  const intent = await paymentProvider.createPaymentIntent({
    bookingId,
    amountCents: cost.totalAmountCents,
    serviceAmountCents: cost.serviceAmountCents,
    bookingFeeCents: cost.bookingFeeCents,
    platformFeeCents: cost.platformFeeCents,
    companionPayoutCents: cost.companionPayoutCents,
    currency: cost.currency,
  });

  // Immediately authorize (mock: no real card hold needed)
  const authorized = await paymentProvider.authorizePayment(intent.id);
  const now = new Date().toISOString();

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      booking_id: bookingId,
      provider: "mock",
      provider_payment_id: authorized.id,
      status: "authorized",
      amount_cents: cost.totalAmountCents,
      service_amount_cents: cost.serviceAmountCents,
      booking_fee_cents: cost.bookingFeeCents,
      platform_fee_cents: cost.platformFeeCents,
      companion_payout_cents: cost.companionPayoutCents,
      currency: cost.currency,
      authorized_at: now,
    })
    .select("id")
    .single();

  if (error || !payment) {
    return { success: false, error: "Failed to create payment record." };
  }

  // Persist total_amount on the booking (in dollars for the existing column)
  await admin
    .from("bookings")
    .update({ total_amount: cost.totalAmountCents / 100 })
    .eq("id", bookingId);

  return { success: true, paymentId: payment.id as string };
}

// ── Capture payment after a visit is completed ────────────────────
export async function capturePaymentForBooking(bookingId: string): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, provider_payment_id, status")
    .eq("booking_id", bookingId)
    .single();

  if (!payment) return { success: false, error: "Payment record not found." };
  if (payment.status === "captured") return { success: true }; // idempotent
  if (!["authorized", "pending"].includes(payment.status as string)) {
    return { success: false, error: `Cannot capture payment in '${payment.status}' status.` };
  }

  await paymentProvider.capturePayment(payment.provider_payment_id as string);

  const { error } = await admin
    .from("payments")
    .update({ status: "captured", captured_at: new Date().toISOString() })
    .eq("id", payment.id);

  if (error) return { success: false, error: "Failed to capture payment." };
  return { success: true };
}

// ── Cancel payment when a booking is cancelled ───────────────────
export async function cancelPaymentForBooking(bookingId: string): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, provider_payment_id, status")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!payment) return { success: true }; // no payment record = nothing to cancel
  if (payment.status === "cancelled") return { success: true };
  if (payment.status === "captured") {
    return { success: false, error: "Captured payments cannot be cancelled; issue a refund instead." };
  }

  await paymentProvider.cancelPayment(payment.provider_payment_id as string);

  const { error } = await admin
    .from("payments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", payment.id);

  if (error) return { success: false, error: "Failed to cancel payment." };
  return { success: true };
}

// ── Issue a refund (admin only) ───────────────────────────────────
const IssueRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amountCents: z.number().int().positive().max(1_000_000),
  reason: z.string().min(5).max(500),
});

export async function issueRefund(
  raw: z.infer<typeof IssueRefundSchema>
): Promise<ActionResult> {
  const parsed = IssueRefundSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const caller = await requireAdmin();
  if (!caller) return { success: false, error: "Admin access required." };

  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, provider_payment_id, status, amount_cents")
    .eq("id", parsed.data.paymentId)
    .single();

  if (!payment) return { success: false, error: "Payment not found." };
  if (!["captured", "partially_refunded"].includes(payment.status as string)) {
    return { success: false, error: "Only captured payments can be refunded." };
  }
  if (parsed.data.amountCents > (payment.amount_cents as number)) {
    return { success: false, error: "Refund amount exceeds the original payment." };
  }

  const gatewayRefund = await paymentProvider.createRefund({
    paymentIntentId: payment.provider_payment_id as string,
    amountCents: parsed.data.amountCents,
    reason: parsed.data.reason,
  });

  const { error: refundErr } = await admin.from("payment_refunds").insert({
    payment_id: payment.id,
    provider_refund_id: gatewayRefund.id,
    amount_cents: parsed.data.amountCents,
    reason: parsed.data.reason,
    issued_by_profile_id: caller.id,
    status: gatewayRefund.status,
  });

  if (refundErr) return { success: false, error: "Failed to record refund." };

  // Determine new payment status
  const isFullRefund = parsed.data.amountCents >= (payment.amount_cents as number);
  const newStatus = isFullRefund ? "refunded" : "partially_refunded";

  await admin
    .from("payments")
    .update({ status: newStatus })
    .eq("id", payment.id);

  // Audit log
  await admin.from("audit_log").insert({
    actor_profile_id: caller.id,
    action: "issue_refund",
    entity_type: "payment",
    entity_id: payment.id,
    new_value: {
      amount_cents: parsed.data.amountCents,
      reason: parsed.data.reason,
      gateway_refund_id: gatewayRefund.id,
      new_status: newStatus,
    },
  });

  revalidatePath(`/admin/bookings/${payment.booking_id}`);
  return { success: true };
}
