"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueMockRefund } from "@/lib/actions/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, DollarSign } from "lucide-react";

interface Props {
  bookingId: string;
}

export function MockRefundForm({ bookingId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleIssue() {
    setError(null);
    startTransition(async () => {
      const result = await issueMockRefund({
        bookingId,
        amount: parseFloat(amount),
        reason,
      });
      if (result.success) {
        setSuccess(true);
        setShowForm(false);
        setShowConfirm(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-sm text-sage-700">
        <CheckCircle className="h-4 w-4 text-sage-500" />
        Mock refund issued successfully.
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Issue Mock Refund
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-white">
      <p className="text-sm font-medium text-gray-800">Issue Mock Refund</p>
      <p className="text-xs text-gray-500">This is a simulated refund for pilot tracking only. No real payment is processed.</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="refund-amount" className="text-xs">Amount ($)</Label>
        <Input
          id="refund-amount"
          type="number"
          min="0"
          max="10000"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="refund-reason" className="text-xs">Reason</Label>
        <Textarea
          id="refund-reason"
          rows={2}
          placeholder="Reason for refund..."
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
            disabled={!amount || !reason.trim() || parseFloat(amount) <= 0}
          >
            Continue
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            Confirm issuing a mock refund of ${parseFloat(amount).toFixed(2)}?
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleIssue} disabled={isPending}>
              {isPending ? "Issuing..." : "Confirm Refund"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
