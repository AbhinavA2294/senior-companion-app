"use client";

import { useState, useTransition } from "react";
import { submitIncidentReport, type IncidentFormData } from "@/lib/actions/visit-lifecycle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle, Phone, CheckCircle } from "lucide-react";

const CATEGORIES: { value: IncidentFormData["category"]; label: string }[] = [
  { value: "senior_did_not_answer", label: "Senior did not answer" },
  { value: "companion_delayed", label: "Companion delayed" },
  { value: "senior_felt_unwell", label: "Senior felt unwell" },
  { value: "transportation_issue", label: "Transportation issue" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "inappropriate_behavior", label: "Inappropriate behavior" },
  { value: "lost_property", label: "Lost property" },
  { value: "other", label: "Other" },
];

const SEVERITIES: { value: IncidentFormData["severity"]; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface Props {
  bookingId: string;
  onSuccess?: () => void;
}

export function IncidentReportForm({ bookingId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<IncidentFormData["category"]>("other");
  const [severity, setSeverity] = useState<IncidentFormData["severity"]>("low");
  const [description, setDescription] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setServerError(null);
    startTransition(async () => {
      const result = await submitIncidentReport({ bookingId, category, severity, description });
      if (result.success) { setSubmitted(true); onSuccess?.(); } else { setServerError(result.error); }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="h-10 w-10 text-sage-500" />
        <p className="font-semibold text-gray-900">Report submitted</p>
        <p className="text-sm text-gray-500 max-w-sm">Our coordination team has been notified and will review your report promptly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div role="alert" className="rounded-xl border-2 border-red-400 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-red-800 text-sm">If there is an immediate danger or medical emergency, call 911.</p>
            <p className="text-sm text-red-700 mt-1"><strong>Senior Companion is not an emergency-response service.</strong> This form is for non-emergency reporting only.</p>
            <a href="tel:911" className="mt-2 inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
              <Phone className="h-3.5 w-3.5" />Call 911
            </a>
          </div>
        </div>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <div className="space-y-2">
        <Label className="font-medium">Incident category <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <label key={cat.value} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-sm ${category === cat.value ? "border-sage-500 bg-sage-50 text-sage-800" : "border-gray-200 hover:border-sage-200"}`}>
              <input type="radio" name="category" value={cat.value} checked={category === cat.value} onChange={() => setCategory(cat.value)} className="sr-only" />
              <span className={`h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 ${category === cat.value ? "border-sage-500 bg-sage-500" : "border-gray-400"}`} />
              {cat.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-medium">Severity <span className="text-red-500">*</span></Label>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((sev) => (
            <button key={sev.value} type="button" onClick={() => setSeverity(sev.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${severity === sev.value ? "border-sage-500 bg-sage-50 text-sage-800" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {sev.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="incident-desc" className="font-medium">Description <span className="text-red-500">*</span></Label>
        <Textarea id="incident-desc" rows={4} placeholder="Describe what happened. Do not include medical diagnoses, financial information, or other sensitive details." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        <p className="text-xs text-gray-400 text-right tabular-nums">{description.length}/2000</p>
      </div>

      <Button onClick={handleSubmit} disabled={isPending || !description.trim()} className="w-full sm:w-auto" size="lg">
        {isPending ? "Submitting…" : "Submit Report"}
      </Button>
    </div>
  );
}