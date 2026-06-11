import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, FileText, Navigation, UserCheck } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { AssignCompanionsForm } from "./_assign";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";

export const metadata: Metadata = { title: "Booking Detail – Admin" };

interface Props {
  params: { id: string };
}

export default async function AdminBookingDetailPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (adminProfile?.role !== "admin") redirect("/login");

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      location_description, destination_address, special_notes,
      activity_type:activity_types(name),
      senior:profiles!bookings_senior_profile_id_fkey(id, first_name, last_name, city, state)
    `)
    .eq("id", params.id)
    .single();

  if (!bookingRaw) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = bookingRaw as any;

  // Current assignments for this booking
  const { data: assignments } = await supabase
    .from("booking_assignments")
    .select(`
      id, status, assigned_at, responded_at, decline_reason,
      companion:companion_profiles(
        id,
        max_travel_miles,
        profile:profiles(first_name, last_name, city, state)
      )
    `)
    .eq("booking_id", params.id)
    .order("assigned_at");

  // Approved companions for assignment (only if booking is in assignable state)
  let approvedCompanions: Array<{ id: string; name: string; city: string | null; state: string | null; max_travel_miles: number }> = [];
  const canAssign = ["requested", "assigned"].includes(booking.status as string);

  if (canAssign) {
    const { data: cps } = await supabase
      .from("companion_profiles")
      .select(`id, max_travel_miles, profile:profiles(first_name, last_name, city, state)`)
      .eq("verification_status", "approved");

    if (cps) {
      approvedCompanions = cps.map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = c.profile as any;
        return {
          id: c.id,
          name: p ? `${p.first_name} ${p.last_name}` : "Unknown",
          city: p?.city ?? null,
          state: p?.state ?? null,
          max_travel_miles: c.max_travel_miles,
        };
      });
    }
  }

  const alreadyAssignedIds = (assignments ?? []).map((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (a.companion as any)?.id as string;
  }).filter(Boolean);

  const actType = booking.activity_type;
  const senior = booking.senior;

  const assignmentStatusVariant = (s: string) =>
    s === "accepted" ? ("success" as const) : s === "declined" ? ("secondary" as const) : ("warning" as const);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to bookings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900">
              {actType?.name ?? "Companion Visit"}
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              For: {senior ? `${senior.first_name} ${senior.last_name}` : "—"}
            </p>
            <div className="mt-1">
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Booking details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-senior-base">Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-senior-base text-gray-700">
            <Calendar className="h-6 w-6 text-sage-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">Date</p>
              <p className="font-medium">
                {booking.scheduled_date ? formatDate(booking.scheduled_date) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-senior-base text-gray-700">
            <Clock className="h-6 w-6 text-sage-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">Time</p>
              <p className="font-medium">
                {booking.scheduled_start_time ? formatTime(booking.scheduled_start_time) : "—"}
                {booking.duration_hours ? ` · ${booking.duration_hours} hours` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-senior-base text-gray-700">
            <MapPin className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">Meeting address</p>
              <p className="font-medium">{booking.location_description ?? "—"}</p>
            </div>
          </div>
          {booking.destination_address && (
            <div className="flex items-start gap-3 text-senior-base text-gray-700">
              <Navigation className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-400">Destination</p>
                <p className="font-medium">{booking.destination_address}</p>
              </div>
            </div>
          )}
          {booking.special_notes && (
            <div className="flex items-start gap-3 text-senior-base text-gray-700">
              <FileText className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-400">Notes</p>
                <p className="font-medium">{booking.special_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current assignments */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Companion Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!assignments || assignments.length === 0 ? (
            <p className="text-sm text-gray-500 py-3">No companions assigned yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {assignments.map((a) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = a.companion as any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cp = c?.profile as any;
                const name = cp ? `${cp.first_name} ${cp.last_name}` : "Unknown";
                return (
                  <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{name}</p>
                      <p className="text-xs text-gray-400">
                        Assigned {new Date(a.assigned_at).toLocaleDateString()}
                        {a.decline_reason ? ` · Reason: ${a.decline_reason}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={assignmentStatusVariant(a.status as string)}
                      className="capitalize flex-shrink-0"
                    >
                      {a.status as string}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Assign companions */}
      {canAssign && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Assign Companions</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignCompanionsForm
              bookingId={params.id}
              approvedCompanions={approvedCompanions}
              alreadyAssignedIds={alreadyAssignedIds}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
