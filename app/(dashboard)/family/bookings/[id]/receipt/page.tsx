import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ReceiptCard } from "@/components/payments/receipt-card";
import { formatDate, formatTime } from "@/lib/utils";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { PaymentStatus } from "@/lib/payments/types";

export const metadata: Metadata = { title: "Booking Receipt" };

interface Props { params: { id: string } }

export default async function FamilyBookingReceiptPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "family") redirect("/login");

  const admin = createAdminClient();

  // Family can see receipts for bookings they created
  const { data: booking } = await admin
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      location_description, booked_by_profile_id,
      activity_type:activity_types(name),
      senior:profiles!bookings_senior_profile_id_fkey(first_name, last_name)
    `)
    .eq("id", params.id)
    .eq("booked_by_profile_id", profile.id)
    .single();

  if (!booking) notFound();

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, amount_cents, service_amount_cents, booking_fee_cents, platform_fee_cents, companion_payout_cents, currency, authorized_at, captured_at, cancelled_at")
    .eq("booking_id", params.id)
    .maybeSingle();

  const { data: refunds } = payment
    ? await admin
        .from("payment_refunds")
        .select("id, amount_cents, reason, status, created_at")
        .eq("payment_id", payment.id)
        .order("created_at")
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actType = (booking.activity_type as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const senior = (booking.senior as any);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/family/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to bookings
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Receipt</h1>
        <p className="text-gray-500 mt-1">
          {actType?.name ?? "Companion Visit"}
          {senior && ` · For ${senior.first_name} ${senior.last_name}`}
        </p>
      </div>

      {/* Booking summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3 text-senior-sm">
        <p className="font-semibold text-gray-800">Visit details</p>
        <div className="flex items-center gap-3 text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>{booking.scheduled_date ? formatDate(booking.scheduled_date as string) : "—"}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-600">
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>
            {booking.scheduled_start_time ? formatTime(booking.scheduled_start_time as string) : "—"}
            &nbsp;·&nbsp;{booking.duration_hours as number} hours
          </span>
        </div>
        <div className="flex items-start gap-3 text-gray-600">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span>{booking.location_description as string}</span>
        </div>
      </div>

      {/* Payment */}
      {payment ? (
        <ReceiptCard
          payment={{
            id: payment.id as string,
            status: payment.status as PaymentStatus,
            amountCents: payment.amount_cents as number,
            serviceAmountCents: payment.service_amount_cents as number,
            bookingFeeCents: payment.booking_fee_cents as number,
            platformFeeCents: payment.platform_fee_cents as number,
            companionPayoutCents: payment.companion_payout_cents as number,
            currency: payment.currency as string,
            authorizedAt: payment.authorized_at as string | null,
            capturedAt: payment.captured_at as string | null,
            cancelledAt: payment.cancelled_at as string | null,
          }}
          refunds={(refunds ?? []).map((r) => ({
            id: r.id as string,
            amountCents: r.amount_cents as number,
            reason: r.reason as string,
            createdAt: r.created_at as string,
            status: r.status as string,
          }))}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
          No payment record found for this booking.
        </div>
      )}
    </div>
  );
}
