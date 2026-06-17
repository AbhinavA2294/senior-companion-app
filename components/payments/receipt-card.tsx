import { formatCents } from "@/lib/payments/payment-service";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, RefreshCw, AlertCircle } from "lucide-react";
import type { PaymentStatus } from "@/lib/payments/types";

interface RefundRow {
  id: string;
  amountCents: number;
  reason: string;
  createdAt: string;
  status: string;
}

interface ReceiptCardProps {
  payment: {
    id: string;
    status: PaymentStatus;
    amountCents: number;
    serviceAmountCents: number;
    bookingFeeCents: number;
    platformFeeCents: number;
    companionPayoutCents: number;
    currency: string;
    authorizedAt: string | null;
    capturedAt: string | null;
    cancelledAt: string | null;
  };
  refunds?: RefundRow[];
  showCompanionPayout?: boolean;
}

const STATUS_META: Record<
  PaymentStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive"; icon: React.ElementType }
> = {
  pending:            { label: "Pending",            variant: "warning",     icon: Clock },
  authorized:         { label: "Authorized",         variant: "warning",     icon: Clock },
  captured:           { label: "Payment complete",   variant: "success",     icon: CheckCircle },
  refunded:           { label: "Refunded",           variant: "secondary",   icon: RefreshCw },
  partially_refunded: { label: "Partially refunded", variant: "warning",     icon: RefreshCw },
  failed:             { label: "Payment failed",     variant: "destructive", icon: AlertCircle },
  cancelled:          { label: "Cancelled",          variant: "secondary",   icon: XCircle },
};

export function ReceiptCard({ payment, refunds = [], showCompanionPayout = false }: ReceiptCardProps) {
  const meta = STATUS_META[payment.status] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;

  const totalRefunded = refunds
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="font-semibold text-gray-900 text-senior-sm">Payment</span>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      {/* Line items */}
      <div className="p-4 space-y-2 text-senior-sm">
        <ReceiptLine
          label={`Service (${Math.round(payment.serviceAmountCents / 3500)} hr × $35.00/hr)`}
          value={formatCents(payment.serviceAmountCents)}
        />
        <ReceiptLine label="Booking fee" value={formatCents(payment.bookingFeeCents)} />
        <div className="border-t border-gray-100 pt-2">
          <ReceiptLine label="Total charged" value={formatCents(payment.amountCents)} bold />
        </div>

        {showCompanionPayout && (
          <div className="border-t border-gray-100 pt-2">
            <ReceiptLine
              label="Your payout"
              value={formatCents(payment.companionPayoutCents)}
              highlight
            />
          </div>
        )}

        {totalRefunded > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <ReceiptLine
              label="Total refunded"
              value={`− ${formatCents(totalRefunded)}`}
              muted
            />
            <ReceiptLine
              label="Net charged"
              value={formatCents(Math.max(0, payment.amountCents - totalRefunded))}
              bold
            />
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="px-4 py-3 text-xs text-gray-400 space-y-1">
        {payment.authorizedAt && (
          <p>Authorized: {new Date(payment.authorizedAt).toLocaleString()}</p>
        )}
        {payment.capturedAt && (
          <p>Captured: {new Date(payment.capturedAt).toLocaleString()}</p>
        )}
        {payment.cancelledAt && (
          <p>Cancelled: {new Date(payment.cancelledAt).toLocaleString()}</p>
        )}
      </div>

      {/* Refunds list */}
      {refunds.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Refunds
          </p>
          <ul className="space-y-2">
            {refunds.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 text-senior-sm"
              >
                <div>
                  <p className="font-medium text-gray-700">{formatCents(r.amountCents)}</p>
                  <p className="text-xs text-gray-500">{r.reason}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={r.status === "succeeded" ? "success" : "warning"}
                  className="capitalize flex-shrink-0"
                >
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 py-3 bg-gray-50 rounded-b-xl">
        <p className="text-xs text-gray-400">
          Payment ID: {payment.id.slice(0, 8)}…
          &nbsp;·&nbsp;
          {payment.currency.toUpperCase()}
          &nbsp;·&nbsp;
          Mock provider (test mode)
        </p>
      </div>
    </div>
  );
}

function ReceiptLine({
  label,
  value,
  bold = false,
  muted = false,
  highlight = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={muted ? "text-gray-400" : highlight ? "text-sage-700 font-medium" : "text-gray-600"}>
        {label}
      </span>
      <span
        className={
          bold
            ? "font-bold text-gray-900"
            : highlight
            ? "font-bold text-sage-700"
            : "text-gray-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
