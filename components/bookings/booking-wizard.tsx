"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import {
  BookingSchema,
  BOOKING_MIN_HOURS,
  BOOKING_MAX_HOURS,
  BOOKING_ADVANCE_HOURS,
  type BookingFormData,
} from "@/lib/validations/booking";
import { createBooking } from "@/lib/actions/bookings";
import type { ActivityType, Profile, SeniorProfile } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";

interface SeniorOption {
  profile: Profile;
  seniorProfile: SeniorProfile | null;
  relationshipLabel?: string;
}

interface BookingWizardProps {
  seniors: SeniorOption[];
  activityTypes: ActivityType[];
  /** Pre-select a specific senior (used on senior's own booking page) */
  defaultSeniorId?: string;
  /** Where to redirect after a successful submission */
  successRedirect: string;
}

const STEPS = [
  { label: "Senior",   icon: User },
  { label: "Activity", icon: FileText },
  { label: "Schedule", icon: Calendar },
  { label: "Location", icon: MapPin },
  { label: "Notes",    icon: FileText },
  { label: "Review",   icon: Check },
];

const DURATION_OPTIONS = [2, 3, 4, 5, 6];
const START_TIMES = Array.from({ length: 28 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
});

const DISCLAIMER_TEXT = `Senior Companion provides non-medical companionship and chaperone services only.
Our companions are not healthcare providers and cannot administer medication, provide medical
advice, or perform any clinical services.

Important: Please do not include medical records, medication information, financial information,
insurance details, Social Security numbers, or sensitive personal documents in your booking notes.

By submitting this request you confirm that the service is for non-medical companionship only
and that you have read and agreed to our Terms of Service and Service Boundaries.`;

