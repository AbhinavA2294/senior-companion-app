"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToAssignment } from "@/lib/actions/booking-assignments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

type Props = {
  assignmentId: string;
  isApproved: boolean;
};

export function AssignmentActions({ assignmentId, isApproved }: Props) {
  const router = useRouter();
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setServerError(null);
    startTransition(async () => {
      const result = await respondToAssignment(assignmentId, "accepted");
      if (result.success) {
        router.push("/companion/bookings");
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  function handleDecline() {
    setServerError(null);
    startTransition(async () => {
      const result = await respondToAssignment(assignmentId, "declined", declineReason || undefined);
      if (result.success) {
        router.push("/companion/bookings");
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  if (!isApproved) {
    return (
      <div className="rounded-xl bg-warm-50 border border-warm-200 p-4 text-sm text-warm-800">
        You must be an approved companion to accept booking requests.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      {!showDeclineForm ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleAccept} size="lg" disabled={isPending} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Accepting…" : "Accept Assignment"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowDeclineForm(true)}
            disabled={isPending}
            className="flex items-center gap-2 text-destructive border-destructive hover:bg-destructive hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Decline
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4">
          <p className="font-medium text-gray-800 text-sm">Decline this assignment</p>
          <div>
            <Label htmlFor="decline_reason">Reason (optional)</Label>
            <Textarea
              id="decline_reason"
              className="mt-1"
              rows={2}
              placeholder="e.g. Unavailable on that date, not my service area…"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isPending}
            >
              {isPending ? "Declining…" : "Confirm Decline"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDeclineForm(false)}
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
