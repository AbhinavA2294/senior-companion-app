"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SeniorProfileSchema, type SeniorProfileFormData } from "@/lib/validations/senior-profile";
import { createSeniorProfile } from "@/lib/actions/senior-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const COMMON_INTERESTS = [
  "Walking", "Reading", "Gardening", "Music", "Movies", "Cooking", "Travel stories",
  "Sports", "Arts & crafts", "Chess", "Cards", "Technology", "History", "Nature",
  "Social events", "Religious activities",
];

const COMMON_LANGUAGES = [
  "Spanish", "Mandarin", "Cantonese", "Hindi", "French", "German", "Italian",
  "Portuguese", "Japanese", "Korean", "Vietnamese", "Tagalog", "Arabic",
  "Russian", "Polish",
];

export default function AddSeniorPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<SeniorProfileFormData>({
    resolver: zodResolver(SeniorProfileSchema),
    defaultValues: {
      preferred_language: "English",
      additional_languages: [],
      interests: [],
      relationship_label: "Family Member",
    },
  });

  const watchedInterests = watch("interests") ?? [];
  const watchedAdditionalLanguages = watch("additional_languages") ?? [];

  function toggleInterest(interest: string) {
    const current = watchedInterests;
    setValue(
      "interests",
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest]
    );
  }

  function toggleLanguage(lang: string) {
    const current = watchedAdditionalLanguages;
    setValue(
      "additional_languages",
      current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang]
    );
  }

  function onSubmit(data: SeniorProfileFormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await createSeniorProfile(data);
      if (result.success && result.seniorId) {
        router.push(`/family/seniors/${result.seniorId}`);
      } else if (!result.success) {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Add a Senior</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Create a profile for a family member so you can book companions on their behalf.
        </p>
      </div>

      <Alert variant="info" className="mb-6">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm">
          <strong>Privacy reminder:</strong> Do not include medical diagnoses, medication lists,
          insurance information, Social Security numbers, or financial details.
        </p>
      </Alert>

      {serverError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {/* Basic information */}
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
              <Label htmlFor="preferred_name">
                Preferred name <Optional />
              </Label>
              <Input
                id="preferred_name"
                placeholder="What do they like to be called?"
                className="mt-1"
                {...register("preferred_name")}
              />
              <FieldError message={errors.preferred_name?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone number <Required /></Label>
                <Input id="phone" type="tel" placeholder="+15550001234" className="mt-1" {...register("phone")} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div>
                <Label htmlFor="contact_email">Email address <Optional /></Label>
                <Input id="contact_email" type="email" className="mt-1" {...register("contact_email")} />
                <FieldError message={errors.contact_email?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="date_of_birth">Date of birth <Optional /></Label>
              <Input id="date_of_birth" type="date" className="mt-1" {...register("date_of_birth")} />
              <FieldError message={errors.date_of_birth?.message} />
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
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
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
              <Label htmlFor="relationship_label">Your relationship to them <Required /></Label>
              <Input
                id="relationship_label"
                placeholder="e.g. Daughter, Son, Nephew, Friend"
                className="mt-1"
                {...register("relationship_label")}
              />
              <FieldError message={errors.relationship_label?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Language, companion preferences, and interests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferred_language">Preferred language <Required /></Label>
                <Input
                  id="preferred_language"
                  className="mt-1"
                  defaultValue="English"
                  {...register("preferred_language")}
                />
                <FieldError message={errors.preferred_language?.message} />
              </div>
              <div>
                <Label htmlFor="preferred_companion_gender">
                  Preferred companion gender <Optional />
                </Label>
                <select
                  id="preferred_companion_gender"
                  className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register("preferred_companion_gender")}
                >
                  <option value="">No preference</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="no_preference">No preference</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Additional languages <Optional /></Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => {
                  const selected = watchedAdditionalLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        selected
                          ? "bg-sage-500 text-white border-sage-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-sage-300"
                      }`}
                      aria-pressed={selected}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Interests & hobbies <Optional /></Label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">
                Helps us match companions who share similar interests.
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_INTERESTS.map((interest) => {
                  const selected = watchedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        selected
                          ? "bg-warm-500 text-white border-warm-500"
                          : "bg-white text-gray-700 border-gray-200 hover:border-warm-300"
                      }`}
                      aria-pressed={selected}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility & Care Notes */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Accessibility &amp; Care Notes</CardTitle>
            <CardDescription>
              Non-medical notes to help companions provide better support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mobility_notes">Mobility notes <Optional /></Label>
              <Textarea
                id="mobility_notes"
                className="mt-1"
                rows={2}
                placeholder="e.g. Uses a cane for longer walks. Comfortable walking short distances unaided."
                {...register("mobility_notes")}
              />
            </div>
            <div>
              <Label htmlFor="accessibility_needs">Accessibility needs <Optional /></Label>
              <Textarea
                id="accessibility_needs"
                className="mt-1"
                rows={2}
                placeholder="e.g. Prefers wide doorways. Has mild hearing loss — please speak clearly and face her when talking."
                {...register("accessibility_needs")}
              />
            </div>
            <div>
              <Label htmlFor="dietary_notes">Dietary notes <Optional /></Label>
              <Textarea
                id="dietary_notes"
                className="mt-1"
                rows={2}
                placeholder="e.g. Vegetarian. Avoids shellfish."
                {...register("dietary_notes")}
              />
            </div>
            <div>
              <Label htmlFor="free_text_notes">Additional notes <Optional /></Label>
              <Textarea
                id="free_text_notes"
                className="mt-1"
                rows={3}
                placeholder="Any other preferences or context that would help companions — e.g. morning person, loves talking about history, needs 10 minutes to get ready."
                {...register("free_text_notes")}
              />
              <p className="mt-1 text-xs text-gray-400">
                Do not include medical diagnoses, medications, insurance, or financial information.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Creating profile…" : "Create Senior Profile"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Required() {
  return <span aria-hidden="true" className="text-destructive ml-0.5">*</span>;
}

function Optional() {
  return <span className="text-gray-400 font-normal ml-1">(optional)</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}
