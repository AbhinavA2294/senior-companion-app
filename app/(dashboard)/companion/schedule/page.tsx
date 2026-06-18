import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My Schedule – Companion" };

export default async function CompanionSchedulePage() {
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
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  // Bookings where this companion is confirmed (companion_profile_id = cp.id)
  const today = new Date().toISOString().split("T")[0];

  const { data: upcoming } = await supabase
    .from("bookings")
    .select(`id, status, scheduled_date, scheduled_start_time, duration_hours, location_description, activity_type:activity_types(name)`)
    .eq("companion_profile_id", cp?.id ?? "")
    .in("status", ["accepted", "in_progress"])
    .gte("scheduled_date", today)
    .order("scheduled_date")
    .order("scheduled_start_time");

  const { data: completed } = await supabase
    .from("bookings")
    .select(`id, status, scheduled_date, scheduled_start_time, duration_hours, location_description, activity_type:activity_types(name)`)
    .eq("companion_profile_id", cp?.id ?? "")
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(10);

  // Fetch assignment IDs so upcoming rows can link to the check-in page
  const { data: acceptedAssignments } = await supabase
    .from("booking_assignments")
    .select("id, booking_id")
    .eq("companion_profile_id", cp?.id ?? "")
    .eq("status", "accepted");

  const assignmentByBookingId = new Map(
    (acceptedAssignments ?? []).map((a) => [a.booking_id as string, a.id as string])
  );

  function BookingRow({ booking, assignmentId }: { booking: Record<string, unknown>; assignmentId?: string }) {
    const activityType = booking.activity_type as Record<string, unknown> | null;
    const status = booking.status as string;
    const inner = (
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {(activityType?.name as string) ?? "Companion Visit"}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {booking.scheduled_date ? formatDate(booking.scheduled_date as string) : "—"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {booking.scheduled_start_time ? formatTime(booking.scheduled_start_time as string) : "—"}
              {booking.duration_hours ? ` · ${booking.duration_hours}h` : ""}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-xs">{(booking.location_description as string) ?? "—"}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={status === "completed" ? "success" : "warning"}
            className="capitalize"
          >
            {status.replace("_", " ")}
          </Badge>
          {assignmentId && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/companion/bookings/${assignmentId}`} className="flex items-center gap-1">
                View details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    );

    return (
      <li className="py-4 border-b border-gray-50 last:border-0">
        {inner}
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">My Schedule</h1>
        <p className="text-senior-lg text-gray-500">Upcoming and completed visits.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming visits</CardTitle>
        </CardHeader>
        <CardContent>
          {!upcoming || upcoming.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500">No upcoming visits</p>
              <p className="text-sm text-gray-400 mt-1">
                Accept an assignment from{" "}
                <Link href="/companion/bookings" className="underline text-sage-600">
                  Booking Requests
                </Link>{" "}
                to see visits here.
              </p>
            </div>
          ) : (
            <ul>
              {upcoming.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b as unknown as Record<string, unknown>}
                  assignmentId={assignmentByBookingId.get(b.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Completed visits</CardTitle>
        </CardHeader>
        <CardContent>
          {!completed || completed.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-400 text-sm">No completed visits yet</p>
            </div>
          ) : (
            <ul>
              {completed.map((b) => (
                <BookingRow key={b.id} booking={b as unknown as Record<string, unknown>} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
