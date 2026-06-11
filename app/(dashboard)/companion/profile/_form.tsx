"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CompanionOnboardingSchema,
  type CompanionOnboardingFormData,
} from "@/lib/validations/companion-profile";
import { upsertCompanionOnboarding } from "@/lib/actions/companion-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const COMMON_LANGUAGES = [
  "English","Spanish","Mandarin","Cantonese","Hindi","French","German","Italian",
  "Portuguese","Japanese","Korean","Vietnamese","Tagalog","Arabic","Russian","Polish",
];

const COMPANION_ACTIVITIES = [
  "Doctor Appointment Chaperone",
  "Walk or Park Visit",
  "Café or Restaurant",
  "Grocery Shopping",
  "Religious or Cultural Program",
  "Social Event",
  "Conversation and Companionship",
  "Reading or Games",
  "Technology Assistance",
  "Other Non-Medical Activity",
];

const COMPANION_INTERESTS = [
  "Walking","Reading","Gardening","Music","Movies","Cooking","Travel stories",
  "Sports","Arts & crafts","Chess","Cards","Technology","History","Nature",
  "Social events","Religious activities",
];

function Required() {
  return <span aria-hidden="true" className="text-destructive ml-0.5">*</span>;
}
function Optional() {
  return <span className="text-gray-400 font-normal ml-1">(optional)</span>;
}
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-1 text-sm text-destructive">{message}</p>;
}

type Props = { defaultValues: CompanionOnboardingFormData };

