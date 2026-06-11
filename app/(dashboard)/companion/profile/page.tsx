import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanionProfileForm } from "./_form";
import type { CompanionOnboardingFormData } from "@/lib/validations/companion-profile";

export const metadata: Metadata = { title: "My Profile – Companion" };

export default async function CompanionProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "companion") redirect("/login");

  const { data: cp } = await supabase
    .from("companion_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  const { data: refs } = await supabase
    .from("companion_references")
    .select("*")
    .eq("companion_profile_id", cp?.id ?? "")
    .order("sort_order");

  const blankRef = { reference_name: "", reference_phone: "", reference_email: "", relationship: "" };

  const defaultValues: CompanionOnboardingFormData = {
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    street_address: (profile as any).street_address ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    zip_code: profile.zip_code ?? "",
    bio: profile.bio ?? "",
    languages_spoken: cp?.languages_spoken ?? ["English"],
    interests: (cp as Record<string, unknown>)?.interests as string[] ?? [],
    max_travel_miles: cp?.max_travel_miles ?? 10,
    activities_supported: (cp as Record<string, unknown>)?.activities_supported as string[] ?? [],
    has_prior_experience: (cp as Record<string, unknown>)?.has_prior_experience as boolean ?? false,
    years_experience: cp?.years_experience ?? null,
    background_check_consent:
      ((cp as Record<string, unknown>)?.background_check_consent as boolean) === true ? true : (false as never),
    code_of_conduct_accepted:
      ((cp as Record<string, unknown>)?.code_of_conduct_accepted as boolean) === true ? true : (false as never),
    emergency_protocol_completed:
      ((cp as Record<string, unknown>)?.emergency_protocol_completed as boolean) ?? false,
    references:
      refs && refs.length >= 2
        ? (refs.slice(0, 2).map((r) => ({
            reference_name: r.reference_name,
            reference_phone: r.reference_phone,
            reference_email: r.reference_email ?? "",
            relationship: r.relationship,
          })) as CompanionOnboardingFormData["references"])
        : [blankRef, blankRef],
  };

  return <CompanionProfileForm defaultValues={defaultValues} />;
}
