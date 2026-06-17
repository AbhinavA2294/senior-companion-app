"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { z } from "zod";

export type ActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

// ── Helper: get caller profile + enforce admin ────────────────
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("user_id", user.id)
    .single();
  if (!profile || profile.role !== "admin") return null;
  return profile;
}

// ── Audit log helper ─────────────────────────────────────────
async function writeAuditLog({
  actorProfileId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  notes,
}: {
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  notes?: string;
}) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    notes: notes ?? null,
  });
}

// ── Internal notes ────────────────────────────────────────────
const InternalNoteSchema = z.object({
  entityType: z.enum(["booking", "companion", "incident", "senior"]),
  entityId: z.string().uuid(),
  note: z.string().min(1).max(2000),
});

export async function addInternalNote(raw: z.infer<typeof InternalNoteSchema>): Promise<ActionResult> {
  const parsed = InternalNoteSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const caller = await requireAdmin();
  if (!caller) return { success: false, error: "Admin access required." };

  const admin = createAdminClient();
  const { error } = await admin.from("internal_notes").insert({
    author_profile_id: caller.id,
    entity_type: parsed.data.entityType,
    entity_id: parsed.data.entityId,
    note: parsed.data.note,
  });

  if (error) return { success: false, error: "Failed to save note." };

  await writeAuditLog({
    actorProfileId: caller.id,
    action: "add_internal_note",
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    notes: parsed.data.note.slice(0, 100),
  });

  revalidatePath(`/admin`);
  return { success: true };
}

// ── Mock refund ───────────────────────────────────────────────
const RefundSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive().max(10000),
  reason: z.string().min(5).max(500),
});

export async function issueMockRefund(raw: z.infer<typeof RefundSchema>): Promise<ActionResult> {
  const parsed = RefundSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const caller = await requireAdmin();
  if (!caller) return { success: false, error: "Admin access required." };

  const admin = createAdminClient();
  const { error } = await admin.from("mock_refunds").insert({
    booking_id: parsed.data.bookingId,
    issued_by_profile_id: caller.id,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    status: "issued",
  });

  if (error) return { success: false, error: "Failed to issue refund." };

  await writeAuditLog({
    actorProfileId: caller.id,
    action: "issue_mock_refund",
    entityType: "booking",
    entityId: parsed.data.bookingId,
    newValue: { amount: parsed.data.amount, reason: parsed.data.reason },
  });

  revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
  return { success: true };
}

// ── Mark booking needs_review ─────────────────────────────────
export async function markBookingNeedsReview(
  bookingId: string,
  reason: string
): Promise<ActionResult> {
  const caller = await requireAdmin();
  if (!caller) return { success: false, error: "Admin access required." };

  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id, status").eq("id", bookingId).single();
  if (!booking) return { success: false, error: "Booking not found." };

  const { error } = await admin.from("bookings").update({
    status: "needs_review",
    needs_review_reason: reason,
  }).eq("id", bookingId);

  if (error) return { success: false, error: "Failed to update booking." };

  await admin.from("booking_status_history").insert({
    booking_id: bookingId,
    status: "needs_review",
    changed_by_profile_id: caller.id,
    notes: reason,
  });

  await writeAuditLog({
    actorProfileId: caller.id,
    action: "mark_needs_review",
    entityType: "booking",
    entityId: bookingId,
    oldValue: { status: booking.status },
    newValue: { status: "needs_review", reason },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

// ── Export pilot metrics as CSV ───────────────────────────────
export async function exportPilotMetricsCSV(): Promise<ActionResult & { csv?: string }> {
  const caller = await requireAdmin();
  if (!caller) return { success: false, error: "Admin access required." };

  const admin = createAdminClient();

  const { data: bookings } = await admin
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      checked_in_at, checked_out_at, late_checkin_flag, late_checkout_flag,
      visit_note,
      activity_type:activity_types(name),
      senior:profiles!bookings_senior_profile_id_fkey(first_name, last_name),
      companion_profile:companion_profiles(profile:profiles(first_name, last_name))
    `)
    .order("scheduled_date", { ascending: false });

  if (!bookings) return { success: false, error: "Failed to fetch bookings." };

  await writeAuditLog({
    actorProfileId: caller.id,
    action: "export_csv",
    entityType: "pilot_metrics",
    notes: `Exported ${bookings.length} bookings`,
  });

  // Build CSV
  const headers = [
    "booking_id", "status", "scheduled_date", "scheduled_start_time",
    "duration_hours", "activity_type", "senior_name", "companion_name",
    "checked_in_at", "checked_out_at", "late_checkin", "late_checkout", "visit_note"
  ];

  const rows = bookings.map((b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const at = (b.activity_type as any)?.name ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (b.senior as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (b.companion_profile as any)?.profile;
    const seniorName = s ? `${s.first_name} ${s.last_name}` : "";
    const companionName = c ? `${c.first_name} ${c.last_name}` : "";
    const note = (b.visit_note as string ?? "").replace(/"/g, '""');

    return [
      b.id,
      b.status,
      b.scheduled_date,
      b.scheduled_start_time,
      b.duration_hours,
      at,
      seniorName,
      companionName,
      b.checked_in_at ?? "",
      b.checked_out_at ?? "",
      b.late_checkin_flag ? "yes" : "no",
      b.late_checkout_flag ? "yes" : "no",
      `"${note}"`,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  return { success: true, data: csv, csv };
}

// ── Get dashboard metrics ─────────────────────────────────────
export async function getDashboardMetrics() {
  const caller = await requireAdmin();
  if (!caller) return null;

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    { count: requestedCount },
    { count: todayCount },
    { count: activeCount },
    { count: lateCheckinCount },
    { count: lateCheckoutCount },
    { count: pendingCompanionsCount },
    { count: openIncidentsCount },
    { count: completedWeekCount },
    { data: ratings },
  ] = await Promise.all([
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "requested"),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("scheduled_date", today).not("status", "in", '("cancelled","declined")'),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("late_checkin_flag", true).eq("status", "completed"),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("late_checkout_flag", true).eq("status", "completed"),
    admin.from("companion_profiles").select("id", { count: "exact", head: true }).in("verification_status", ["pending", "under_review"]),
    admin.from("incident_reports").select("id", { count: "exact", head: true }).eq("is_resolved", false),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed").gte("scheduled_date", weekAgo),
    admin.from("ratings").select("rating"),
  ]);

  const avgRating = ratings && ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + (r.rating as number), 0) / ratings.length).toFixed(1)
    : "—";

  // Repeat bookings: seniors with more than 1 completed booking
  const { data: repeatData } = await admin
    .from("bookings")
    .select("senior_profile_id")
    .eq("status", "completed");

  const seniorCounts: Record<string, number> = {};
  (repeatData ?? []).forEach((b) => {
    const sid = b.senior_profile_id as string;
    seniorCounts[sid] = (seniorCounts[sid] ?? 0) + 1;
  });
  const repeatBookings = Object.values(seniorCounts).filter((c) => c > 1).length;

  return {
    requestedBookings: requestedCount ?? 0,
    bookingsToday: todayCount ?? 0,
    activeVisits: activeCount ?? 0,
    lateCheckIns: lateCheckinCount ?? 0,
    lateCheckOuts: lateCheckoutCount ?? 0,
    pendingCompanions: pendingCompanionsCount ?? 0,
    openIncidents: openIncidentsCount ?? 0,
    completedThisWeek: completedWeekCount ?? 0,
    repeatBookings,
    averageRating: avgRating,
  };
}
