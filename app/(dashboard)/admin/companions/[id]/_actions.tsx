"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompanionStatus } from "@/lib/actions/booking-assignments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, PauseCircle, PlayCircle } from "lucide-react";
import type { CompanionVerificationStatus } from "@/types";

type Props = {
  companionProfileId: string;
  currentStatus: CompanionVerificationStatus;
};

export function CompanionStatusActions({ companionProfileId, currentStatus }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function applyStatus(newStatus: CompanionVerificationStatus) {
    setServerError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateCompanionStatus(companionProfileId, newStatus, notes || undefined);
      if (result.success) {
        setSuccess(`Status updated to ${newStatus.replace("_", " ")}.`);
        setNotes("");
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  const isApproved = currentStatus === "approved";
  const isSuspended = currentStatus === "suspended";
  const isRejected = currentStatus === "rejected";
  const isPendingOrReview = currentStatus === "pending" || currentStatus === "under_review";

  return (
    <div className="space-y-4">
      {success && (
        <Alert variant="info">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <p>{success}</p>
        </Alert>
      )}
      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <div>
        <Label htmlFor="status-notes">Admin notes (optional)</Label>
        <Textarea
          id="status-notes"
          className="mt-1"
          rows={2}
          placeholder="Reason for this status change…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {!isApproved && !isSuspended && (
          <Button
            onClick={() => applyStatus("approved")}
            disabled={isPending}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Approve
          </Button>
        )}

        {currentStatus !== "under_review" && !isApproved && !isSuspended && !isRejected && (
          <Button
            variant="outline"
            onClick={() => applyStatus("under_review")}
            disabled={isPending}
          >
            Mark Under Review
          </Button>
        )}

        {!isRejected && !isApproved && !isSuspended && (
          <Button
            variant="outline"
            onClick={() => applyStatus("rejected")}
            disabled={isPending}
            className="flex items-center gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        )}

        {isApproved && (
          <Button
            variant="outline"
            onClick={() => applyStatus("suspended")}
            disabled={isPending}
            className="flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <PauseCircle className="h-4 w-4" aria-hidden="true" />
            Suspend
          </Button>
        )}

        {isSuspended && (
          <Button
            onClick={() => applyStatus("approved")}
            disabled={isPending}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Reactivate
          </Button>
        )}

        {(isRejected || isSuspended) && (
          <Button
            variant="ghost"
            onClick={() => applyStatus("pending")}
            disabled={isPending}
          >
            Reset to Pending
          </Button>
        )}

        {isPendingOrReview && (
          <Button
            variant="outline"
            onClick={() => applyStatus("rejected")}
            disabled={isPending}
            className="flex items-center gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}
