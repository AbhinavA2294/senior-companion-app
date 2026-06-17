"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueRefund } from "@/lib/actions/payments";
import { formatCents, centsFromDollars } from "@/lib/payments/payment-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, DollarSign } from "lucide-react";

interface Props {
  paymentId: string;
  maxAmountCents: number;
}

export function PaymentRefundForm({ paymentId, maxAmountCents }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const isValidAmount = amountCents > 0 && amountCents <= maxAmountCents;

  function handleIssue() {
    setError(null);
    startTransition(async () => {
      const result = await issueRefund({
        paymentId,
        amountCents,
        reason,
      });
      if (result.success) {
        setSuccess(true);
        setShowForm(false);
        setShowConfirm(false);
        router.refresh();
      } else {
        setError(result.error);
        setShowConfirm(false);
      }
    });
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-sm text-sage-700">
        <CheckCircle className="h-4 w-4 text-sage-500" />
        Refund issued successfully.
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2"
      >
        <DollarSign className="h-4 w-4" />
        Issue Refund
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-white">
      <p className="text-sm font-medium text-gray-800">Issue Refund</p>
      <p className="text-xs text-gray-500">
        Maximum refundable: <strong>{formatCents(maxAmountCents)}</strong>. This uses the mock
        payment provider — no real funds are moved.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="refund-amount" className="text-xs">
          Amount ($)
        </Label>
        <Input
          id="refund-amount"
          type="number"
          min="0.01"
          max={(maxAmountCents / 100).toFixed(2)}
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-36"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="refund-reason" className="text-xs">
          Reason
        </Label>
        <Textarea
          id="refund-reason"
          rows={2}
          placeholder="Reason for refund…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </div>

      {!showConfirm ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={!isValidAmount || !reason.trim()}
          >
            Continue
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            Confirm refund of {formatCents(amountCents)}?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleIssue} disabled={isPending}>
              {isPending ? "Processing…" : "Confirm Refund"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
