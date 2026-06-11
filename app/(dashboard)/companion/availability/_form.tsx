"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertCompanionAvailability } from "@/lib/actions/companion-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { CompanionAvailabilityFormData } from "@/lib/validations/companion-profile";

const DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

type DaySlot = { is_active: boolean; start_time: string; end_time: string };

type Props = {
  initialSlots: Record<number, DaySlot>;
};

export function AvailabilityForm({ initialSlots }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState<Record<number, DaySlot>>(() => {
    const defaults: Record<number, DaySlot> = {};
    DAYS.forEach(({ value }) => {
      defaults[value] = initialSlots[value] ?? {
        is_active: false,
        start_time: "09:00",
        end_time: "17:00",
      };
    });
    return defaults;
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleDay(day: number) {
    setSlots((prev) => ({
      ...prev,
      [day]: { ...prev[day], is_active: !prev[day].is_active },
    }));
  }

  function setTime(day: number, field: "start_time" | "end_time", value: string) {
    setSlots((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function onSave() {
    setServerError(null);
    setSaved(false);

    const payload: CompanionAvailabilityFormData = {
      slots: DAYS.filter(({ value }) => slots[value].is_active).map(({ value }) => ({
        day_of_week: value,
        start_time: slots[value].start_time,
        end_time: slots[value].end_time,
        is_active: true,
      })),
    };

    startTransition(async () => {
      const result = await upsertCompanionAvailability(payload);
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Availability</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Set the days and hours you are available for companion visits.
        </p>
      </div>

      {saved && (
        <Alert variant="info" className="mb-4">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <p>Availability saved.</p>
        </Alert>
      )}
      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-2">
          {DAYS.map(({ label, value }) => {
            const slot = slots[value];
            return (
              <div key={value} className="flex flex-wrap items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <label className="flex items-center gap-2 w-28 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={slot.is_active}
                    onChange={() => toggleDay(value)}
                    className="h-4 w-4 rounded text-sage-600"
                    aria-label={`Available on ${label}`}
                  />
                  <span className={`text-sm font-medium ${slot.is_active ? "text-gray-900" : "text-gray-400"}`}>
                    {label}
                  </span>
                </label>

                {slot.is_active ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => setTime(value, "start_time", e.target.value)}
                      className="w-32 h-9 text-sm"
                      aria-label={`${label} start time`}
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => setTime(value, "end_time", e.target.value)}
                      className="w-32 h-9 text-sm"
                      aria-label={`${label} end time`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unavailable</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-4">
        <Button onClick={onSave} size="lg" disabled={isPending}>
          {isPending ? "Saving…" : "Save Availability"}
        </Button>
      </div>
    </div>
  );
}
