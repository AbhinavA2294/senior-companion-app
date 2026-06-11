"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignCompanionsToBooking } from "@/lib/actions/booking-assignments";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, UserCheck } from "lucide-react";

type Companion = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  max_travel_miles: number;
};

type Props = {
  bookingId: string;
  approvedCompanions: Companion[];
  alreadyAssignedIds: string[];
};

export function AssignCompanionsForm({ bookingId, approvedCompanions, alreadyAssignedIds }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleAssign() {
    if (!selected.length) return;
    setServerError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await assignCompanionsToBooking(bookingId, selected);
      if (result.success) {
        setSuccess(true);
        setSelected([]);
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  const available = approvedCompanions.filter((c) => !alreadyAssignedIds.includes(c.id));

  return (
    <div className="space-y-4">
      {success && (
        <Alert variant="info">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <p>Companions assigned successfully.</p>
        </Alert>
      )}
      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      {available.length === 0 ? (
        <p className="text-sm text-gray-500">
          No additional approved companions available to assign.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Select one or more approved companions to offer this booking to.
          </p>
          <ul className="space-y-2">
            {available.map((c) => {
              const isSelected = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:border-sage-500 has-[:checked]:bg-sage-50">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 text-sage-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">
                        {c.city && c.state ? `${c.city}, ${c.state}` : "Location not set"}
                        {" · "}
                        {c.max_travel_miles} mi radius
                      </p>
                    </div>
                    {isSelected && (
                      <UserCheck className="h-4 w-4 text-sage-600 flex-shrink-0" aria-hidden="true" />
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          <Button
            onClick={handleAssign}
            disabled={isPending || !selected.length}
            className="flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            {isPending
              ? "Assigning…"
              : `Assign ${selected.length > 0 ? `${selected.length} ` : ""}Companion${selected.length !== 1 ? "s" : ""}`}
          </Button>
        </>
      )}
    </div>
  );
}
