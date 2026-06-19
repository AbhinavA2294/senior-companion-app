"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { capturePaymentForBooking } from "@/lib/actions/payments";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

const CHECKIN_WINDOW_MINUTES = 60;
const NOTE_MAX = 1000;

const VisitNoteSchema = z.object({
  note: z.string().max(NOTE_MAX, `Visit note must be ${NOTE_MAX} characters or fewer.`).refine((v) => v.trim().length > 0, { message: "Visit note cannot be empty." }),
});

const IncidentReportSchema = z.object({
  bookingId: z.string().uuid(),
  category: z.enum(["senior_did_not_answer", "companion_delayed", "senior_felt_unwell", "transportation_issue", "safety_concern", "inappropriate_behavior", "lost_property", "other"]),
  description: z.string().min(10, "Please provide at least 10 characters of description.").max(2000, "Description must be 2,000 characters or fewer."),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
});

export type IncidentFormData = z.infer<typeof IncidentReportSchema>;

const RatingSchema = z.object({
  bookingId: z.string().uuid(),
  ratedProfileId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().or(z.literal("")),
});

export type RatingFormData = z.infer<typeof RatingSchema>;

async function getCallerProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, role, first_name, last_name").eq("user_id", user.id).single();
  return profile ?? null;
}

export async function checkInToBooking(bookingId: string, coords?: { latitude: number; longitude: number } | null): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller) return { success: false, error: "Not authenticated." };
  if (caller.role !== "companion") return { success: false, error: "Only companions can check in." };

  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id, status, scheduled_date, scheduled_start_time, companion_profile_id, checked_in_at, booked_by_profile_id").eq("id", bookingId).single();
  if (!booking) return { success: false, error: "Booking not found." };

  const { data: cp } = await admin.from("companion_profiles").select("id, verification_status").eq("profile_id", caller.id).single();
  if (!cp) return { success: false, error: "Companion profile not found." };
  if (cp.verification_status === "suspended") return { success: false, error: "Suspended companions cannot check in." };
  if (booking.companion_profile_id !== cp.id) return { success: false, error: "You are not the assigned companion for this booking." };
  if (booking.status !== "accepted") return { success: false, error: "You can only check in for an accepted booking." };
  if (booking.checked_in_at) return { success: false, error: "You have already checked in for this booking." };

  const [year, month, day] = (booking.scheduled_date as string).split("-").map(Number);
  const [hours, minutes] = (booking.scheduled_start_time as string).split(":").map(Number);
  const scheduledStart = new Date(year, month - 1, day, hours, minutes, 0);
  const now = new Date();
  const windowOpenAt = new Date(scheduledStart.getTime() - CHECKIN_WINDOW_MINUTES * 60 * 1000);

  if (now < windowOpenAt && process.env.SKIP_CHECKIN_WINDOW !== "true") {
    const minutesUntilOpen = Math.ceil((windowOpenAt.getTime() - now.getTime()) / 60000);
    return { success: false, error: `Check-in opens ${CHECKIN_WINDOW_MINUTES} minutes before the visit (in ${minutesUntilOpen} minutes).` };
  }

  const lateThreshold = new Date(scheduledStart.getTime() + 10 * 60 * 1000);
  const isLate = now > lateThreshold;
  const nowIso = now.toISOString();

  await admin.from("check_in_events").insert({ booking_id: bookingId, event_type: "check_in", latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null, notes: isLate ? "Late check-in flagged" : null });

  const { error: updateErr } = await admin.from("bookings").update({ status: "in_progress", checked_in_at: nowIso, late_checkin_flag: isLate }).eq("id", bookingId);
  if (updateErr) return { success: false, error: "Failed to record check-in. Please try again." };

  await admin.from("booking_status_history").insert({ booking_id: bookingId, status: "in_progress", changed_by_profile_id: caller.id, notes: isLate ? "Companion checked in (late)" : "Companion checked in" });

  if (booking.booked_by_profile_id) {
    await admin.from("notifications").insert({ profile_id: booking.booked_by_profile_id, title: "Companion has checked in", body: `${caller.first_name} ${caller.last_name} has checked in and the visit has started.${isLate ? " Note: check-in was recorded as late." : ""}`, channel: "in_app", status: "sent", related_booking_id: bookingId, notification_type: "check_in" });
  }

  revalidatePath(`/companion/bookings/${bookingId}`);
  revalidatePath("/companion/bookings");
  revalidatePath(`/family/bookings/${bookingId}`);
  return { success: true };
}

