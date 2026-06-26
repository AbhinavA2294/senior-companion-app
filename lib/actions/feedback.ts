"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type FeedbackResult =
  | { success: true }
  | { success: false; error: string };

const FeedbackSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID."),
  overall_rating: z.number().int().min(1).max(5),
  companion_punctual: z.boolean(),
  felt_safe: z.boolean(),
  would_rebook: z.boolean(),
  feedback_text: z.string().max(1000).optional().or(z.literal("")),
});

export async function submitBookingFeedback(
  raw: z.infer<typeof FeedbackSchema>
): Promise<FeedbackResult> {
  const parsed = FeedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found." };
  if (!["senior", "family"].includes(profile.role as string)) {
    return { success: false, error: "Only seniors and family members may submit feedback." };
  }

  // Verify the booking is completed and the caller is a participant
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, senior_profile_id, booked_by_profile_id")
    .eq("id", data.booking_id)
    .single();

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "completed") {
    return { success: false, error: "Feedback can only be submitted for completed bookings." };
  }

  const isParticipant =
    booking.senior_profile_id === profile.id ||
    booking.booked_by_profile_id === profile.id;

  if (!isParticipant) {
    return { success: false, error: "You are not a participant in this booking." };
  }

  // Check for duplicate
  const { data: existing } = await admin
    .from("booking_feedback")
    .select("id")
    .eq("booking_id", data.booking_id)
    .eq("submitted_by_profile_id", profile.id)
    .single();

  if (existing) {
    return { success: false, error: "You have already submitted feedback for this booking." };
  }

  const { error: insertErr } = await admin.from("booking_feedback").insert({
    booking_id:               data.booking_id,
    submitted_by_profile_id:  profile.id as string,
    submitted_by_role:        profile.role as string,
    overall_rating:           data.overall_rating,
    companion_punctual:       data.companion_punctual,
    felt_safe:                data.felt_safe,
    would_rebook:             data.would_rebook,
    feedback_text:            data.feedback_text || null,
  });

  if (insertErr) {
    return { success: false, error: "Failed to submit feedback. Please try again." };
  }

  revalidatePath(`/${profile.role}/bookings/${data.booking_id}`);
  return { success: true };
}

/**
 * Check whether a profile has already submitted feedback for a booking.
 */
export async function hasFeedbackBeenSubmitted(
  bookingId: string,
  profileId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_feedback")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("submitted_by_profile_id", profileId)
    .single();
  return data != null;
}
