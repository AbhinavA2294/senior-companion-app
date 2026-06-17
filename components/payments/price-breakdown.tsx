import { formatCents } from "@/lib/payments/payment-service";
import type { BookingCost } from "@/lib/payments/types";

interface Props {
  cost: BookingCost;
  showCompanionPayout?: boolean;
  className?: string;
}

export function PriceBreakdown({ cost, showCompanionPayout = false, className = "" }: Props) {
  return (
    <div className={`rounded-xl border border-sage-100 bg-sage-50 p-4 space-y-2 text-senior-sm ${className}`}>
      <p className="font-semibold text-gray-800 mb-3">Pricing summary</p>

      <div className="space-y-1.5">
        <PriceLine
          label={`${cost.durationHours} hr × ${formatCents(cost.hourlyRateCents)}/hr`}
          value={formatCents(cost.serviceAmountCents)}
        />
        <PriceLine label="Booking fee" value={formatCents(cost.bookingFeeCents)} />
        <div className="border-t border-sage-200 pt-2 mt-2">
          <PriceLine
            label="Total"
            value={formatCents(cost.totalAmountCents)}
            bold
          />
        </div>
      </div>

      {showCompanionPayout && (
        <div className="border-t border-sage-200 pt-2 mt-1 space-y-1">
          <PriceLine
            label="Your estimated payout"
            value={formatCents(cost.companionPayoutCents)}
            muted={false}
          />
          <p className="text-xs text-gray-500">
            Payout is released after the visit is marked complete.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 pt-1">
        Payment is authorized now and captured after your visit completes.
        No charge is made until then.
      </p>
    </div>
  );
}

function PriceLine({
  label,
  value,
  bold = false,
  muted = true,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={muted ? "text-gray-500" : "text-gray-700"}>{label}</span>
      <span className={bold ? "font-bold text-gray-900" : "font-medium text-gray-800"}>
        {value}
      </span>
    </div>
  );
}
