"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

const SettingsRowSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z_]+$/, "Invalid key format."),
  value: z.string().max(500),
});

const BulkSettingsSchema = z.array(SettingsRowSchema).min(1).max(50);

/**
 * Save an array of pilot_settings key/value pairs.
 * Caller must be an admin.
 */
export async function savePilotSettings(
  rows: Array<{ key: string; value: string }>
): Promise<SettingsActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "Admins only." };
  }

  const parsed = BulkSettingsSchema.safeParse(rows);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();
  for (const row of parsed.data) {
    const { error } = await admin
      .from("pilot_settings")
      .update({ value: row.value, updated_at: new Date().toISOString(), updated_by: profile.id as string })
      .eq("key", row.key);

    if (error) {
      return { success: false, error: `Failed to save setting "${row.key}".` };
    }
  }

  revalidatePath("/admin/pilot");
  return { success: true };
}

/**
 * Read all pilot_settings rows for the admin UI.
 */
export async function getAllPilotSettings() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pilot_settings")
    .select("key, value, label, description, value_type, updated_at")
    .order("key");

  if (error) return [];
  return data as Array<{
    key: string;
    value: string;
    label: string;
    description: string | null;
    value_type: string;
    updated_at: string;
  }>;
}

/**
 * Read pilot metrics from the pilot_metrics view plus extra queries.
 */
export async function getPilotMetrics() {
  const admin = createAdminClient();

  const [metricsRes, ratingsRes, feedbackRes, incidentsRes, acceptanceRes] = await Promise.all([
    admin.from("pilot_metrics").select("*").single(),
    admin.from("ratings").select("rating"),
    admin.from("booking_feedback").select("overall_rating, would_rebook, felt_safe"),
    admin.from("incident_reports").select("status"),
    admin.from("bookings").select("status").in("status", ["accepted", "declined", "assigned"]),
  ]);

  const metrics = metricsRes.data as Record<string, number> | null;

  // Average rating
  const ratingRows = (ratingsRes.data ?? []) as Array<{ rating: number }>;
  const avgRating =
    ratingRows.length > 0
      ? ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length
      : null;

  // Feedback KPIs
  const fbRows = (feedbackRes.data ?? []) as Array<{
    overall_rating: number | null;
    would_rebook: boolean | null;
    felt_safe: boolean | null;
  }>;
  const avgFeedbackRating =
    fbRows.length > 0
      ? fbRows.filter((r) => r.overall_rating != null).reduce((s, r) => s + (r.overall_rating ?? 0), 0) /
        Math.max(1, fbRows.filter((r) => r.overall_rating != null).length)
      : null;
  const wouldRebookPct =
    fbRows.length > 0
      ? Math.round((fbRows.filter((r) => r.would_rebook === true).length / fbRows.length) * 100)
      : null;
  const feltSafePct =
    fbRows.length > 0
      ? Math.round((fbRows.filter((r) => r.felt_safe === true).length / fbRows.length) * 100)
      : null;

  // Incidents
  const incRows = (incidentsRes.data ?? []) as Array<{ status: string }>;
  const openIncidents = incRows.filter((r) => r.status === "open").length;
  const resolvedIncidents = incRows.filter((r) => r.status === "resolved").length;

  // Companion acceptance rate
  const acceptanceRows = (acceptanceRes.data ?? []) as Array<{ status: string }>;
  const accepted = acceptanceRows.filter((r) => r.status === "accepted").length;
  const decidedOnAssignment = acceptanceRows.filter((r) =>
    ["accepted", "declined"].includes(r.status)
  ).length;
  const acceptanceRate =
    decidedOnAssignment > 0
      ? Math.round((accepted / decidedOnAssignment) * 100)
      : null;

  return {
    completedBookings:   metrics?.completed_bookings   ?? 0,
    cancelledBookings:   metrics?.cancelled_bookings   ?? 0,
    pendingBookings:     metrics?.pending_bookings      ?? 0,
    activeBookings:      metrics?.active_bookings       ?? 0,
    lateCheckins:        metrics?.late_checkins         ?? 0,
    lateCheckouts:       metrics?.late_checkouts        ?? 0,
    firstBookings:       metrics?.first_bookings        ?? 0,
    uniqueSeniors:       metrics?.unique_seniors        ?? 0,
    uniqueCompanions:    metrics?.unique_companions      ?? 0,
    totalBookings:       metrics?.total_bookings        ?? 0,
    avgRating:           avgRating != null ? avgRating.toFixed(1) : "—",
    avgFeedbackRating:   avgFeedbackRating != null ? avgFeedbackRating.toFixed(1) : "—",
    wouldRebookPct:      wouldRebookPct != null ? `${wouldRebookPct}%` : "—",
    feltSafePct:         feltSafePct != null ? `${feltSafePct}%` : "—",
    openIncidents,
    resolvedIncidents,
    companionAcceptanceRate: acceptanceRate != null ? `${acceptanceRate}%` : "—",
    feedbackCount:       fbRows.length,
  };
}
