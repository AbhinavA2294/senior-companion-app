"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BookingSchema, type BookingFormData } from "@/lib/validations/booking";
import { cancelPaymentForBooking } from "@/lib/actions/payments";

export type ActionResult =
  | { success: true; bookingId?: string }
  | { success: false; error: string };

// ── Create a new booking request ─────────────────────────────
export async function createBooking(raw: BookingFormData): Promise<ActionResult> {
  const parsed = BookingSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first.message };
  }
  const data = parsed.data;

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

  if (!["senior", "family"].includes(callerProfile.role)) {
    return { success: false, error: "Only seniors or family members may create bookings." };
  }

  // Server-side authorization: verify caller can book for this senior
  if (callerProfile.role === "family") {
    const { data: rel } = await supabase
      .from("family_senior_relationships")
      .select("can_book")
      .eq("family_profile_id", callerProfile.id)
      .eq("senior_profile_id", data.senior_profile_id)
      .single();

    const { data: managed } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.senior_profile_id)
      .eq("managed_by_profile_id", callerProfile.id)
      .single();

    if (!rel?.can_book && !managed) {
      return { success: false, error: "You are not authorized to book for this senior." };
    }
  } else if (callerProfile.role === "senior") {
    if (callerProfile.id !== data.senior_profile_id) {
      return { success: false, error: "Seniors can only create bookings for themselves." };
    }
  }

  const { data: booking, error: insertErr } = await supabase
    .from("bookings")
    .insert({
      senior_profile_id: data.senior_profile_id,
      booked_by_profile_id: callerProfile.id,
      activity_type_id: data.activity_type_id,
      status: "requested",
      scheduled_date: data.scheduled_date,
      scheduled_start_time: data.scheduled_start_time,
      duration_hours: data.duration_hours,
      location_description: data.location_description,
      destination_address: data.destination_address || null,
      transportation_mode: data.transportation_mode ?? null,
      special_notes: data.special_notes || null,
      disclaimer_acknowledged: data.disclaimer_acknowledged,
    })
    .select("id")
    .single();

  if (insertErr || !booking) {
    return { success: false, error: "Failed to submit booking request. Please try again." };
  }

  const role = callerProfile.role as string;
  revalidatePath(`/${role}/bookings`);
  revalidatePath(`/${role}`);

  return { success: true, bookingId: booking.id as string };
}

// ── Cancel a booking ──────────────────────────────────────────
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
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

  // Verify the booking exists, belongs to caller, and is in a cancellable state
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, booked_by_profile_id, scheduled_date, scheduled_start_time")
    .eq("id", bookingId)
    .single();

  if (!booking) return { success: false, error: "Booking not found." };

  if (booking.booked_by_profile_id !== callerProfile.id && callerProfile.role !== "admin") {
    return { success: false, error: "You can only cancel bookings you created." };
  }

  const cancellableStatuses = ["draft", "requested", "assigned"];
  if (!cancellableStatuses.includes(booking.status as string)) {
    return {
      success: false,
      error: "This booking cannot be cancelled in its current state.",
    };
  }

  // Ensure booking hasn't started yet
  const bookingStart = new Date(
    `${booking.scheduled_date}T${booking.scheduled_start_time}:00`
  );
  if (bookingStart <= new Date()) {
    return { success: false, error: "Bookings cannot be cancelled after they have begun." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { success: false, error: "Failed to cancel booking. Please try again." };

  // Cancel associated payment if one exists
  await cancelPaymentForBooking(bookingId);

  const role = callerProfile.role as string;
  revalidatePath(`/${role}/bookings`);
  revalidatePath(`/${role}/bookings/${bookingId}`);

  return { success: true };
}
