import Link from "next/link";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "./booking-status-badge";
import { formatDate, formatTime } from "@/lib/utils";
import type { BookingWithDetails } from "@/types";

interface BookingCardProps {
  booking: BookingWithDetails;
  /** URL prefix to use for the detail link, e.g. "/family/bookings" */
  basePath: string;
  /** Show senior name (for family dashboard) */
  showSeniorName?: boolean;
}

export function BookingCard({ booking, basePath, showSeniorName }: BookingCardProps) {
  const canCancel = ["draft", "requested", "assigned"].includes(booking.status);
  const start = new Date(`${booking.scheduled_date}T${booking.scheduled_start_time}:00`);
  const isUpcoming = start > new Date() && booking.status !== "cancelled" && booking.status !== "declined";

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-senior-base text-gray-900">
              {booking.activity_type?.name ?? "Companion Visit"}
            </span>
            <BookingStatusBadge status={booking.status} />
          </div>
          {showSeniorName && booking.senior_profile && (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              {booking.senior_profile.first_name} {booking.senior_profile.last_name}
            </p>
          )}
        </div>
        {isUpcoming && (
          <span className="flex-shrink-0 text-xs font-medium text-sage-600 bg-sage-50 px-2 py-1 rounded-full">
            Upcoming
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-senior-sm text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          {formatDate(booking.scheduled_date)}
        </div>
        <div className="flex items-center gap-2 text-senior-sm text-gray-600">
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          {formatTime(booking.scheduled_start_time)} &mdash; {booking.duration_hours} hour
          {booking.duration_hours !== 1 ? "s" : ""}
        </div>
        {booking.location_description && (
          <div className="flex items-center gap-2 text-senior-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{booking.location_description}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`${basePath}/${booking.id}`}>View details</Link>
          </Button>
          {canCancel && start > new Date() && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${booking.id}?action=cancel`}>Cancel</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
