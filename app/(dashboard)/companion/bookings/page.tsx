import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { getServerTranslation } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Booking Requests – Companion" };

export default async function CompanionBookingsPage() {
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
  if (profile?.role !== "companion") redirect("/login");

  const { data: cp } = await supabase
    .from("companion_profiles")
    .select("id, verification_status")
    .eq("profile_id", profile.id)
    .single();

  const { data: assignments } = await supabase
    .from("booking_assignments")
    .select(`
      id,
      status,
      assigned_at,
      responded_at,
      booking:bookings(
        id,
        status,
        scheduled_date,
        scheduled_start_time,
        duration_hours,
        location_description,
        activity_type:activity_types(name)
      )
    `)
    .eq("companion_profile_id", cp?.id ?? "")
    .order("assigned_at", { ascending: false });

  const pending = (assignments ?? []).filter((a) => a.status === "pending");
  const recent = (assignments ?? []).filter((a) => a.status !== "pending").slice(0, 5);
  const isApproved = cp?.verification_status === "approved";
  const { t } = getServerTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          {t("companionBookings.listTitle")}
        </h1>
        <p className="text-senior-lg text-gray-500">
          {t("companionBookings.listSubtitle")}
        </p>
      </div>

      {!isApproved && (
        <div className="rounded-xl bg-warm-50 border border-warm-200 p-4 text-sm text-warm-800">
          You must be approved before you can accept booking requests.{" "}
          <Link href="/companion/verification" className="font-semibold underline">
            View verification status
          </Link>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Pending requests</CardTitle>
          <CardDescription>These assignments are waiting for your response.</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500 text-senior-base">{t("companionBookings.noUpcoming")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {pending.map((a) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const b = a.booking as any;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/companion/bookings/${a.id}`}
                      className="flex items-center justify-between gap-4 py-4 hover:bg-gray-50 rounded-xl px-3 -mx-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {b?.activity_type?.name ?? t("bookingCard.companionVisit")}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {b?.scheduled_date ? formatDate(b.scheduled_date) : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {b?.scheduled_start_time ? formatTime(b.scheduled_start_time) : "—"}
                            {b?.duration_hours ? ` · ${b.duration_hours}h` : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {b?.location_description ?? "—"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="warning" className="flex-shrink-0">{t("bookingStatus.requested")}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent responses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-50">
              {recent.map((a) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const b = a.booking as any;
                const variant = a.status === "accepted" ? "success" : "secondary";
                return (
                  <li key={a.id}>
                    <Link
                      href={`/companion/bookings/${a.id}`}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50 rounded-xl px-3 -mx-3 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {b?.activity_type?.name ?? t("bookingCard.companionVisit")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {b?.scheduled_date ? formatDate(b.scheduled_date) : "—"}
                        </p>
                      </div>
                      <Badge variant={variant} className="capitalize flex-shrink-0">
                        {a.status as string}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