export function BookingWizard({
  seniors,
  activityTypes,
  defaultSeniorId,
  successRedirect,
}: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(defaultSeniorId ? 1 : 0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSingleSenior = !!defaultSeniorId;

  const {
    register,
    watch,
    setValue,
    trigger,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      senior_profile_id: defaultSeniorId ?? "",
      activity_type_id: "",
      scheduled_date: "",
      scheduled_start_time: "",
      duration_hours: 2,
      location_description: "",
      destination_address: "",
      special_notes: "",
    },
    mode: "onTouched",
  });

  const watchedValues = watch();

  // ── Min date: today + 12 hours ────────────────────────────
  const minDate = (() => {
    const d = new Date(Date.now() + BOOKING_ADVANCE_HOURS * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  })();

  // ── Step validation ───────────────────────────────────────
  const stepFields: (keyof BookingFormData)[][] = [
    ["senior_profile_id"],
    ["activity_type_id"],
    ["scheduled_date", "scheduled_start_time", "duration_hours"],
    ["location_description", "destination_address"],
    ["special_notes"],
    ["disclaimer_acknowledged"],
  ];

  async function handleNext() {
    const fields = stepFields[step];
    const valid = await trigger(fields);
    if (!valid) return;

    // ── Cross-field schedule validation (step 2) ──────────
    if (step === 2) {
      const { scheduled_date, scheduled_start_time, duration_hours } = watchedValues;
      if (scheduled_date && scheduled_start_time) {
        // 12-hour advance check
        const bookingDate = new Date(`${scheduled_date}T${scheduled_start_time}:00`);
        const minAllowed = new Date(Date.now() + BOOKING_ADVANCE_HOURS * 60 * 60 * 1000);
        if (bookingDate < minAllowed) {
          setError("scheduled_date", {
            message: `Bookings must be scheduled at least ${BOOKING_ADVANCE_HOURS} hours in advance.`,
          });
          return;
        }

        // No overnight bookings check
        const [h, m] = scheduled_start_time.split(":").map(Number);
        const endMinutes = h * 60 + m + duration_hours * 60;
        if (endMinutes >= 24 * 60) {
          setError("scheduled_start_time", {
            message:
              "The booking cannot extend past midnight. Please choose an earlier start time or shorter duration.",
          });
          return;
        }
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - (isSingleSenior && s === 1 ? 1 : 1), isSingleSenior ? 1 : 0));
  }

  function onSubmit(data: BookingFormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await createBooking(data);
      if (result.success) {
        router.push(successRedirect);
      } else {
        setServerError(result.error);
      }
    });
  }

  // ── Lookup helpers ────────────────────────────────────────
  const selectedSenior = seniors.find(
    (s) => s.profile.id === watchedValues.senior_profile_id
  );
  const selectedActivity = activityTypes.find(
    (a) => a.id === watchedValues.activity_type_id
  );

  // ── Step content ──────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 0: Select senior ──────────────────────────────
      case 0:
        return (
          <div>
            <h2 className="text-senior-xl font-semibold text-gray-900 mb-1">
              Who is this visit for?
            </h2>
            <p className="text-senior-sm text-gray-500 mb-6">
              Select the person you are booking a companion for.
            </p>

            {seniors.length === 0 ? (
              <Alert variant="info">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <p>
                  You have not added any seniors yet.{" "}
                  <a href="/family/seniors/add" className="underline font-medium">
                    Add a senior
                  </a>{" "}
                  before making a booking.
                </p>
              </Alert>
            ) : (
              <div className="space-y-3" role="radiogroup" aria-label="Select senior">
                {seniors.map(({ profile, seniorProfile, relationshipLabel }) => {
                  const isSelected = watchedValues.senior_profile_id === profile.id;
                  const displayName = seniorProfile?.preferred_name
                    ? `${profile.first_name} "${seniorProfile.preferred_name}" ${profile.last_name}`
                    : `${profile.first_name} ${profile.last_name}`;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setValue("senior_profile_id", profile.id)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        isSelected
                          ? "border-sage-500 bg-sage-50"
                          : "border-gray-200 hover:border-sage-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-sage-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                          <User className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-semibold text-senior-base text-gray-900">
                            {displayName}
                          </p>
                          {relationshipLabel && (
                            <p className="text-sm text-gray-500">{relationshipLabel}</p>
                          )}
                          {[profile.city, profile.state].filter(Boolean).length > 0 && (
                            <p className="text-sm text-gray-400">
                              {[profile.city, profile.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {errors.senior_profile_id && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.senior_profile_id.message}
              </p>
            )}
          </div>
        );

      // ── Step 1: Activity type ──────────────────────────────
      case 1:
        return (
          <div>
            <h2 className="text-senior-xl font-semibold text-gray-900 mb-1">
              What type of activity?
            </h2>
            <p className="text-senior-sm text-gray-500 mb-6">
              Choose the activity you would like to book a companion for.
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="radiogroup"
              aria-label="Select activity type"
            >
              {activityTypes.map((activity) => {
                const isSelected = watchedValues.activity_type_id === activity.id;
                return (
                  <button
                    key={activity.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setValue("activity_type_id", activity.id)}
                    className={`text-left rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                      isSelected
                        ? "border-sage-500 bg-sage-50"
                        : "border-gray-200 hover:border-sage-300"
                    }`}
                  >
                    <p className="font-semibold text-senior-sm text-gray-900 mb-1">
                      {activity.name}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {activity.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {errors.activity_type_id && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.activity_type_id.message}
              </p>
            )}
          </div>
        );

      // ── Step 2: Date, time & duration ──────────────────────
      case 2:
        return (
          <div>
            <h2 className="text-senior-xl font-semibold text-gray-900 mb-1">
              When is the visit?
            </h2>
            <p className="text-senior-sm text-gray-500 mb-6">
              Bookings must be scheduled at least {BOOKING_ADVANCE_HOURS} hours in advance.
              Visits may be {BOOKING_MIN_HOURS}–{BOOKING_MAX_HOURS} hours long and cannot extend past midnight.
            </p>

            <div className="space-y-5">
              <div>
                <Label htmlFor="scheduled_date">Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  min={minDate}
                  className="mt-1"
                  aria-describedby={errors.scheduled_date ? "date-error" : undefined}
                  {...register("scheduled_date")}
                />
                {errors.scheduled_date && (
                  <p id="date-error" role="alert" className="mt-1 text-sm text-destructive">
                    {errors.scheduled_date.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="scheduled_start_time">Start time</Label>
                <select
                  id="scheduled_start_time"
                  className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-describedby={errors.scheduled_start_time ? "time-error" : undefined}
                  {...register("scheduled_start_time")}
                >
                  <option value="">Select a start time…</option>
                  {START_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
                {errors.scheduled_start_time && (
                  <p id="time-error" role="alert" className="mt-1 text-sm text-destructive">
                    {errors.scheduled_start_time.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Duration</Label>
                <div className="mt-1 flex gap-2 flex-wrap" role="group" aria-label="Duration">
                  {DURATION_OPTIONS.map((hours) => {
                    const isSelected = watchedValues.duration_hours === hours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setValue("duration_hours", hours)}
                        className={`rounded-lg border-2 px-4 py-2 text-senior-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                          isSelected
                            ? "border-sage-500 bg-sage-500 text-white"
                            : "border-gray-200 text-gray-700 hover:border-sage-300"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {hours}h
                      </button>
                    );
                  })}
                </div>
                {errors.duration_hours && (
                  <p role="alert" className="mt-1 text-sm text-destructive">
                    {errors.duration_hours.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      // ── Step 3: Location ───────────────────────────────────
      case 3:
        return (
          <div>
            <h2 className="text-senior-xl font-semibold text-gray-900 mb-1">
              Where is the visit?
            </h2>
            <p className="text-senior-sm text-gray-500 mb-6">
              Enter the address where the companion should meet the senior.
            </p>

            <div className="space-y-5">
              <div>
                <Label htmlFor="location_description">
                  Meeting address <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="location_description"
                  placeholder="e.g. 142 Maple Street, Springfield, IL 62702"
                  className="mt-1"
                  aria-describedby={errors.location_description ? "location-error" : undefined}
                  aria-required="true"
                  {...register("location_description")}
                />
                {errors.location_description && (
                  <p id="location-error" role="alert" className="mt-1 text-sm text-destructive">
                    {errors.location_description.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="destination_address">
                  Destination address{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="destination_address"
                  placeholder="e.g. Springfield Family Medicine, 500 Health Blvd"
                  className="mt-1"
                  {...register("destination_address")}
                />
                <p className="mt-1 text-xs text-gray-500">
                  If the visit involves travelling to a specific location, enter it here.
                </p>
              </div>

              <Alert variant="info">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm">
                  <strong>Note:</strong> Companions do not provide personal-vehicle transportation.
                  For outings, please arrange rideshare, public transit, or walking.
                </p>
              </Alert>
            </div>
          </div>
        );

      // ── Step 4: Notes ──────────────────────────────────────
      case 4:
        return (
          <div>
            <h2 className="text-senior-xl font-semibold text-gray-900 mb-1">
              Any additional notes?
            </h2>
            <p className="text-senior-sm text-gray-500 mb-6">
              Share anything that will help the companion prepare — preferences, reminders, or context about this visit.
            </p>

            <div>
              <Label htmlFor="special_notes">
                Notes{" "}
                <span className="text-gray-400 font-normal">(optional, max 1,000 characters)</span>
              </Label>
              <Textarea
                id="special_notes"
                className="mt-1"
                rows={5}
                placeholder="e.g. Eleanor enjoys talking about her garden. Please arrive 5 minutes early — she takes a few minutes to get ready."
                {...register("special_notes")}
              />
              {errors.special_notes && (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  {errors.special_notes.message}
                </p>
              )}
            </div>

            <Alert variant="warning" className="mt-4">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <p className="text-sm">
                <strong>Important:</strong> Please do not include medical records, medication
                information, financial information, insurance details, Social Security numbers, or
                sensitive personal documents in your notes.
              </p>
            </Alert>
          </div>
        );

      // ── Step 5: Review & Disclaimer ────────────────────────
      case 5:
        return (
          <div>
            <h2 className="text-senior-xl font-semibold text-gray-900 mb-1">
              Review your request
            </h2>
            <p className="text-senior-sm text-gray-500 mb-6">
              Please review the details below and acknowledge the service disclaimer before submitting.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6">
              <SummaryRow label="Senior" value={
                selectedSenior
                  ? `${selectedSenior.profile.first_name} ${selectedSenior.profile.last_name}`
                  : "—"
              } />
              <SummaryRow label="Activity" value={selectedActivity?.name ?? "—"} />
              <SummaryRow
                label="Date"
                value={watchedValues.scheduled_date ? formatDate(watchedValues.scheduled_date) : "—"}
              />
              <SummaryRow
                label="Start time"
                value={watchedValues.scheduled_start_time ? formatTime(watchedValues.scheduled_start_time) : "—"}
              />
              <SummaryRow
                label="Duration"
                value={watchedValues.duration_hours ? `${watchedValues.duration_hours} hours` : "—"}
              />
              <SummaryRow label="Meeting address" value={watchedValues.location_description || "—"} />
              {watchedValues.destination_address && (
                <SummaryRow label="Destination" value={watchedValues.destination_address} />
              )}
              {watchedValues.special_notes && (
                <SummaryRow label="Notes" value={watchedValues.special_notes} />
              )}
            </div>

            {/* Disclaimer */}
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 mb-5">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                Service Disclaimer
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {DISCLAIMER_TEXT}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="disclaimer_acknowledged"
                onCheckedChange={(checked) =>
                  setValue("disclaimer_acknowledged", checked === true ? true : (undefined as unknown as true))
                }
                aria-describedby={errors.disclaimer_acknowledged ? "disclaimer-error" : undefined}
              />
              <div>
                <Label htmlFor="disclaimer_acknowledged" className="cursor-pointer leading-relaxed">
                  I have read and understood the service disclaimer. I confirm this booking is for
                  non-medical companionship only, and my notes do not contain medical, financial,
                  or other sensitive personal information.
                </Label>
                {errors.disclaimer_acknowledged && (
                  <p id="disclaimer-error" role="alert" className="mt-1 text-sm text-destructive">
                    {errors.disclaimer_acknowledged.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isFirstStep = step === (isSingleSenior ? 1 : 0);
  const isLastStep = step === STEPS.length - 1;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step indicator */}
      <nav aria-label="Booking progress" className="mb-8">
        <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            if (isSingleSenior && i === 0) return null;
            const Icon = s.icon;
            const isCurrent = i === step;
            const isDone = i < step;
            return (
              <li key={s.label} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors ${
                    isDone
                      ? "border-sage-500 bg-sage-500 text-white"
                      : isCurrent
                      ? "border-sage-500 bg-white text-sage-600"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isCurrent ? "text-sage-700" : isDone ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px w-4 sm:w-6 ${i < step ? "bg-sage-400" : "bg-gray-200"}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Server error */}
      {serverError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      {/* Step content */}
      <div className="min-h-[300px]">{renderStep()}</div>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep}
          className={isFirstStep ? "invisible" : ""}
        >
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        {isLastStep ? (
          <Button type="submit" variant="default" size="lg" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit Request"}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-senior-sm">
      <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium flex-1">{value}</span>
    </div>
  );
}
