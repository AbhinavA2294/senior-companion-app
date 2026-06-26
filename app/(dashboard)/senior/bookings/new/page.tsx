import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "@/components/bookings/booking-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Profile, SeniorProfile, ActivityType } from "@/types";
import { getServerTranslation } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Book a Visit" };

export default async function NewSeniorBookingPage() {
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

  const seniors = [{ profile, seniorProfile: seniorDetail }];
  const { t } = getServerTranslation();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/senior/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          {t("bookingPage.senior.backLink")}
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">{t("bookingPage.senior.title")}</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          {t("bookingPage.senior.subtitle")}
        </p>
      </div>

      <Alert variant="info" className="mb-6">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm">
          {t("bookingPage.senior.helpText").replace("{phone}", "1-800-555-2273")}
        </p>
      </Alert>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-sage-100 bg-sage-50 px-4 py-3">
        <span className="text-lg">🎙️</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-sage-800">{t("bookingPage.voicePromoTitle")}</p>
          <p className="text-xs text-sage-600">{t("bookingPage.voicePromoSubtitle")}</p>
        </div>
        <Link
          href="/senior/bookings/new/voice"
          className="rounded-lg border border-sage-300 bg-white px-3 py-1.5 text-xs font-semibold text-sage-700 hover:bg-sage-50 whitespace-nowrap"
        >
          {t("bookingPage.voicePromoLink")}
        </Link>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <BookingWizard
            seniors={seniors}
            activityTypes={activityTypes}
            defaultSeniorId={profile.id}
            successRedirect="/senior/bookings"
          />
        </CardContent>
      </Card>
    </div>
  );
}
