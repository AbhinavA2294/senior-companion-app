import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { VoiceBookingWizard } from "@/components/voice/voice-booking-wizard";
import { submitVoiceBooking } from "@/lib/actions/voice-booking";
import type { Profile, SeniorProfile, ActivityType } from "@/types";

export const metadata: Metadata = { title: "Voice-Assisted Booking" };

export default async function SeniorVoiceBookingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (profileRaw?.role !== "senior") redirect("/login");
  const profile = profileRaw as unknown as Profile;

  const { data: seniorDetailRaw } = await supabase
    .from("senior_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .single();
  const seniorDetail = seniorDetailRaw as unknown as SeniorProfile | null;

  const { data: activityTypesRaw } = await supabase
    .from("activity_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activityTypes = (activityTypesRaw ?? []) as unknown as ActivityType[];

  const seniors = [
    {
      id: profile.id,
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
    },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/senior/bookings/new" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Prefer the form? Book manually
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Voice-Assisted Booking</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Describe your visit in your own words — we'll fill in the form for you.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <VoiceBookingWizard
            seniors={seniors}
            activityTypes={activityTypes.map((a) => ({ id: a.id, name: a.name }))}
            defaultSeniorId={profile.id}
            successRedirect="/senior/bookings"
            submitAction={submitVoiceBooking}
          />
        </CardContent>
      </Card>
    </div>
  );
}
