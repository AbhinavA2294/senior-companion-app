"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInToBooking } from "@/lib/actions/visit-lifecycle";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPin, MapPinOff, LogIn, AlertTriangle, Phone } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Props {
  bookingId: string;
  scheduledDate: string;
  scheduledTime: string;
}

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "skipped" };

export function CheckInPanel({ bookingId, scheduledDate, scheduledTime }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<GeoState>({ status: "idle" });
  const [geoConsent, setGeoConsent] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  function requestLocation() {
    if (!navigator.geolocation) { setGeoState({ status: "denied" }); return; }
    setGeoState({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoState({ status: "granted", latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setGeoState({ status: "denied" }),
      { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false }
    );
  }

  function handleCheckIn() {
    setServerError(null);
    const coords = geoState.status === "granted" ? { latitude: geoState.latitude, longitude: geoState.longitude } : null;
    startTransition(async () => {
      const result = await checkInToBooking(bookingId, coords);
      if (result.success) { router.refresh(); } else { setServerError(result.error); }
    });
  }

  const checkinSubtitle = t("visitPanel.checkinSubtitle")
    .replace("{date}", scheduledDate)
    .replace("{time}", scheduledTime);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
        <button onClick={() => setShowEmergency((v) => !v)} className="flex w-full items-center gap-3 text-left" aria-expanded={showEmergency}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <Phone className="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-red-800 text-sm">{t("visitPanel.emergencyTitle")}</p>
            <p className="text-xs text-red-600">{t("visitPanel.emergencyTap")}</p>
          </div>
        </button>
        {showEmergency && (
          <div className="mt-3 rounded-lg bg-red-100 border border-red-300 p-4 text-sm text-red-900">
            <p className="font-bold text-base mb-1">⚠️ {t("visitPanel.emergencyWarn")}</p>
            <p className="mb-2"><strong>{t("visitPanel.notEmergency")}</strong></p>
            <a href="tel:911" className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors">
              <Phone className="h-4 w-4" />{t("visitPanel.call911")}
            </a>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{t("visitPanel.checkinTitle")}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{checkinSubtitle}</p>
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <p>{serverError}</p>
          </Alert>
        )}

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("visitPanel.locationSectionTitle")}</p>
          <p className="text-sm text-gray-600">{t("visitPanel.locationDesc")}</p>
          <div className="flex items-start gap-2">
            <Checkbox id="geo-consent" checked={geoConsent} onCheckedChange={(v) => { setGeoConsent(!!v); if (!v) setGeoState({ status: "idle" }); }} />
            <Label htmlFor="geo-consent" className="text-sm leading-snug cursor-pointer">{t("visitPanel.locationConsent")}</Label>
          </div>
          {geoConsent && (
            <div className="space-y-2">
              {geoState.status === "idle" && <Button variant="outline" size="sm" onClick={requestLocation} className="flex items-center gap-2"><MapPin className="h-4 w-4" />{t("visitPanel.shareLocation")}</Button>}
              {geoState.status === "requesting" && <p className="text-sm text-gray-500">{t("visitPanel.requestingLocation")}</p>}
              {geoState.status === "granted" && <p className="text-sm text-sage-700 flex items-center gap-2"><MapPin className="h-4 w-4 text-sage-500" />{t("visitPanel.locationCaptured")}</p>}
              {geoState.status === "denied" && <p className="text-sm text-warm-700 flex items-center gap-2"><MapPinOff className="h-4 w-4" />{t("visitPanel.locationDenied")}</p>}
            </div>
          )}
          {!geoConsent && <p className="text-xs text-gray-400 flex items-center gap-1.5"><MapPinOff className="h-3.5 w-3.5" />{t("visitPanel.locationSkipped")}</p>}
        </div>

        <Button onClick={handleCheckIn} disabled={isPending} className="flex items-center gap-2 w-full sm:w-auto" size="lg">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {isPending ? t("visitPanel.checkinPending") : t("visitPanel.checkinConfirm")}
        </Button>
      </div>
    </div>
  );
}
