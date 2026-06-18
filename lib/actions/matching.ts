"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { runMatching, MATCHING_CONFIG } from "@/lib/matching";
import type { CompanionInput, BookingInput, SeniorInput, MatchResult } from "@/lib/matching/types";

export type MatchingActionResult =
  | { success: true; result: MatchResult }
  | { success: false; error: string };

// ── Run companion matching for a booking ─────────────────────────────────────
export async function runMatchingForBooking(
  bookingId: string,
): Promise<MatchingActionResult> {
  if (!MATCHING_CONFIG.enabled) {
    return { success: false, error: "Companion matching is currently disabled." };
  }

  // Auth: admin only
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "admin") {
    return { success: false, error: "Only administrators can run companion matching." };
  }

  const admin = createAdminClient();

  // ── 1. Load booking ────────────────────────────────────────────────────────
  const { data: bookingRaw } = await admin
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      senior_profile_id,
      activity_type:activity_types(name)
    `)
    .eq("id", bookingId)
    .single();

  if (!bookingRaw) return { success: false, error: "Booking not found." };

  const bookingStatus = bookingRaw.status as string;
  if (!["requested", "assigned"].includes(bookingStatus)) {
    return {
      success: false,
      error: `Matching is only available for bookings in 'requested' or 'assigned' status (current: ${bookingStatus}).`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actType = (bookingRaw.activity_type as any);
  const booking: BookingInput = {
    id: bookingRaw.id as string,
    activityTypeName: (actType?.name as string) ?? "Companion Visit",
    scheduledDate: bookingRaw.scheduled_date as string,
    scheduledStartTime: bookingRaw.scheduled_start_time as string,
    durationHours: bookingRaw.duration_hours as number,
    seniorProfileId: bookingRaw.senior_profile_id as string,
  };

  // ── 2. Load senior preferences ─────────────────────────────────────────────
  const { data: seniorProfileRaw } = await admin
    .from("senior_profiles")
    .select("preferred_language, additional_languages, interests, preferred_companion_gender")
    .eq("profile_id", bookingRaw.senior_profile_id as string)
    .maybeSingle();

  const senior: SeniorInput = {
    preferredLanguage: (seniorProfileRaw?.preferred_language as string) ?? "English",
    additionalLanguages: (seniorProfileRaw?.additional_languages as string[]) ?? [],
    interests: (seniorProfileRaw?.interests as string[]) ?? [],
    preferredCompanionGender: (seniorProfileRaw?.preferred_companion_gender as SeniorInput["preferredCompanionGender"]) ?? null,
  };

  // ── 3. Load all approved companions ───────────────────────────────────────
  const { data: companionRows } = await admin
    .from("companion_profiles")
    .select(`
      id, profile_id, verification_status, max_travel_miles,
      languages_spoken, activity_preferences, activities_supported, interests,
      profile:profiles(first_name, last_name)
    `)
    .eq("verification_status", "approved");

  if (!companionRows || companionRows.length === 0) {
    return { success: false, error: "No approved companions found." };
  }

  const companionProfileIds = companionRows.map((c) => c.id as string);
  const companionProfilePersonIds = companionRows.map((c) => c.profile_id as string);

  // ── 4. Parallel data fetches ───────────────────────────────────────────────
  const [
    availabilityRows,
    overlappingBookings,
    bookingDeclines,
    ratingsRows,
    completedBookings,
    completedWithSenior,
    recentDeclines,
  ] = await Promise.all([
    // Availability slots
    admin
      .from("companion_availability")
      .select("companion_profile_id, day_of_week, start_time, end_time")
      .in("companion_profile_id", companionProfileIds)
      .eq("is_active", true),

    // Bookings that might overlap on the same date
    admin
      .from("bookings")
      .select("companion_profile_id, scheduled_start_time, duration_hours")
      .eq("scheduled_date", booking.scheduledDate)
      .in("status", ["accepted", "in_progress"])
      .in("companion_profile_id", companionProfileIds),

    // Companions who already declined THIS booking
    admin
      .from("booking_assignments")
      .select("companion_profile_id")
      .eq("booking_id", bookingId)
      .eq("status", "declined"),

    // Ratings for these companions (rated_profile_id = companion's profiles.id)
    admin
      .from("ratings")
      .select("rated_profile_id, rating")
      .in("rated_profile_id", companionProfilePersonIds),

    // Completed visits per companion
    admin
      .from("bookings")
      .select("companion_profile_id")
      .in("companion_profile_id", companionProfileIds)
      .eq("status", "completed"),

    // Completed visits with THIS senior
    admin
      .from("bookings")
      .select("companion_profile_id")
      .in("companion_profile_id", companionProfileIds)
      .eq("senior_profile_id", booking.seniorProfileId)
      .eq("status", "completed"),

    // Recent declines across all bookings (last N days)
    admin
      .from("booking_assignments")
      .select("companion_profile_id")
      .in("companion_profile_id", companionProfileIds)
      .eq("status", "declined")
      .gte(
        "responded_at",
        new Date(
          Date.now() - MATCHING_CONFIG.declineWindowDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
      ),
  ]);

  // ── 5. Build lookup maps ───────────────────────────────────────────────────

  // day_of_week of the booking
  const [y, m, d] = (booking.scheduledDate).split("-").map(Number);
  const bookingDow = new Date(y, m - 1, d).getDay(); // 0 = Sunday

  const toMinutes = (t: string) => {
    const [h, min] = t.split(":").map(Number);
    return h * 60 + min;
  };
  const bookingStart = toMinutes(booking.scheduledStartTime);
  const bookingEnd = bookingStart + Math.round(booking.durationHours * 60);

  // availability: map companionProfileId → slots
  const availMap = new Map<string, Array<{ day: number; start: number; end: number }>>();
  for (const slot of availabilityRows.data ?? []) {
    const cpId = slot.companion_profile_id as string;
    if (!availMap.has(cpId)) availMap.set(cpId, []);
    availMap.get(cpId)!.push({
      day: slot.day_of_week as number,
      start: toMinutes(slot.start_time as string),
      end: toMinutes(slot.end_time as string),
    });
  }

  function isAvailable(cpId: string): boolean {
    const slots = availMap.get(cpId);
    if (!slots || slots.length === 0) return false; // no availability = not available
    return slots.some(
      (s) => s.day === bookingDow && s.start <= bookingStart && s.end >= bookingEnd,
    );
  }

  // overlapping bookings: set of companionProfileIds with a time conflict
  const overlappingIds = new Set<string>();
  for (const b of overlappingBookings.data ?? []) {
    if (!b.companion_profile_id) continue;
    const bStart = toMinutes(b.scheduled_start_time as string);
    const bEnd = bStart + Math.round((b.duration_hours as number) * 60);
    // Overlap: not (bEnd <= bookingStart || bStart >= bookingEnd)
    if (!(bEnd <= bookingStart || bStart >= bookingEnd)) {
      overlappingIds.add(b.companion_profile_id as string);
    }
  }

  // declined this booking
  const declinedIds = new Set(
    (bookingDeclines.data ?? []).map((r) => r.companion_profile_id as string),
  );

  // ratings: map profileId → avg
  const ratingSums = new Map<string, { sum: number; count: number }>();
  for (const r of ratingsRows.data ?? []) {
    const pid = r.rated_profile_id as string;
    const existing = ratingSums.get(pid) ?? { sum: 0, count: 0 };
    ratingSums.set(pid, { sum: existing.sum + (r.rating as number), count: existing.count + 1 });
  }

  // completed visits per companion
  const completedCounts = new Map<string, number>();
  for (const b of completedBookings.data ?? []) {
    const cpId = b.companion_profile_id as string;
    completedCounts.set(cpId, (completedCounts.get(cpId) ?? 0) + 1);
  }

  // completed with THIS senior
  const completedWithSeniorIds = new Set(
    (completedWithSenior.data ?? []).map((b) => b.companion_profile_id as string),
  );

  // recent declines per companion
  const recentDeclineCounts = new Map<string, number>();
  for (const r of recentDeclines.data ?? []) {
    const cpId = r.companion_profile_id as string;
    recentDeclineCounts.set(cpId, (recentDeclineCounts.get(cpId) ?? 0) + 1);
  }

  // ── 6. Assemble CompanionInput array ──────────────────────────────────────
  const companions: CompanionInput[] = companionRows.map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = c.profile as any;
    const cpId = c.id as string;
    const profileId = c.profile_id as string;

    const ratingStats = ratingSums.get(profileId);
    const avgRating = ratingStats ? ratingStats.sum / ratingStats.count : null;

    return {
      id: cpId,
      profileId,
      firstName: (profile?.first_name as string) ?? "Unknown",
      lastName: (profile?.last_name as string) ?? "",
      verificationStatus: c.verification_status as string,
      maxTravelMiles: c.max_travel_miles as number,
      languagesSpoken: (c.languages_spoken as string[]) ?? [],
      activityPreferences: (c.activity_preferences as string[]) ?? [],
      activitiesSupported: (c.activities_supported as string[]) ?? [],
      interests: (c.interests as string[]) ?? [],
      availableForBooking: isAvailable(cpId),
      hasOverlappingBooking: overlappingIds.has(cpId),
      declinedThisBooking: declinedIds.has(cpId),
      avgRating,
      completedVisitsCount: completedCounts.get(cpId) ?? 0,
      completedVisitsWithSenior: completedWithSeniorIds.has(cpId) ? 1 : 0,
      recentDeclineCount: recentDeclineCounts.get(cpId) ?? 0,
    };
  });

  // ── 7. Run matching engine ────────────────────────────────────────────────
  const result = await runMatching(companions, booking, senior, {
    genderPreferenceEnabled: MATCHING_CONFIG.genderPreferenceEnabled,
    maxCandidates: MATCHING_CONFIG.maxCandidates,
  });

  // ── 8. Log to audit_log ───────────────────────────────────────────────────
  await admin.from("audit_log").insert({
    actor_profile_id: callerProfile.id,
    action: "matching_recommendation_run",
    entity_type: "booking",
    entity_id: bookingId,
    new_value: {
      candidateCount: result.candidates.length,
      excludedCount: result.excluded.length,
      topCandidate: result.candidates[0]
        ? {
            companionProfileId: result.candidates[0].companionProfileId,
            totalScore: result.candidates[0].totalScore,
          }
        : null,
      weightsUsed: result.weightsUsed,
      genderPreferenceEnabled: MATCHING_CONFIG.genderPreferenceEnabled,
    },
  });

  return { success: true, result };
}

// ── Log admin assignment decision from recommendation ─────────────────────────
export async function logMatchAssignmentDecision(
  bookingId: string,
  companionProfileId: string,
  fromRecommendation: boolean,
  recommendedRank: number | null,
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "admin") return;

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_profile_id: callerProfile.id,
    action: "matching_assignment_decision",
    entity_type: "booking",
    entity_id: bookingId,
    new_value: {
      companionProfileId,
      fromRecommendation,
      recommendedRank,
    },
    notes: fromRecommendation
      ? `Admin assigned companion ranked #${recommendedRank} by the matching engine`
      : "Admin assigned companion without using the matching recommendation",
  });
}
