import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { Calendar, Clock, MapPin, User, FileText, Navigation } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Booking, ActivityType, Profile } from "@/types";

export const metadata: Metadata = { title: "Booking Details" };

interface Props {
  params: { id: string };
}

export default async function FamilyBookingDetailPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (callerProfile?.role !== "family") redirect("/login");

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(`
      *,
      activity_type:activity_types(*),
      senior_profile:profiles!senior_profile_id(id, first_name, last_name)
    `)
    .eq("id", params.id)
    .eq("booked_by_profile_id", callerProfile.id)
    .single();

  if (!bookingRaw) notFound();

  const booking = bookingRaw as unknown as Booking & {
    activity_type: ActivityType;
    senior_profile: Pick<Profile, "id" | "first_name" | "last_name">;
  };

const today = new Date().toISOString().split("T")[0];
const cancellable =
  ["draft", "requested", "assigned"].includes(booking.status) &&
  booking.scheduled_date >= today;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/family/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to bookings
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900">
              {booking.activity_type?.name ?? "Companion Visit"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>
          {cancellable && (
            <CancelBookingButton
              bookingId={booking.id}
              redirectPath="/family/bookings"
            />
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {booking.senior_profile && (
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label="Senior"
              value={`${booking.senior_profile.first_name} ${booking.senior_profile.last_name}`}
            />
          )}
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Date"
            value={formatDate(booking.scheduled_date)}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="Time"
            value={`${formatTime(booking.scheduled_start_time)} — ${booking.duration_hours} hours`}
          />
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            label="Meeting address"
            value={booking.location_description}
          />
          {booking.destination_address && (
            <DetailRow
              icon={<Navigation className="h-4 w-4" />}
              label="Destination"
              value={booking.destination_address}
            />
          )}
          {booking.special_notes && (
            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label="Notes"
              value={booking.special_notes}
            />
          )}
        </CardContent>
      </Card>

      {/* Rebook button (for completed bookings) */}
      {booking.status === "completed" && (
        <Card className="border-0 shadow-sm bg-sage-50">
          <CardContent className="pt-5 pb-5">
            <p className="text-senior-sm font-medium text-sage-800 mb-3">
              Enjoyed this visit? Book the same activity again.
            </p>
            <Button asChild variant="default">
              <Link
                href={`/family/bookings/new?senior=${booking.senior_profile_id}&activity=${booking.activity_type_id}`}
              >
                Rebook this activity
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-senior-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}
