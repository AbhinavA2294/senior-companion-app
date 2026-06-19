import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { VoiceBookingWizard } from "@/components/voice/voice-booking-wizard";
import { submitVoiceBooking } from "@/lib/actions/voice-booking";
import type { Profile, SeniorProfile, ActivityType } from "@/types";

export const metadata: Metadata = { title: "Voice-Assisted Booking" };

export default async function FamilyVoiceBookingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "family") redirect("/login");

  const { data: relationships } = await supabase
    .from("family_senior_relationships")
    .select("senior_profile_id")
    .eq("family_profile_id", profile.id);
  const linkedIds = relationships?.map((r) => r.senior_profile_id) ?? [];

  const { data: managedRaw } = await supabase
    .from("profiles")
    .select("id")
    .eq("managed_by_profile_id", profile.id)
    .eq("is_managed", true);
  const managedIds = managedRaw?.map((p) => p.id) ?? [];

  const allSeniorIds = Array.from(new Set([...linkedIds, ...managedIds]));

  const { data: profilesRaw } = allSeniorIds.length
    ? await supabase.from("profiles").select("*").in("id", allSeniorIds)
    : { data: [] };

  const seniors = (profilesRaw ?? []).map((p) => {
    const prof = p as unknown as Profile;
    return { id: prof.id, firstName: prof.first_name ?? "", lastName: prof.last_name ?? "" };
  });

  const { data: activityTypesRaw } = await supabase
    .from("activity_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activityTypes = (activityTypesRaw ?? []) as unknown as ActivityType[];

  if (seniors.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-6">Voice-Assisted Booking</h1>
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <div>
            <p className="font-medium">No seniors linked to your account</p>
            <p className="text-sm mt-1">
              <Link href="/family/seniors/add" className="underline font-medium">Add a senior</Link>
              {" "}before you can create a booking.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/family/bookings/new" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Prefer the form? Book manually
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Voice-Assisted Booking</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Describe the visit in your own words — we'll fill in the form for you to review.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <VoiceBookingWizard
            seniors={seniors}
            activityTypes={activityTypes.map((a) => ({ id: a.id, name: a.name }))}
            successRedirect="/family/bookings"
            submitAction={submitVoiceBooking}
          />
        </CardContent>
      </Card>
    </div>
  );
}
