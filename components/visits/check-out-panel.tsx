"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkOutFromBooking } from "@/lib/actions/visit-lifecycle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, LogOut, MapPin, MapPinOff, Info } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const NOTE_MAX = 1000;
const SENSITIVE_INFO_WARNING = `Do not include medical records, diagnoses, medication details, financial information, or other sensitive documents in visit notes. Notes are visible to family members and administrators.`;

interface Props {
  bookingId: string;
}

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" };

export function CheckOutPanel({ bookingId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<GeoState>({ status: "idle" });
  const [geoConsent, setGeoConsent] = useState(false);

  function requestLocation() {
    if (!navigator.geolocation) { setGeoState({ status: "denied" }); return; }
    setGeoState({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoState({ status: "granted", latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setGeoState({ status: "denied" }),
      { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false }
    );
  }

  function handleCheckOut() {
    setNoteError(null);
    setServerError(null);
    if (!note.trim()) { setNoteError("Please enter a brief visit note before checking out."); return; }
    if (note.length > NOTE_MAX) { setNoteError(`Visit note must be ${NOTE_MAX} characters or fewer.`); return; }
    const coords = geoState.status === "granted" ? { latitude: geoState.latitude, longitude: geoState.longitude } : null;
    startTransition(async () => {
      const result = await checkOutFromBooking(bookingId, note, coords);
      if (result.success) { router.refresh(); } else { setServerError(result.error); }
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900 text-base">{t("visitPanel.checkoutTitle")}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{t("visitPanel.checkoutSubtitle")}</p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-amber-800">{SENSITIVE_INFO_WARNING}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="visit-note" className="font-medium">Visit note <span className="text-red-500">*</span></Label>
        <Textarea id="visit-note" rows={4} maxLength={NOTE_MAX} placeholder="Briefly describe the visit…" value={note} onChange={(e) => setNote(e.target.value)} className={noteError ? "border-red-400" : ""} />
        <div className="flex justify-between items-center">
          {noteError ? <p className="text-xs text-red-600" role="alert">{noteError}</p> : <span />}
          <p className={`text-xs tabular-nums ${note.length > NOTE_MAX ? "text-red-600" : "text-gray-400"}`}>{note.length}/{NOTE_MAX}</p>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("visitPanel.locationSectionTitle")}</p>
        <div className="flex items-start gap-2">
          <Checkbox id="geo-consent-out" checked={geoConsent} onCheckedChange={(v) => { setGeoConsent(!!v); if (!v) setGeoState({ status: "idle" }); }} />
          <Label htmlFor="geo-consent-out" className="text-sm leading-snug cursor-pointer">{t("visitPanel.locationConsent")}</Label>
        </div>
        {geoConsent && (
          <div>
            {geoState.status === "idle" && <Button variant="outline" size="sm" onClick={requestLocation} className="flex items-center gap-2"><MapPin className="h-4 w-4" />{t("visitPanel.shareLocation")}</Button>}
            {geoState.status === "requesting" && <p className="text-sm text-gray-500">{t("visitPanel.requestingLocation")}</p>}
            {geoState.status === "granted" && <p className="text-sm text-sage-700 flex items-center gap-2"><MapPin className="h-4 w-4 text-sage-500" />{t("visitPanel.locationCaptured")}</p>}
            {geoState.status === "denied" && <p className="text-sm text-warm-700 flex items-center gap-2"><MapPinOff className="h-4 w-4" />{t("visitPanel.locationDenied")}</p>}
          </div>
        )}
      </div>

      <Button onClick={handleCheckOut} disabled={isPending || note.length > NOTE_MAX} size="lg" className="flex items-center gap-2 w-full sm:w-auto">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isPending ? t("visitPanel.checkoutPending") : t("visitPanel.checkoutConfirm")}
      </Button>
    </div>
  );
}
