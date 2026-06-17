import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceiptCard } from "@/components/payments/receipt-card";
import { formatCents } from "@/lib/payments/payment-service";
import { DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/payments/types";

export const metadata: Metadata = { title: "My Earnings – Companion" };

export default async function CompanionEarningsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "companion") redirect("/login");

  const admin = createAdminClient();

  const { data: cp } = await admin
    .from("companion_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .single();
  if (!cp) redirect("/companion");

  const { data: bookings } = await admin
    .from("bookings")
    .select(`
      id, status, scheduled_date, duration_hours,
      activity_type:activity_types(name)
    `)
    .eq("companion_profile_id", cp.id)
    .in("status", ["completed", "in_progress", "accepted", "assigned"])
    .order("scheduled_date", { ascending: false });

  const bookingIds = (bookings ?? []).map((b) => b.id as string);

  const { data: payments } = bookingIds.length > 0
    ? await admin
        .from("payments")
        .select("id, booking_id, status, amount_cents, service_amount_cents, booking_fee_cents, platform_fee_cents, companion_payout_cents, currency, authorized_at, captured_at, cancelled_at")
        .in("booking_id", bookingIds)
    : { data: [] };

  const paymentByBooking = Object.fromEntries(
    (payments ?? []).map((p) => [p.booking_id as string, p])
  );

  const capturedPayments = (payments ?? []).filter((p) => p.status === "captured");
  const pendingPayments = (payments ?? []).filter(
    (p) => p.status === "authorized" || p.status === "pending"
  );

  const totalEarnedCents = capturedPayments.reduce(
    (sum, p) => sum + (p.companion_payout_cents as number),
    0
  );
  const pendingEarnedCents = pendingPayments.reduce(
    (sum, p) => sum + (p.companion_payout_cents as number),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/companion" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-gray-500 mt-1">Your payout history from completed visits.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total earned"
          value={formatCents(totalEarnedCents)}
          sub="from completed visits"
          color="sage"
        />
        <SummaryCard
          icon={Clock}
          label="Pending payout"
          value={formatCents(pendingEarnedCents)}
          sub="awaiting visit completion"
          color="amber"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Visits completed"
          value={String(capturedPayments.length)}
          sub="with payment captured"
          color="blue"
        />
      </div>

      {/* Earnings list */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-senior-base">Booking payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No bookings with payment records yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {bookings.map((b) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const actType = (b.activity_type as any);
                const payment = paymentByBooking[b.id as string];

                return (
                  <li key={b.id as string} className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {actType?.name ?? "Companion Visit"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b.scheduled_date ? formatDate(b.scheduled_date as string) : "—"}
                          &nbsp;·&nbsp;
                          {b.duration_hours as number}h
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {payment ? (
                          <>
                            <p className="font-bold text-sage-700 text-sm">
                              {formatCents(payment.companion_payout_cents as number)}
                            </p>
                            <PaymentStatusBadge status={payment.status as PaymentStatus} />
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No payment</span>
                        )}
                      </div>
                    </div>

                    {payment && payment.status === "captured" && (
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
                        showCompanionPayout
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <strong>Mock payment mode:</strong> Payouts shown are estimates using the mock provider.
        Actual disbursements will be processed via Stripe Connect when live payments are enabled.
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variants: Record<PaymentStatus, "success" | "warning" | "secondary"> = {
    captured: "success",
    authorized: "warning",
    pending: "warning",
    refunded: "secondary",
    partially_refunded: "warning",
    failed: "secondary",
    cancelled: "secondary",
  };
  const labels: Record<PaymentStatus, string> = {
    captured: "Paid",
    authorized: "Authorized",
    pending: "Pending",
    refunded: "Refunded",
    partially_refunded: "Part. refunded",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return (
    <Badge variant={variants[status]} className="text-xs mt-0.5">
      {labels[status]}
    </Badge>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: "sage" | "amber" | "blue";
}) {
  const bg = { sage: "bg-sage-50 text-sage-600", amber: "bg-amber-50 text-amber-600", blue: "bg-blue-50 text-blue-600" }[color];
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${bg}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="font-display text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-xs text-gray-400">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
