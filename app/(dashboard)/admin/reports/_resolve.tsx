"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveIncidentReport } from "@/lib/actions/visit-lifecycle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface Props { incidentId: string; }

export function IncidentResolveForm({ incidentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleResolve() {
    setServerError(null);
    startTransition(async () => {
      const result = await resolveIncidentReport(incidentId, adminNotes);
      if (result.success) { router.refresh(); } else { setServerError(result.error); }
    });
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-sage-500" />
        Mark as Resolved
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-white">
      <p className="text-sm font-medium text-gray-800">Resolve this incident</p>
      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${incidentId}`}>Admin notes (optional)</Label>
        <Textarea id={`notes-${incidentId}`} rows={3} placeholder="Add notes about how this was resolved…" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} maxLength={1000} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleResolve} disabled={isPending} className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {isPending ? "Resolving…" : "Confirm Resolved"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} disabled={isPending}>Cancel</Button>
      </div>
    </div>
  );
}