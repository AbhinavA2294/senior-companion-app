import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, MapPin, FileText, ArrowLeft, User } from "lucide-react";

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      location_description, destination_address, transportation_mode,
      special_notes, companion_summary, total_amount, checked_in_at,
      checked_out_at, visit_note, is_first_booking, created_at,
      activity_types (name),
      companion_profiles!bookings_companion_profile_id_fkey (
        profiles!companion_profiles_profile_id_fkey (first_name, last_name)
      )
    `)
    .eq("id", params.id)
    .single();

  if (!booking) notFound();

  const companion = (booking.companion_profiles as any)?.profiles;
  const companionName = companion ? `${companion.first_name} ${companion.last_name}` : "Not yet assigned";
  const activity = (booking.activity_types as any)?.name ?? "Activity";

  const date = booking.scheduled_date
    ? new Date(booking.scheduled_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "Unknown date";

  const statusColors: Record<string, string> = {
    requested: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    assigned: "bg-purple-100 text-purple-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-gray-100 text-gray-700",
    needs_review: "bg-orange-100 text-orange-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const statusColor = statusColors[booking.status] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/senior/bookings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{activity}</h1>
          <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColor}`}>
            {booking.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Visit Details</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <span>{booking.scheduled_start_time ?? "TBD"} — {booking.duration_hours} hour{booking.duration_hours !== 1 ? "s" : ""}</span>
            </div>
            {booking.location_description && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span>{booking.location_description}</span>
              </div>
            )}
            {booking.destination_address && (
              <div className="flex items-start gap-3 text-gray-700">
                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{booking.destination_address}</span>
              </div>
            )}
            {booking.transportation_mode && (
              <div className="flex items-center gap-3 text-gray-700">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span>Transport: {booking.transportation_mode}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Companion</h2>
          <div className="flex items-center gap-3 text-gray-700 mt-3">
            <User className="h-5 w-5 text-gray-400" />
            <span>{companionName}</span>
          </div>
          {booking.companion_summary && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{booking.companion_summary}</p>
          )}
        </div>

        {booking.special_notes && (
          <div className="p-6 space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Special Notes</h2>
            <p className="text-gray-700 text-sm leading-relaxed mt-3">{booking.special_notes}</p>
          </div>
        )}

        {booking.visit_note && (
          <div className="p-6 space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Visit Note</h2>
            <p className="text-gray-700 text-sm leading-relaxed mt-3">{booking.visit_note}</p>
          </div>
        )}

        <div className="p-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total</span>
          <span className="text-lg font-bold text-gray-900">
            ${Number(booking.total_amount ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        {booking.status === "completed" || booking.status === "needs_review" ? (
          <Link
            href={`/senior/bookings/${params.id}/feedback`}
            className="flex-1 text-center bg-sage-600 hover:bg-sage-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Leave Feedback
          </Link>
        ) : null}
        <Link
          href={`/senior/bookings/${params.id}/receipt`}
          className="flex-1 text-center border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-medium transition-colors"
        >
          View Receipt
        </Link>
      </div>
    </div>
  );
}