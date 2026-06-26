import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { hasFeedbackBeenSubmitted } from "@/lib/actions/feedback";
import { Calendar, Clock, MapPin, FileText, Navigation } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { Booking, ActivityType } from "@/types";
import { getServerTranslation } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Visit Details" };

interface Props {
  params: { id: string };
}

export default async function SeniorBookingDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "senior") redirect("/login");

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(`*, activity_type:activity_types(*)`)
    .eq("id", params.id)
    .eq("senior_profile_id", profile.id)
    .single();

  if (!bookingRaw) notFound();

  const booking = bookingRaw as unknown as Booking & { activity_type: ActivityType };
  const bookingStart = new Date(`${booking.scheduled_date}T${booking.scheduled_start_time}:00`);
  const cancellable =
    ["draft", "requested", "assigned"].includes(booking.status) && bookingStart > new Date();

  const alreadyRated = booking.status === "completed"
    ? await hasFeedbackBeenSubmitted(params.id, profile.id)
    : false;

  const { t } = getServerTranslation();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/senior/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← {t("seniorBookings.detailBack")}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900">
              {booking.activity_type?.name ?? t("bookingCard.companionVisit")}
            </h1>
            <div className="mt-1">
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>
          {cancellable && (
            <CancelBookingButton bookingId={booking.id} redirectPath="/senior/bookings" />
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-senior-base">{t("seniorBookings.detailTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-senior-base text-gray-700">
            <Calendar className="h-6 w-6 text-sage-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">{t("seniorBookings.date")}</p>
              <p className="font-medium">{formatDate(booking.scheduled_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-senior-base text-gray-700">
            <Clock className="h-6 w-6 text-sage-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">{t("seniorBookings.time")}</p>
              <p className="font-medium">
                {formatTime(booking.scheduled_start_time)} &mdash;{" "}
                {booking.duration_hours} {booking.duration_hours !== 1 ? t("common.hours") : t("common.hour")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-senior-base text-gray-700">
            <MapPin className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-400">{t("seniorBookings.meetingAddress")}</p>
              <p className="font-medium">{booking.location_description}</p>
            </div>
          </div>
          {booking.destination_address && (
            <div className="flex items-start gap-3 text-senior-base text-gray-700">
              <Navigation className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-400">{t("seniorBookings.destination")}</p>
                <p className="font-medium">{booking.destination_address}</p>
              </div>
            </div>
          )}
          {booking.special_notes && (
            <div className="flex items-start gap-3 text-senior-base text-gray-700">
              <FileText className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-400">{t("seniorBookings.notes")}</p>
                <p className="font-medium">{booking.special_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {booking.status === "completed" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-5">
            {alreadyRated ? (
              <div>
                <p className="text-senior-base font-medium text-gray-800 mb-1">
                  Feedback submitted
                </p>
                <p className="text-sm text-gray-500">
                  Thank you for rating this visit!
                </p>
              </div>
            ) : (
              <div>
                <p className="text-senior-base font-medium text-gray-800 mb-3">
                  How was your visit?
                </p>
                <Button asChild size="lg">
                  <Link href={`/senior/bookings/${booking.id}/feedback`}>
                    ⭐ Rate this visit
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {booking.status === "completed" && (
        <Card className="border-0 shadow-sm bg-sage-50">
          <CardContent className="pt-5 pb-5">
            <p className="text-senior-base font-medium text-sage-800 mb-3">
              {t("seniorBookings.rebook")}
            </p>
            <Button asChild size="lg">
              <Link href="/senior/bookings/new">{t("seniorBookings.bookAnother")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm border-sage-100 bg-sage-50">
        <CardContent className="pt-5 pb-5">
          <p className="text-senior-base font-medium text-sage-800 mb-1">{t("seniorBookings.needHelp")}</p>
          <p className="text-senior-lg font-bold text-sage-700">1-800-555-2273</p>
          <p className="text-sm text-gray-500">{t("seniorBookings.supportHours")}</p>
        </CardContent>
      </Card>
    </div>
  );
}