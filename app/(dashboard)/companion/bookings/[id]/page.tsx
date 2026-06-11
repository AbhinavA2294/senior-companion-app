import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, FileText, Navigation } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { AssignmentActions } from "./_actions";

export const metadata: Metadata = { title: "Assignment Detail – Companion" };

interface Props {
  params: { id: string };
}

export default async function CompanionAssignmentDetailPage({ params }: Props) {
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

  // Fetch the assignment (RLS ensures it belongs to this companion)
  const { data: assignment } = await supabase
    .from("booking_assignments")
    .select(`
      id,
      status,
      assigned_at,
      responded_at,
      decline_reason,
      booking_id
    `)
    .eq("id", params.id)
    .eq("companion_profile_id", cp?.id ?? "")
    .single();

  if (!assignment) notFound();

  // Fetch booking details via admin client (companion RLS restricts direct booking access)
  const supabaseAdmin = createAdminClient();
  const { data: bookingData } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      scheduled_start_time,
      duration_hours,
      location_description,
      destination_address,
      special_notes,
      activity_type:activity_types(name, description)
    `)
    .eq("id", (assignment as any).booking_id ?? "")
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = bookingData as any;
  const isPending = assignment.status === "pending";
  const isApproved = cp?.verification_status === "approved";
  const statusVariant =
    assignment.status === "accepted"
      ? "success"
      : assignment.status === "declined"
      ? "secondary"
      : "warning";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/companion/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to booking requests
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900">
              {booking?.activity_type?.name ?? "Companion Visit"}
            </h1>
            <div className="mt-1">
              <Badge variant={statusVariant} className="capitalize">
                {(assignment.status as string).replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details — only minimum info shown */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-senior-base">Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {booking?.activity_type?.description && (
            <p className="text-sm text-gray-600">{booking.activity_type.description}</p>
          )}
          <div className="flex items-center gap-3 text-senior-base text-gray-700">
            <Calendar className="h-6 w-6 text-sage-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">Date</p>
              <p className="font-medium">
                {booking?.scheduled_date ? formatDate(booking.scheduled_date) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-senior-base text-gray-700">
            <Clock className="h-6 w-6 text-sage-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">Time</p>
              <p className="font-medium">
                {booking?.scheduled_start_time ? formatTime(booking.scheduled_start_time) : "—"}
                {booking?.duration_hours ? ` · ${booking.duration_hours} hour${booking.duration_hours !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-senior-base text-gray-700">
            <MapPin className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">Meeting address</p>
              <p className="font-medium">{booking?.location_description ?? "—"}</p>
            </div>
          </div>
          {booking?.destination_address && (
            <div className="flex items-start gap-3 text-senior-base text-gray-700">
              <Navigation className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-400">Destination</p>
                <p className="font-medium">{booking.destination_address}</p>
              </div>
            </div>
          )}
          {booking?.special_notes && (
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

      {/* Response section */}
      {isPending && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-senior-base">Your Response</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentActions assignmentId={params.id} isApproved={isApproved} />
          </CardContent>
        </Card>
      )}

      {assignment.status === "declined" && assignment.decline_reason && (
        <Card className="border-0 shadow-sm bg-gray-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Decline reason: </span>
              {assignment.decline_reason as string}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Support */}
      <Card className="border-0 shadow-sm border-sage-100 bg-sage-50">
        <CardContent className="pt-5 pb-5">
          <p className="text-senior-base font-medium text-sage-800 mb-1">Questions about this visit?</p>
          <p className="text-senior-lg font-bold text-sage-700">1-800-555-2273</p>
          <p className="text-sm text-gray-500">Monday–Friday, 8 AM–6 PM</p>
        </CardContent>
      </Card>
    </div>
  );
}
