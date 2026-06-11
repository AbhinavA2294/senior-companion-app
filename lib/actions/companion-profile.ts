"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  CompanionOnboardingSchema,
  CompanionAvailabilitySchema,
  type CompanionOnboardingFormData,
  type CompanionAvailabilityFormData,
} from "@/lib/validations/companion-profile";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

// ── Save companion onboarding profile ────────────────────────
export async function upsertCompanionOnboarding(
  raw: CompanionOnboardingFormData
): Promise<ActionResult> {
  const parsed = CompanionOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
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
  if (callerProfile.role !== "companion") {
    return { success: false, error: "Only companions can update companion profiles." };
  }

  const admin = createAdminClient();

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      street_address: data.street_address || null,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code || null,
      bio: data.bio,
    })
    .eq("id", callerProfile.id);

  if (profileErr) return { success: false, error: "Failed to update profile." };

  const { data: companionProfile } = await admin
    .from("companion_profiles")
    .select(
      "id, background_check_consent, background_check_consent_at, code_of_conduct_accepted, code_of_conduct_accepted_at, emergency_protocol_completed, emergency_protocol_completed_at"
    )
    .eq("profile_id", callerProfile.id)
    .single();

  if (!companionProfile) {
    return { success: false, error: "Companion profile not found." };
  }

  const now = new Date().toISOString();

  const { error: companionErr } = await admin
    .from("companion_profiles")
    .update({
      languages_spoken: data.languages_spoken,
      interests: data.interests,
      max_travel_miles: data.max_travel_miles,
      activities_supported: data.activities_supported,
      has_prior_experience: data.has_prior_experience,
      years_experience: data.years_experience ?? null,
      background_check_consent: data.background_check_consent,
      background_check_consent_at:
        !companionProfile.background_check_consent && data.background_check_consent
          ? now
          : (companionProfile.background_check_consent_at ?? null),
      code_of_conduct_accepted: data.code_of_conduct_accepted,
      code_of_conduct_accepted_at:
        !companionProfile.code_of_conduct_accepted && data.code_of_conduct_accepted
          ? now
          : (companionProfile.code_of_conduct_accepted_at ?? null),
      emergency_protocol_completed: data.emergency_protocol_completed,
      emergency_protocol_completed_at:
        !companionProfile.emergency_protocol_completed && data.emergency_protocol_completed
          ? now
          : (companionProfile.emergency_protocol_completed_at ?? null),
    })
    .eq("id", companionProfile.id);

  if (companionErr) {
    return { success: false, error: "Failed to update companion details." };
  }

  // Replace references (delete then insert)
  await admin
    .from("companion_references")
    .delete()
    .eq("companion_profile_id", companionProfile.id);

  const { error: refErr } = await admin.from("companion_references").insert(
    data.references.map((ref, i) => ({
      companion_profile_id: companionProfile.id,
      reference_name: ref.reference_name,
      reference_phone: ref.reference_phone,
      reference_email: ref.reference_email || null,
      relationship: ref.relationship,
      sort_order: i,
    }))
  );

  if (refErr) {
    return { success: false, error: "Failed to save references." };
  }

  revalidatePath("/companion");
  revalidatePath("/companion/profile");

  return { success: true };
}

// ── Save companion availability ───────────────────────────────
export async function upsertCompanionAvailability(
  raw: CompanionAvailabilityFormData
): Promise<ActionResult> {
  const parsed = CompanionAvailabilitySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { slots } = parsed.data;

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
    return { success: false, error: "Only companions can manage availability." };
  }

  const admin = createAdminClient();

  const { data: companionProfile } = await admin
    .from("companion_profiles")
    .select("id")
    .eq("profile_id", callerProfile.id)
    .single();

  if (!companionProfile) {
    return { success: false, error: "Companion profile not found." };
  }

  // Replace all availability rows
  await admin
    .from("companion_availability")
    .delete()
    .eq("companion_profile_id", companionProfile.id);

  const activeSlots = slots.filter((s) => s.is_active);

  if (activeSlots.length > 0) {
    const { error: insertErr } = await admin.from("companion_availability").insert(
      activeSlots.map((slot) => ({
        companion_profile_id: companionProfile.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: true,
      }))
    );

    if (insertErr) {
      return { success: false, error: "Failed to save availability." };
    }
  }

  revalidatePath("/companion/availability");

  return { success: true };
}
