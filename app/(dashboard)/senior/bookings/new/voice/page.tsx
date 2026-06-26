import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { VoiceBookingWizard } from "@/components/voice/voice-booking-wizard";
import { submitVoiceBooking } from "@/lib/actions/voice-booking";
import type { Profile, SeniorProfile, ActivityType } from "@/types";
import { getServerTranslation } from "@/lib/i18n/server";

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

  const { t } = getServerTranslation();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/senior/bookings/new" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← {t("seniorBookings.voiceBack")}
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">{t("seniorBookings.voiceTitle")}</h1>
        <p className="text-senior-lg text-gray-500 mt-1">{t("seniorBookings.voiceSubtitle")}</p>
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
