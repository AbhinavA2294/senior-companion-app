import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, FileText, Navigation, UserCheck, CheckCircle, LogOut, AlertTriangle } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { AssignCompanionsForm } from "./_assign";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { InternalNotes } from "@/components/admin/internal-notes";
import { ReceiptCard } from "@/components/payments/receipt-card";
import { PaymentRefundForm } from "@/components/payments/refund-form";
import { MatchingPanel } from "@/components/admin/matching-panel";
import { MATCHING_CONFIG } from "@/lib/matching/config";
import type { PaymentStatus } from "@/lib/payments/types";

export const metadata: Metadata = { title: "Booking Detail – Admin" };

interface Props { params: { id: string }; }

export default async function AdminBookingDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (adminProfile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const { data: bookingRaw } = await admin
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      location_description, destination_address, special_notes,
      checked_in_at, checked_out_at, late_checkin_flag, late_checkout_flag,
      visit_note, needs_review_reason,
      activity_type:activity_types(name),
      senior:profiles!bookings_senior_profile_id_fkey(id, first_name, last_name, city, state)
    `)
    .eq("id", params.id)
    .single();

  if (!bookingRaw) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = bookingRaw as any;

  const { data: assignments } = await admin
    .from("booking_assignments")
    .select(`
      id, status, assigned_at, responded_at, decline_reason,
      companion:companion_profiles(id, profile:profiles(first_name, last_name, city, state))
    `)
    .eq("booking_id", params.id)
    .order("assigned_at");

  const { data: statusHistory } = await admin
    .from("booking_status_history")
    .select("id, status, notes, created_at, changed_by:profiles(first_name, last_name)")
    .eq("booking_id", params.id)
    .order("created_at", { ascending: false });

  const { data: internalNotes } = await admin
    .from("internal_notes")
    .select("id, note, created_at, author:profiles(first_name, last_name)")
    .eq("entity_type", "booking")
    .eq("entity_id", params.id)
    .order("created_at", { ascending: false });

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
        .order("created_at", { ascending: false })
    : { data: [] };

  let approvedCompanions: Array<{ id: string; name: string; city: string | null; state: string | null; max_travel_miles: number }> = [];
  const canAssign = ["requested", "assigned"].includes(booking.status as string);

  if (canAssign) {
    const { data: cps } = await admin
      .from("companion_profiles")
      .select("id, max_travel_miles, profile:profiles(first_name, last_name, city, state)")
      .eq("verification_status", "approved");

    if (cps) {
      approvedCompanions = cps.map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = c.profile as any;
        return { id: c.id, name: p ? `${p.first_name} ${p.last_name}` : "Unknown", city: p?.city ?? null, state: p?.state ?? null, max_travel_miles: c.max_travel_miles };
      });
    }
  }

  const alreadyAssignedIds = (assignments ?? []).map((a) => (a.companion as any)?.id as string).filter(Boolean);
  const actType = booking.activity_type;
  const senior = booking.senior;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = (internalNotes ?? []).map((n: any) => ({
    id: n.id as string,
    note: n.note as string,
    created_at: n.created_at as string,
    author: n.author as { first_name: string; last_name: string } | null,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">← Back to bookings</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900">{actType?.name ?? "Companion Visit"}</h1>
            <p className="text-gray-500 mt-0.5 text-sm">For: {senior ? `${senior.first_name} ${senior.last_name}` : "—"}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <BookingStatusBadge status={booking.status} />
              {booking.late_checkin_flag && <Badge variant="warning" className="text-xs">Late check-in</Badge>}
              {booking.late_checkout_flag && <Badge variant="warning" className="text-xs">Late check-out</Badge>}
            </div>
          </div>
        </div>
      </div>

      {booking.needs_review_reason && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">Needs Review</p>
              <p className="text-sm text-orange-700 mt-0.5">{booking.needs_review_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Visit details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-senior-base">Visit Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Calendar className="h-6 w-6 text-sage-500 flex-shrink-0" />
            <div><p className="text-xs text-gray-400">Date</p><p className="font-medium">{booking.scheduled_date ? formatDate(booking.scheduled_date) : "—"}</p></div>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Clock className="h-6 w-6 text-sage-500 flex-shrink-0" />
            <div><p className="text-xs text-gray-400">Time</p><p className="font-medium">{booking.scheduled_start_time ? formatTime(booking.scheduled_start_time) : "—"}{booking.duration_hours ? ` · ${booking.duration_hours} hours` : ""}</p></div>
          </div>
          <div className="flex items-start gap-3 text-gray-700">
            <MapPin className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" />
            <div><p className="text-xs text-gray-400">Meeting address</p><p className="font-medium">{booking.location_description ?? "—"}</p></div>
          </div>
          {booking.destination_address && (
            <div className="flex items-start gap-3 text-gray-700">
              <Navigation className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" />
              <div><p className="text-xs text-gray-400">Destination</p><p className="font-medium">{booking.destination_address}</p></div>
            </div>
          )}
          {booking.special_notes && (
            <div className="flex items-start gap-3 text-gray-700">
              <FileText className="h-6 w-6 text-sage-500 flex-shrink-0 mt-0.5" />
              <div><p className="text-xs text-gray-400">Notes</p><p className="font-medium">{booking.special_notes}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit timeline */}
      {(booking.checked_in_at || booking.checked_out_at) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-senior-base">Visit Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {booking.checked_in_at && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                <span>Checked in: <span className="font-medium">{new Date(booking.checked_in_at).toLocaleString()}</span>
                  {booking.late_checkin_flag && <Badge variant="warning" className="ml-2 text-xs">Late</Badge>}
                </span>
              </div>
            )}
            {booking.checked_out_at && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <LogOut className="h-4 w-4 text-sage-500 flex-shrink-0" />
                <span>Checked out: <span className="font-medium">{new Date(booking.checked_out_at).toLocaleString()}</span>
                  {booking.late_checkout_flag && <Badge variant="warning" className="ml-2 text-xs">Late</Badge>}
                </span>
              </div>
            )}
            {booking.visit_note && (
              <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs text-gray-400 mb-1">Visit note</p>
                <p className="text-sm text-gray-700">{booking.visit_note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignments */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-sage-600" />Companion Assignments</CardTitle></CardHeader>
        <CardContent>
          {!assignments || assignments.length === 0 ? (
            <p className="text-sm text-gray-500 py-3">No companions assigned yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {assignments.map((a) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = (a.companion as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cp = c?.profile as any;
                const name = cp ? `${cp.first_name} ${cp.last_name}` : "Unknown";
                const variant = a.status === "accepted" ? ("success" as const) : a.status === "declined" ? ("secondary" as const) : ("warning" as const);
                return (
                  <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{name}</p>
                      <p className="text-xs text-gray-400">Assigned {new Date(a.assigned_at).toLocaleDateString()}{a.decline_reason ? ` · Reason: ${a.decline_reason}` : ""}</p>
                    </div>
                    <Badge variant={variant} className="capitalize flex-shrink-0">{a.status as string}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* AI-assisted companion matching */}
      {canAssign && MATCHING_CONFIG.enabled && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Companion Matching</span>
              <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                AI-assisted
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MatchingPanel bookingId={params.id} />
          </CardContent>
        </Card>
      )}

      {/* Assign companions (manual fallback) */}
      {canAssign && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Assign Companions</CardTitle></CardHeader>
          <CardContent>
            <AssignCompanionsForm bookingId={params.id} approvedCompanions={approvedCompanions} alreadyAssignedIds={alreadyAssignedIds} />
          </CardContent>
        </Card>
      )}

      {/* Status history */}
      {statusHistory && statusHistory.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-senior-base">Status History</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {statusHistory.map((h) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const changer = (h.changed_by as any);
                return (
                  <li key={h.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-sage-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{(h.status as string).replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400">
                        {changer ? `${changer.first_name} ${changer.last_name}` : "System"} · {new Date(h.created_at).toLocaleString()}
                      </p>
                      {h.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{h.notes as string}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Payment */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-senior-base">Payment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {payment ? (
            <>
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
              {["captured", "partially_refunded"].includes(payment.status as string) && (
                <PaymentRefundForm
                  paymentId={payment.id as string}
                  maxAmountCents={payment.amount_cents as number}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No payment record for this booking.</p>
          )}
        </CardContent>
      </Card>

      {/* Internal notes */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <InternalNotes entityType="booking" entityId={params.id} existingNotes={notes} />
        </CardContent>
      </Card>
    </div>
  );
}