export async function checkOutFromBooking(bookingId: string, visitNote: string, coords?: { latitude: number; longitude: number } | null): Promise<ActionResult> {
  const parsed = VisitNoteSchema.safeParse({ note: visitNote });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const caller = await getCallerProfile();
  if (!caller) return { success: false, error: "Not authenticated." };
  if (caller.role !== "companion") return { success: false, error: "Only companions can check out." };

  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id, status, scheduled_date, scheduled_start_time, duration_hours, companion_profile_id, checked_in_at, booked_by_profile_id").eq("id", bookingId).single();
  if (!booking) return { success: false, error: "Booking not found." };

  const { data: cp } = await admin.from("companion_profiles").select("id").eq("profile_id", caller.id).single();
  if (!cp) return { success: false, error: "Companion profile not found." };
  if (booking.companion_profile_id !== cp.id) return { success: false, error: "You are not the assigned companion for this booking." };
  if (booking.status !== "in_progress") return { success: false, error: "You must check in before checking out." };
  if (!booking.checked_in_at) return { success: false, error: "No check-in record found. Please check in first." };

  const now = new Date();
  const nowIso = now.toISOString();
  const [year, month, day] = (booking.scheduled_date as string).split("-").map(Number);
  const [hours, minutes] = (booking.scheduled_start_time as string).split(":").map(Number);
  const expectedEnd = new Date(year, month - 1, day, hours, minutes, 0);
  expectedEnd.setTime(expectedEnd.getTime() + (booking.duration_hours as number) * 60 * 60 * 1000);
  const isLateCheckout = now > new Date(expectedEnd.getTime() + 10 * 60 * 1000);

  await admin.from("check_in_events").insert({ booking_id: bookingId, event_type: "check_out", latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null, notes: visitNote });

  const { error: updateErr } = await admin.from("bookings").update({ status: "completed", checked_out_at: nowIso, visit_note: visitNote, visit_note_updated_at: nowIso, late_checkout_flag: isLateCheckout }).eq("id", bookingId);
  if (updateErr) return { success: false, error: "Failed to record check-out. Please try again." };

  await admin.from("booking_status_history").insert({ booking_id: bookingId, status: "completed", changed_by_profile_id: caller.id, notes: isLateCheckout ? "Companion checked out (late)" : "Companion checked out" });

  if (booking.booked_by_profile_id) {
    const checkedInAt = new Date(booking.checked_in_at as string);
    const durationMins = Math.round((now.getTime() - checkedInAt.getTime()) / 60000);
    const durationText = durationMins >= 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : `${durationMins} minutes`;
    await admin.from("notifications").insert({ profile_id: booking.booked_by_profile_id, title: "Visit complete — please rate your companion", body: `${caller.first_name} ${caller.last_name} has completed the visit (${durationText}). Tap to view the summary and leave a rating.`, channel: "in_app", status: "sent", related_booking_id: bookingId, notification_type: "completion_summary" });
  }

  // Capture the payment now that the visit is complete
  await capturePaymentForBooking(bookingId);

  revalidatePath(`/companion/bookings/${bookingId}`);
  revalidatePath("/companion/bookings");
  revalidatePath("/companion");
  revalidatePath("/companion/earnings");
  revalidatePath(`/family/bookings/${bookingId}`);
  revalidatePath("/family/bookings");
  return { success: true };
}

export async function submitIncidentReport(raw: IncidentFormData): Promise<ActionResult> {
  const parsed = IncidentReportSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const caller = await getCallerProfile();
  if (!caller) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id, booked_by_profile_id, senior_profile_id, companion_profile_id").eq("id", data.bookingId).single();
  if (!booking) return { success: false, error: "Booking not found." };

  // Verify the caller was actually a participant in this booking.
  const { data: callerCp } = await admin.from("companion_profiles").select("id").eq("profile_id", caller.id).single();
  const isParticipant =
    booking.senior_profile_id === caller.id ||
    booking.booked_by_profile_id === caller.id ||
    (callerCp && booking.companion_profile_id === callerCp.id);
  if (!isParticipant) {
    return { success: false, error: "You were not a participant in this booking." };
  }

  const { error: insertErr } = await admin.from("incident_reports").insert({ booking_id: data.bookingId, reported_by_profile_id: caller.id, reported_by_role: caller.role, category: data.category, description: data.description, severity: data.severity });
  if (insertErr) return { success: false, error: "Failed to submit incident report. Please try again." };

  const { data: adminProfiles } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
  if (adminProfiles) {
    for (const ap of adminProfiles) {
      await admin.from("notifications").insert({ profile_id: ap.id, title: "New incident report submitted", body: `${caller.first_name} ${caller.last_name} submitted a ${data.severity}-severity incident report.`, channel: "in_app", status: "sent", related_booking_id: data.bookingId, notification_type: "incident_report" });
    }
  }

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function resolveIncidentReport(incidentId: string, adminNotes: string): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller) return { success: false, error: "Not authenticated." };
  if (caller.role !== "admin") return { success: false, error: "Only administrators can resolve incident reports." };

  const admin = createAdminClient();
  const { error } = await admin.from("incident_reports").update({ is_resolved: true, admin_notes: adminNotes || null, resolved_at: new Date().toISOString() }).eq("id", incidentId);
  if (error) return { success: false, error: "Failed to resolve incident. Please try again." };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function submitRating(raw: RatingFormData): Promise<ActionResult> {
  const parsed = RatingSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const caller = await getCallerProfile();
  if (!caller) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id, status, senior_profile_id, booked_by_profile_id, companion_profile_id").eq("id", data.bookingId).single();
  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "completed") return { success: false, error: "Ratings can only be submitted for completed visits." };

  // Verify the caller was a participant in this booking.
  const { data: callerCp } = await admin.from("companion_profiles").select("id").eq("profile_id", caller.id).single();
  const isParticipant =
    booking.senior_profile_id === caller.id ||
    booking.booked_by_profile_id === caller.id ||
    (callerCp && booking.companion_profile_id === callerCp.id);
  if (!isParticipant) {
    return { success: false, error: "You were not a participant in this booking." };
  }

  const { error } = await admin.from("ratings").insert({ booking_id: data.bookingId, rated_by_profile_id: caller.id, rated_profile_id: data.ratedProfileId, rating: data.rating, comment: data.comment || null });
  if (error) {
    if (error.code === "23505") return { success: false, error: "You have already submitted a rating for this visit." };
    return { success: false, error: "Failed to submit rating. Please try again." };
  }

  revalidatePath(`/family/bookings/${data.bookingId}`);
  return { success: true };
}