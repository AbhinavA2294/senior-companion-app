"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { SeniorProfileFormData, EmergencyContactFormData } from "@/lib/validations/senior-profile";
import { SeniorProfileSchema, EmergencyContactSchema } from "@/lib/validations/senior-profile";

export type ActionResult =
  | { success: true; data?: Record<string, unknown> }
  | { success: false; error: string };

// ── Create a new managed senior profile ──────────────────────
export async function createSeniorProfile(
  raw: SeniorProfileFormData
): Promise<ActionResult & { seniorId?: string }> {
  const parsed = SeniorProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: familyProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profileErr || !familyProfile || familyProfile.role !== "family") {
    return { success: false, error: "Only family members can create senior profiles." };
  }

  const admin = createAdminClient();

  // 1. Create a managed profiles row (no auth account)
  const { data: newProfile, error: insertErr } = await admin
    .from("profiles")
    .insert({
      role: "senior",
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      date_of_birth: data.date_of_birth || null,
      street_address: data.street_address || null,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code || null,
      is_managed: true,
      managed_by_profile_id: familyProfile.id,
    })
    .select("id")
    .single();

  if (insertErr || !newProfile) {
    return { success: false, error: "Failed to create senior profile. Please try again." };
  }

  const seniorId = newProfile.id as string;

  // 2. The trigger handle_new_profile auto-creates senior_profiles row.
  //    Update it with extended fields.
  const { error: seniorProfileErr } = await admin
    .from("senior_profiles")
    .update({
      preferred_name: data.preferred_name || null,
      contact_email: data.contact_email || null,
      preferred_language: data.preferred_language,
      additional_languages: data.additional_languages,
      preferred_companion_gender: data.preferred_companion_gender || null,
      interests: data.interests,
      accessibility_needs: data.accessibility_needs || null,
      mobility_notes: data.mobility_notes || null,
      dietary_notes: data.dietary_notes || null,
      free_text_notes: data.free_text_notes || null,
    })
    .eq("profile_id", seniorId);

  if (seniorProfileErr) {
    return { success: false, error: "Failed to save senior details. Please try again." };
  }

  // 3. Create family–senior relationship
  const { error: relErr } = await admin
    .from("family_senior_relationships")
    .insert({
      family_profile_id: familyProfile.id,
      senior_profile_id: seniorId,
      relationship_label: data.relationship_label ?? "Family Member",
      can_book: true,
      can_view_summaries: true,
    });

  if (relErr) {
    return { success: false, error: "Failed to link senior to your account. Please try again." };
  }

  revalidatePath("/family");
  revalidatePath("/family/seniors");

  return { success: true, seniorId };
}

// ── Update an existing senior profile ────────────────────────
export async function updateSeniorProfile(
  seniorProfileId: string,
  raw: SeniorProfileFormData
): Promise<ActionResult> {
  const parsed = SeniorProfileSchema.safeParse(raw);
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

  // Verify access
  const canEdit = await canEditSeniorProfile(callerProfile.id, callerProfile.role, seniorProfileId);
  if (!canEdit) return { success: false, error: "You do not have permission to edit this profile." };

  const admin = createAdminClient();

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      date_of_birth: data.date_of_birth || null,
      street_address: data.street_address || null,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code || null,
    })
    .eq("id", seniorProfileId);

  if (profileErr) {
    return { success: false, error: "Failed to update profile." };
  }

  const { error: seniorErr } = await admin
    .from("senior_profiles")
    .update({
      preferred_name: data.preferred_name || null,
      contact_email: data.contact_email || null,
      preferred_language: data.preferred_language,
      additional_languages: data.additional_languages,
      preferred_companion_gender: data.preferred_companion_gender || null,
      interests: data.interests,
      accessibility_needs: data.accessibility_needs || null,
      mobility_notes: data.mobility_notes || null,
      dietary_notes: data.dietary_notes || null,
      free_text_notes: data.free_text_notes || null,
    })
    .eq("profile_id", seniorProfileId);

  if (seniorErr) {
    return { success: false, error: "Failed to update senior details." };
  }

  revalidatePath(`/family/seniors/${seniorProfileId}`);
  revalidatePath("/family/seniors");

  return { success: true };
}

// ── Save emergency contact for a senior ──────────────────────
export async function saveEmergencyContact(
  seniorProfileId: string,
  raw: EmergencyContactFormData,
  existingContactId?: string
): Promise<ActionResult> {
  const parsed = EmergencyContactSchema.safeParse(raw);
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

  const canEdit = await canEditSeniorProfile(callerProfile.id, callerProfile.role, seniorProfileId);
  if (!canEdit) return { success: false, error: "You do not have permission to manage this senior's contacts." };

  const admin = createAdminClient();

  if (existingContactId) {
    const { error } = await admin
      .from("emergency_contacts")
      .update({
        name: data.name,
        relationship: data.relationship,
        phone: data.phone,
        email: data.email || null,
        is_primary: data.is_primary,
      })
      .eq("id", existingContactId);

    if (error) return { success: false, error: "Failed to update emergency contact." };
  } else {
    const { error } = await admin
      .from("emergency_contacts")
      .insert({
        senior_profile_id: seniorProfileId,
        name: data.name,
        relationship: data.relationship,
        phone: data.phone,
        email: data.email || null,
        is_primary: data.is_primary,
      });

    if (error) return { success: false, error: "Failed to save emergency contact." };
  }

  revalidatePath(`/family/seniors/${seniorProfileId}`);
  revalidatePath(`/family/seniors/${seniorProfileId}/emergency-contact`);

  return { success: true };
}

// ── Auth helper ───────────────────────────────────────────────
async function canEditSeniorProfile(
  callerProfileId: string,
  callerRole: string,
  seniorProfileId: string
): Promise<boolean> {
  if (callerRole === "admin") return true;
  if (callerRole === "senior" && callerProfileId === seniorProfileId) return true;

  const supabase = createClient();

  // Check if managed by caller
  const { data: managed } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", seniorProfileId)
    .eq("managed_by_profile_id", callerProfileId)
    .single();
  if (managed) return true;

  // Check relationship
  const { data: rel } = await supabase
    .from("family_senior_relationships")
    .select("id")
    .eq("family_profile_id", callerProfileId)
    .eq("senior_profile_id", seniorProfileId)
    .single();

  return !!rel;
}
