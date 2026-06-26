import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/bookings/booking-card";
import { Calendar, Plus } from "lucide-react";
import type { BookingWithDetails } from "@/types";
import { getServerTranslation } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "My Visits" };

interface Props {
  searchParams: { tab?: string };
}

export default async function SeniorBookingsPage({ searchParams }: Props) {
  const tab = searchParams.tab === "past" ? "past" : "upcoming";

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
  if (profile?.role !== "senior") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [{ data: upcomingRaw }, { data: pastRaw }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`*, activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at)`)
      .eq("senior_profile_id", profile.id)
      .in("status", ["requested", "assigned", "accepted", "in_progress"])
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("bookings")
      .select(`*, activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at)`)
      .eq("senior_profile_id", profile.id)
      .in("status", ["completed", "cancelled"])
      .order("scheduled_date", { ascending: false }),
  ]);

  const upcoming = (upcomingRaw ?? []) as unknown as BookingWithDetails[];
  const past = (pastRaw ?? []) as unknown as BookingWithDetails[];
  const displayList = tab === "past" ? past : upcoming;
  const { t } = getServerTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-senior-3xl font-bold text-gray-900">{t("seniorBookings.listTitle")}</h1>
          <p className="text-senior-lg text-gray-500 mt-1">{t("seniorBookings.listSubtitle")}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/senior/bookings/new">
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("seniorBookings.bookVisit")}
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {[
          { key: "upcoming", label: t("seniorBookings.tabUpcoming").replace("{count}", String(upcoming.length)) },
          { key: "past",     label: t("seniorBookings.tabPast").replace("{count}", String(past.length)) },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={key === "upcoming" ? "/senior/bookings" : "/senior/bookings?tab=past"}
            role="tab"
            aria-selected={tab === key}
            className={`px-4 py-2.5 text-senior-base font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-sage-500 text-sage-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-16 w-16 text-gray-200 mb-5" aria-hidden="true" />
          <h2 className="text-senior-xl font-semibold text-gray-500 mb-3">
            {tab === "past" ? t("seniorBookings.noPast") : t("seniorBookings.noUpcoming")}
          </h2>
          {tab === "upcoming" && (
            <Button asChild size="xl">
              <Link href="/senior/bookings/new">
                <Plus className="mr-2 h-6 w-6" aria-hidden="true" />
                {t("seniorBookings.bookVisit")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((booking) => (
            <BookingCard key={booking.id} booking={booking} basePath="/senior/bookings" />
          ))}
        </div>
      )}
    </div>
  );
}