export function CompanionProfileForm({ defaultValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanionOnboardingFormData>({
    resolver: zodResolver(CompanionOnboardingSchema),
    defaultValues,
  });

  const watchedLanguages = watch("languages_spoken") ?? [];
  const watchedActivities = watch("activities_supported") ?? [];
  const watchedInterests = watch("interests") ?? [];
  const watchedExperience = watch("has_prior_experience");
  const watchedBgConsent = watch("background_check_consent");
  const watchedConduct = watch("code_of_conduct_accepted");
  const watchedEP = watch("emergency_protocol_completed");

  function toggle<T extends string>(field: "languages_spoken" | "activities_supported" | "interests", val: T, current: T[]) {
    setValue(
      field,
      current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    );
  }

  function onSubmit(data: CompanionOnboardingFormData) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await upsertCompanionOnboarding(data);
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Complete your companion profile to be considered for booking assignments.
        </p>
      </div>

      {saved && (
        <Alert variant="info" className="mb-6">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <p>Profile saved successfully.</p>
        </Alert>
      )}
      {serverError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">

        {/* Basic Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Name, contact details, and address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First name <Required /></Label>
                <Input id="first_name" className="mt-1" {...register("first_name")} />
                <FieldError message={errors.first_name?.message} />
              </div>
              <div>
                <Label htmlFor="last_name">Last name <Required /></Label>
                <Input id="last_name" className="mt-1" {...register("last_name")} />
                <FieldError message={errors.last_name?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone number <Required /></Label>
              <Input id="phone" type="tel" placeholder="+15550001234" className="mt-1" {...register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>

            <div>
              <Label htmlFor="street_address">Street address <Optional /></Label>
              <Input id="street_address" className="mt-1" placeholder="123 Main Street" {...register("street_address")} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label htmlFor="city">City <Required /></Label>
                <Input id="city" className="mt-1" {...register("city")} />
                <FieldError message={errors.city?.message} />
              </div>
              <div>
                <Label htmlFor="state">State <Required /></Label>
                <select
                  id="state"
                  className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register("state")}
                >
                  <option value="">—</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <FieldError message={errors.state?.message} />
              </div>
              <div>
                <Label htmlFor="zip_code">ZIP <Optional /></Label>
                <Input id="zip_code" className="mt-1" placeholder="62701" {...register("zip_code")} />
                <FieldError message={errors.zip_code?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Short biography <Required /></Label>
              <Textarea
                id="bio"
                className="mt-1"
                rows={4}
                placeholder="Tell seniors and families a bit about yourself — your background, why you enjoy companionship work, and what makes you a great companion."
                {...register("bio")}
              />
              <FieldError message={errors.bio?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
            <CardDescription>Languages, experience, and service area</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Languages spoken <Required /></Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => {
                  const selected = watchedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggle("languages_spoken", lang, watchedLanguages)}
                      aria-pressed={selected}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        selected
                          ? "bg-sage-500 text-white border-sage-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-sage-300"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors.languages_spoken?.message} />
            </div>

            <div>
              <Label htmlFor="max_travel_miles">Service radius (miles) <Required /></Label>
              <Input
                id="max_travel_miles"
                type="number"
                min={1}
                max={150}
                className="mt-1 w-32"
                {...register("max_travel_miles", { valueAsNumber: true })}
              />
              <FieldError message={errors.max_travel_miles?.message} />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Prior experience with seniors <Required />
              </p>
              <div className="flex gap-4 mt-2">
                {[true, false].map((val) => (
                  <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="has_prior_experience"
                      value={String(val)}
                      checked={watchedExperience === val}
                      onChange={() => setValue("has_prior_experience", val)}
                      className="h-4 w-4 text-sage-600"
                    />
                    <span className="text-sm text-gray-700">{val ? "Yes" : "No"}</span>
                  </label>
                ))}
              </div>

              {watchedExperience && (
                <div className="mt-3">
                  <Label htmlFor="years_experience">Years of experience <Optional /></Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min={0}
                    max={50}
                    className="mt-1 w-32"
                    {...register("years_experience", { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Personal interests <Optional /></Label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">
                Helps match you with seniors who share similar hobbies.
              </p>
              <div className="flex flex-wrap gap-2">
                {COMPANION_INTERESTS.map((interest) => {
                  const selected = watchedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggle("interests", interest, watchedInterests)}
                      aria-pressed={selected}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        selected
                          ? "bg-warm-500 text-white border-warm-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-warm-300"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Activities You Support</CardTitle>
            <CardDescription>Select all the activities you are willing to assist with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COMPANION_ACTIVITIES.map((activity) => {
                const selected = watchedActivities.includes(activity);
                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => toggle("activities_supported", activity, watchedActivities)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                      selected
                        ? "bg-sage-500 text-white border-sage-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-sage-300"
                    }`}
                  >
                    {activity}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.activities_supported?.message} />
          </CardContent>
        </Card>

        {/* References */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>References</CardTitle>
            <CardDescription>
              Provide two references who can speak to your character and suitability as a companion.
              References may be contacted by our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {([0, 1] as const).map((i) => (
              <fieldset key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <legend className="font-semibold text-sm text-gray-700 px-1">
                  Reference {i + 1}
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`ref-name-${i}`}>Full name <Required /></Label>
                    <Input
                      id={`ref-name-${i}`}
                      className="mt-1"
                      {...register(`references.${i}.reference_name`)}
                    />
                    <FieldError message={errors.references?.[i]?.reference_name?.message} />
                  </div>
                  <div>
                    <Label htmlFor={`ref-rel-${i}`}>Relationship to you <Required /></Label>
                    <Input
                      id={`ref-rel-${i}`}
                      placeholder="e.g. Former employer, colleague"
                      className="mt-1"
                      {...register(`references.${i}.relationship`)}
                    />
                    <FieldError message={errors.references?.[i]?.relationship?.message} />
                  </div>
                  <div>
                    <Label htmlFor={`ref-phone-${i}`}>Phone number <Required /></Label>
                    <Input
                      id={`ref-phone-${i}`}
                      type="tel"
                      placeholder="+15550001234"
                      className="mt-1"
                      {...register(`references.${i}.reference_phone`)}
                    />
                    <FieldError message={errors.references?.[i]?.reference_phone?.message} />
                  </div>
                  <div>
                    <Label htmlFor={`ref-email-${i}`}>Email <Optional /></Label>
                    <Input
                      id={`ref-email-${i}`}
                      type="email"
                      className="mt-1"
                      {...register(`references.${i}.reference_email`)}
                    />
                    <FieldError message={errors.references?.[i]?.reference_email?.message} />
                  </div>
                </div>
              </fieldset>
            ))}
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Compliance &amp; Consent</CardTitle>
            <CardDescription>
              Required agreements before your application can be reviewed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="background_check_consent"
                checked={!!watchedBgConsent}
                onCheckedChange={(v) =>
                  setValue("background_check_consent", v === true ? true : (false as never))
                }
                className="mt-0.5"
              />
              <div>
                <label htmlFor="background_check_consent" className="text-sm font-medium cursor-pointer">
                  I consent to a background check <Required />
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  A background check is required for all companion applicants. Results are reviewed
                  by our team and kept confidential.
                </p>
                <FieldError message={errors.background_check_consent?.message} />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="code_of_conduct_accepted"
                checked={!!watchedConduct}
                onCheckedChange={(v) =>
                  setValue("code_of_conduct_accepted", v === true ? true : (false as never))
                }
                className="mt-0.5"
              />
              <div>
                <label htmlFor="code_of_conduct_accepted" className="text-sm font-medium cursor-pointer">
                  I accept the Companion Code of Conduct <Required />
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  I agree to maintain professional boundaries, respect senior dignity, and follow
                  all platform guidelines at all times.
                </p>
                <FieldError message={errors.code_of_conduct_accepted?.message} />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="emergency_protocol_completed"
                checked={!!watchedEP}
                onCheckedChange={(v) =>
                  setValue("emergency_protocol_completed", v === true)
                }
                className="mt-0.5"
              />
              <div>
                <label htmlFor="emergency_protocol_completed" className="text-sm font-medium cursor-pointer">
                  I have completed emergency-protocol training <Optional />
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Covers what to do in the event of a medical emergency, fall, or other crisis
                  during a companion visit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Saving…" : "Save Profile"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
