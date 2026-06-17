"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { CompanionVerificationStatus } from "@/types";
import { createPaymentForBooking } from "@/lib/actions/payments";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

// ── Admin assigns approved companions to a requested booking ──
export async function assignCompanionsToBooking(
  bookingId: string,
  companionProfileIds: string[]
): Promise<ActionResult> {
  if (!companionProfileIds.length) {
    return { success: false, error: "Please select at least one companion." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!callerProfile) return { success: false, error: "Profile not found." };
  if (callerProfile.role !== "admin") {
    return { success: false, error: "Only administrators can assign companions." };
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .single();

  if (!booking) return { success: false, error: "Booking not found." };
  if (!["requested", "assigned"].includes(booking.status as string)) {
    return {
      success: false,
      error: "This booking cannot be assigned in its current state.",
    };
  }

  // Verify every selected companion is approved
  const { data: companions, error: cErr } = await admin
    .from("companion_profiles")
    .select("id, verification_status")
    .in("id", companionProfileIds);

  if (cErr || !companions || companions.length !== companionProfileIds.length) {
    return { success: false, error: "One or more companions not found." };
  }

  const unapproved = companions.filter(
    (c) => (c.verification_status as CompanionVerificationStatus) !== "approved"
  );
  if (unapproved.length > 0) {
    return {
      success: false,
      error: "Only approved companions can be assigned to a booking.",
    };
  }

  const { error: assignErr } = await admin.from("booking_assignments").upsert(
    companionProfileIds.map((cpId) => ({
      booking_id: bookingId,
      companion_profile_id: cpId,
      assigned_by_profile_id: callerProfile.id,
      status: "pending",
    })),
    { onConflict: "booking_id,companion_profile_id", ignoreDuplicates: true }
  );

  if (assignErr) {
    return { success: false, error: "Failed to create assignments." };
  }

  // Move booking to 'assigned' if it was still 'requested'
  if (booking.status === "requested") {
    const { error: bookingErr } = await admin
      .from("bookings")
      .update({ status: "assigned" })
      .eq("id", bookingId);

    if (bookingErr) {
      return { success: false, error: "Failed to update booking status." };
    }

    await admin.from("booking_status_history").insert({
      booking_id: bookingId,
      status: "assigned",
      changed_by_profile_id: callerProfile.id,
      notes: "Admin assigned companions",
    });
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");

  return { success: true };
}

// ── Companion accepts or declines an assignment ───────────────
export async function respondToAssignment(
  assignmentId: string,
  response: "accepted" | "declined",
  declineReason?: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!callerProfile) return { success: false, error: "Profile not found." };
  if (callerProfile.role !== "companion") {
    return { success: false, error: "Only companions can respond to assignments." };
  }

  const admin = createAdminClient();

  const { data: companionProfile } = await admin
    .from("companion_profiles")
    .select("id, verification_status")
    .eq("profile_id", callerProfile.id)
    .single();

  if (!companionProfile) {
    return { success: false, error: "Companion profile not found." };
  }

  // Suspended or unapproved companions cannot accept
  if (
    response === "accepted" &&
    (companionProfile.verification_status as CompanionVerificationStatus) !== "approved"
  ) {
    return {
      success: false,
      error: "Only approved companions can accept booking requests.",
    };
  }

  const { data: assignment } = await admin
    .from("booking_assignments")
    .select("id, booking_id, companion_profile_id, status")
    .eq("id", assignmentId)
    .single();

  if (!assignment) return { success: false, error: "Assignment not found." };

  if (assignment.companion_profile_id !== companionProfile.id) {
    return { success: false, error: "This assignment is not assigned to you." };
  }

  if (assignment.status !== "pending") {
    return { success: false, error: "This assignment has already been responded to." };
  }

  const now = new Date().toISOString();

  if (response === "accepted") {
    // Check booking is still waiting for acceptance
    const { data: booking } = await admin
      .from("bookings")
      .select("id, status, duration_hours")
      .eq("id", assignment.booking_id as string)
      .single();

    if (!booking || booking.status !== "assigned") {
      return { success: false, error: "This booking is no longer available." };
    }

    const { error: acceptErr } = await admin
      .from("booking_assignments")
      .update({ status: "accepted", responded_at: now })
      .eq("id", assignmentId);

    if (acceptErr) return { success: false, error: "Failed to accept assignment." };

    // Confirm the booking
    const { error: bookingErr } = await admin
      .from("bookings")
      .update({
        status: "accepted",
        companion_profile_id: companionProfile.id,
      })
      .eq("id", assignment.booking_id as string);

    if (bookingErr) {
      return { success: false, error: "Failed to confirm booking." };
    }

    await admin.from("booking_status_history").insert({
      booking_id: assignment.booking_id,
      status: "accepted",
      changed_by_profile_id: callerProfile.id,
      notes: "Companion accepted assignment",
    });

    // Authorize payment now that the booking is confirmed
    await createPaymentForBooking(
      assignment.booking_id as string,
      booking.duration_hours as number
    );
  } else {
    const { error: declineErr } = await admin
      .from("booking_assignments")
      .update({
        status: "declined",
        responded_at: now,
        decline_reason: declineReason || null,
      })
      .eq("id", assignmentId);

    if (declineErr) {
      return { success: false, error: "Failed to decline assignment." };
    }
  }

  revalidatePath("/companion/bookings");
  revalidatePath(`/companion/bookings/${assignmentId}`);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${assignment.booking_id as string}`);

  return { success: true };
}

// ── Admin updates companion verification status ───────────────
export async function updateCompanionStatus(
  companionProfileId: string,
  newStatus: CompanionVerificationStatus,
  notes?: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!callerProfile) return { success: false, error: "Profile not found." };
  if (callerProfile.role !== "admin") {
    return {
      success: false,
      error: "Only administrators can change companion verification status.",
    };
  }

  const admin = createAdminClient();

  const { data: companion } = await admin
    .from("companion_profiles")
    .select("id, verification_status")
    .eq("id", companionProfileId)
    .single();

  if (!companion) return { success: false, error: "Companion not found." };

  const { error: updateErr } = await admin
    .from("companion_profiles")
    .update({ verification_status: newStatus })
    .eq("id", companionProfileId);

  if (updateErr) {
    return { success: false, error: "Failed to update companion status." };
  }

  // Record the status change (non-fatal if it fails)
  await admin.from("companion_status_history").insert({
    companion_profile_id: companionProfileId,
    previous_status: companion.verification_status as CompanionVerificationStatus,
    new_status: newStatus,
    changed_by_profile_id: callerProfile.id,
    notes: notes || null,
  });

  revalidatePath("/admin/companions");
  revalidatePath(`/admin/companions/${companionProfileId}`);

  return { success: true };
}
