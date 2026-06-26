import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerTranslation } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { Calendar, Plus, Phone, User, Clock } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { Booking, ActivityType } from "@/types";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function SeniorDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "senior") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const { data: nextBookingRaw } = await supabase
    .from("bookings")
    .select(`*, activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at)`)
    .eq("senior_profile_id", profile.id)
    .in("status", ["requested", "assigned", "accepted"])
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .single();

  const nextBooking = nextBookingRaw as unknown as (Booking & { activity_type: ActivityType }) | null;

  const { count: completedCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("senior_profile_id", profile.id)
    .eq("status", "completed");

  const firstName = profile?.first_name ?? "there";
  const { t } = getServerTranslation();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-1">
          {t("senior.dashboard.pageTitle").replace("{name}", firstName)}
        </h1>
        <p className="text-senior-lg text-gray-500">
          {t("senior.dashboard.subtitle")}
        </p>
      </div>

      {/* My Next Visit */}
      <section aria-label={t("senior.dashboard.nextVisit")}>
        <h2 className="font-display text-senior-xl font-semibold text-gray-900 mb-3">
          {t("senior.dashboard.nextVisit")}
        </h2>
        {nextBooking ? (
          <Card className="border-0 shadow-sm border-l-4 border-l-sage-500">
            <CardContent className="pt-5 pb-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-senior-lg text-gray-900">
                  {nextBooking.activity_type?.name ?? t("senior.dashboard.companionVisit")}
                </span>
                <BookingStatusBadge status={nextBooking.status} />
              </div>
              <p className="text-senior-base text-gray-700 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sage-500 flex-shrink-0" aria-hidden="true" />
                {formatDate(nextBooking.scheduled_date)}
              </p>
              <p className="text-senior-base text-gray-700 flex items-center gap-2">
                <Clock className="h-5 w-5 text-sage-500 flex-shrink-0" aria-hidden="true" />
                {formatTime(nextBooking.scheduled_start_time)} &mdash;{" "}
                {nextBooking.duration_hours}{" "}
                {nextBooking.duration_hours !== 1 ? t("common.hours") : t("common.hour")}
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="default">
                  <Link href={`/senior/bookings/${nextBooking.id}`}>{t("common.viewDetails")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 pb-6 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-senior-lg text-gray-500 mb-4">{t("senior.dashboard.noUpcoming")}</p>
              <Button asChild size="lg" variant="default">
                <Link href="/senior/bookings/new">
                  <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t("senior.dashboard.bookCompanion")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quick actions */}
      <section aria-label={t("senior.dashboard.quickActions")}>
        <h2 className="font-display text-senior-xl font-semibold text-gray-900 mb-3">
          {t("senior.dashboard.quickActions")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            asChild
            size="xl"
            className="h-24 text-senior-xl flex-col gap-2 bg-sage-600 hover:bg-sage-700 text-white"
          >
            <Link href="/senior/bookings/new">
              <Plus className="h-7 w-7" aria-hidden="true" />
              {t("senior.dashboard.bookCompanion")}
            </Link>
          </Button>

          <Button
            asChild
            size="xl"
            variant="outline"
            className="h-24 text-senior-xl flex-col gap-2 border-2"
          >
            <Link href="/senior/bookings">
              <Calendar className="h-7 w-7" aria-hidden="true" />
              {t("senior.dashboard.myVisits")}
            </Link>
          </Button>

          <Button
            asChild
            size="xl"
            variant="outline"
            className="h-24 text-senior-xl flex-col gap-2 border-2"
          >
            <Link href="/senior/profile">
              <User className="h-7 w-7" aria-hidden="true" />
              {t("senior.dashboard.myProfile")}
            </Link>
          </Button>

          <div className="bg-sage-50 rounded-xl p-5 flex flex-col justify-center border-2 border-sage-100">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-6 w-6 text-sage-600" aria-hidden="true" />
              <span className="font-semibold text-senior-base text-sage-800">
                {t("senior.dashboard.callSupport")}
              </span>
            </div>
            <p className="text-senior-xl font-bold text-sage-700">{t("senior.dashboard.supportPhone")}</p>
            <p className="text-sm text-gray-500 mt-0.5">{t("senior.dashboard.supportHours")}</p>
          </div>
        </div>
      </section>

      {/* Past visits */}
      {(completedCount ?? 0) > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-senior-xl font-semibold text-gray-900">
              {t("senior.dashboard.pastVisits").replace("{count}", String(completedCount))}
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/senior/bookings?tab=past">{t("senior.dashboard.seeAll")}</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
