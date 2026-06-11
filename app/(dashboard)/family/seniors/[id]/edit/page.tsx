"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SeniorProfileSchema, type SeniorProfileFormData } from "@/lib/validations/senior-profile";
import { updateSeniorProfile } from "@/lib/actions/senior-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const COMMON_INTERESTS = [
  "Walking","Reading","Gardening","Music","Movies","Cooking","Travel stories",
  "Sports","Arts & crafts","Chess","Cards","Technology","History","Nature",
  "Social events","Religious activities",
];

const COMMON_LANGUAGES = [
  "Spanish","Mandarin","Cantonese","Hindi","French","German","Italian",
  "Portuguese","Japanese","Korean","Vietnamese","Tagalog","Arabic","Russian","Polish",
];

export default function EditSeniorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const seniorId = params.id;

  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<SeniorProfileFormData>({
    resolver: zodResolver(SeniorProfileSchema),
    defaultValues: {
      preferred_language: "English",
      additional_languages: [],
      interests: [],
    },
  });

  const watchedInterests = watch("interests") ?? [];
  const watchedAdditionalLanguages = watch("additional_languages") ?? [];

  // Load existing profile data
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: p }, { data: sp }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", seniorId).single(),
        supabase.from("senior_profiles").select("*").eq("profile_id", seniorId).single(),
      ]);

      if (p) {
        reset({
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          phone: p.phone ?? "",
          date_of_birth: p.date_of_birth ?? "",
          street_address: p.street_address ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          zip_code: p.zip_code ?? "",
          preferred_name: sp?.preferred_name ?? "",
          contact_email: sp?.contact_email ?? "",
          preferred_language: sp?.preferred_language ?? "English",
          additional_languages: sp?.additional_languages ?? [],
          preferred_companion_gender: (sp?.preferred_companion_gender as SeniorProfileFormData["preferred_companion_gender"]) ?? undefined,
          interests: sp?.interests ?? [],
          accessibility_needs: sp?.accessibility_needs ?? "",
          mobility_notes: sp?.mobility_notes ?? "",
          dietary_notes: sp?.dietary_notes ?? "",
          free_text_notes: sp?.free_text_notes ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, [seniorId, reset]);

  function toggleInterest(interest: string) {
    const current = watchedInterests;
    setValue("interests", current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest]);
  }

  function toggleLanguage(lang: string) {
    const current = watchedAdditionalLanguages;
    setValue("additional_languages", current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang]);
  }

  function onSubmit(data: SeniorProfileFormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateSeniorProfile(seniorId, data);
      if (result.success) {
        router.push(`/family/seniors/${seniorId}`);
      } else {
        setServerError(result.error);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <a href={`/family/seniors/${seniorId}`} className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to senior profile
        </a>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Edit Senior Profile</h1>
      </div>

      {serverError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name">First name <span aria-hidden="true" className="text-destructive">*</span></Label>
                <Input id="edit-first-name" className="mt-1" {...register("first_name")} />
                {errors.first_name && <p role="alert" className="mt-1 text-sm text-destructive">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-last-name">Last name <span aria-hidden="true" className="text-destructive">*</span></Label>
                <Input id="edit-last-name" className="mt-1" {...register("last_name")} />
                {errors.last_name && <p role="alert" className="mt-1 text-sm text-destructive">{errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-preferred-name">Preferred name <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input id="edit-preferred-name" className="mt-1" {...register("preferred_name")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Phone number</Label>
                <Input id="edit-phone" type="tel" className="mt-1" {...register("phone")} />
                {errors.phone && <p role="alert" className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-email">Email <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input id="edit-email" type="email" className="mt-1" {...register("contact_email")} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-dob">Date of birth <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input id="edit-dob" type="date" className="mt-1" {...register("date_of_birth")} />
            </div>
            <div>
              <Label htmlFor="edit-street">Street address</Label>
              <Input id="edit-street" className="mt-1" {...register("street_address")} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label htmlFor="edit-city">City <span aria-hidden="true" className="text-destructive">*</span></Label>
                <Input id="edit-city" className="mt-1" {...register("city")} />
                {errors.city && <p role="alert" className="mt-1 text-sm text-destructive">{errors.city.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-state">State</Label>
                <select id="edit-state" className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm focus:outline-none focus:ring-2 focus:ring-ring" {...register("state")}>
                  <option value="">—</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-zip">ZIP</Label>
                <Input id="edit-zip" className="mt-1" {...register("zip_code")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-lang">Preferred language</Label>
                <Input id="edit-lang" className="mt-1" {...register("preferred_language")} />
              </div>
              <div>
                <Label htmlFor="edit-gender">Preferred companion gender</Label>
                <select id="edit-gender" className="mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-senior-sm focus:outline-none focus:ring-2 focus:ring-ring" {...register("preferred_companion_gender")}>
                  <option value="">No preference</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="no_preference">No preference</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Additional languages</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => {
                  const selected = watchedAdditionalLanguages.includes(lang);
                  return (
                    <button key={lang} type="button" onClick={() => toggleLanguage(lang)} aria-pressed={selected}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selected ? "bg-sage-500 text-white border-sage-500" : "bg-white text-gray-700 border-gray-200 hover:border-sage-300"}`}>
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Interests</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_INTERESTS.map((interest) => {
                  const selected = watchedInterests.includes(interest);
                  return (
                    <button key={interest} type="button" onClick={() => toggleInterest(interest)} aria-pressed={selected}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selected ? "bg-warm-500 text-white border-warm-500" : "bg-white text-gray-700 border-gray-200 hover:border-warm-300"}`}>
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Accessibility &amp; Care Notes</CardTitle>
            <CardDescription>Non-medical notes only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="edit-mobility">Mobility notes</Label>
              <Textarea id="edit-mobility" className="mt-1" rows={2} {...register("mobility_notes")} />
            </div>
            <div>
              <Label htmlFor="edit-access">Accessibility needs</Label>
              <Textarea id="edit-access" className="mt-1" rows={2} {...register("accessibility_needs")} />
            </div>
            <div>
              <Label htmlFor="edit-dietary">Dietary notes</Label>
              <Textarea id="edit-dietary" className="mt-1" rows={2} {...register("dietary_notes")} />
            </div>
            <div>
              <Label htmlFor="edit-notes">Additional notes</Label>
              <Textarea id="edit-notes" className="mt-1" rows={3} {...register("free_text_notes")} />
              <p className="mt-1 text-xs text-gray-400">Do not include medical diagnoses, medications, insurance, or financial information.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push(`/family/seniors/${seniorId}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
