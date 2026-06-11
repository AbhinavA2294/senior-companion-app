import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .single();

  if (profile?.role !== "senior") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Next upcoming booking
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

  // Past visits count
  const { count: completedCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("senior_profile_id", profile.id)
    .eq("status", "completed");

  const firstName = profile?.first_name ?? "there";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-1">
          Hello, {firstName}!
        </h1>
        <p className="text-senior-lg text-gray-500">
          Your companions are here for you whenever you need them.
        </p>
      </div>

      {/* My Next Visit */}
      <section aria-label="My next visit">
        <h2 className="font-display text-senior-xl font-semibold text-gray-900 mb-3">
          My Next Visit
        </h2>
        {nextBooking ? (
          <Card className="border-0 shadow-sm border-l-4 border-l-sage-500">
            <CardContent className="pt-5 pb-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-senior-lg text-gray-900">
                  {nextBooking.activity_type?.name ?? "Companion Visit"}
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
                {nextBooking.duration_hours} hour{nextBooking.duration_hours !== 1 ? "s" : ""}
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="default">
                  <Link href={`/senior/bookings/${nextBooking.id}`}>View details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 pb-6 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-senior-lg text-gray-500 mb-4">No upcoming visits</p>
              <Button asChild size="lg" variant="default">
                <Link href="/senior/bookings/new">
                  <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                  Book a Companion
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Big action buttons */}
      <section aria-label="Quick actions">
        <h2 className="font-display text-senior-xl font-semibold text-gray-900 mb-3">
          What would you like to do?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            asChild
            size="xl"
            className="h-24 text-senior-xl flex-col gap-2 bg-sage-600 hover:bg-sage-700 text-white"
          >
            <Link href="/senior/bookings/new">
              <Plus className="h-7 w-7" aria-hidden="true" />
              Book a Companion
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
              My Visits
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
              My Profile
            </Link>
          </Button>

          <div className="bg-sage-50 rounded-xl p-5 flex flex-col justify-center border-2 border-sage-100">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-6 w-6 text-sage-600" aria-hidden="true" />
              <span className="font-semibold text-senior-base text-sage-800">Call Support</span>
            </div>
            <p className="text-senior-xl font-bold text-sage-700">1-800-555-2273</p>
            <p className="text-sm text-gray-500 mt-0.5">Mon–Fri, 8 AM–6 PM</p>
          </div>
        </div>
      </section>

      {/* Past visits */}
      {(completedCount ?? 0) > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-senior-xl font-semibold text-gray-900">
              Past Visits ({completedCount})
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/senior/bookings?tab=past">See all</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
