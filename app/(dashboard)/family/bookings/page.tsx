import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/bookings/booking-card";
import { Calendar, Plus } from "lucide-react";
import type { BookingWithDetails } from "@/types";

export const metadata: Metadata = { title: "My Bookings" };

interface Props {
  searchParams: { tab?: string };
}

export default async function FamilyBookingsPage({ searchParams }: Props) {
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
  if (profile?.role !== "family") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const upcomingQuery = supabase
    .from("bookings")
    .select(`
      *,
      activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at),
      senior_profile:profiles!senior_profile_id(id, first_name, last_name)
    `)
    .eq("booked_by_profile_id", profile.id)
    .in("status", ["requested", "assigned", "accepted", "in_progress"])
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true });

  const pastQuery = supabase
    .from("bookings")
    .select(`
      *,
      activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at),
      senior_profile:profiles!senior_profile_id(id, first_name, last_name)
    `)
    .eq("booked_by_profile_id", profile.id)
    .in("status", ["completed", "cancelled", "declined"])
    .order("scheduled_date", { ascending: false });

  const [{ data: upcomingRaw }, { data: pastRaw }] = await Promise.all([
    upcomingQuery,
    pastQuery,
  ]);

  const upcoming = (upcomingRaw ?? []) as unknown as BookingWithDetails[];
  const past = (pastRaw ?? []) as unknown as BookingWithDetails[];

  const displayList = tab === "past" ? past : upcoming;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-senior-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-senior-lg text-gray-500 mt-1">
            Manage companion visits for your loved ones.
          </p>
        </div>
        <Button asChild>
          <Link href="/family/bookings/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Booking
          </Link>
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {[
          { key: "upcoming", label: `Upcoming (${upcoming.length})` },
          { key: "past",     label: `Past (${past.length})` },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={key === "upcoming" ? "/family/bookings" : "/family/bookings?tab=past"}
            role="tab"
            aria-selected={tab === key}
            className={`px-4 py-2.5 text-senior-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-sage-500 text-sage-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Booking list */}
      {displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-16 w-16 text-gray-200 mb-5" aria-hidden="true" />
          <h2 className="text-senior-xl font-semibold text-gray-500 mb-2">
            No {tab} bookings
          </h2>
          {tab === "upcoming" && (
            <>
              <p className="text-senior-base text-gray-400 mb-8 max-w-sm">
                Schedule a companion visit for one of your seniors.
              </p>
              <Button asChild size="lg">
                <Link href="/family/bookings/new">
                  <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                  Book a visit
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              basePath="/family/bookings"
              showSeniorName
            />
          ))}
        </div>
      )}
    </div>
  );
}
