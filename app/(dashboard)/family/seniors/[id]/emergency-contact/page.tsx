"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmergencyContactSchema, type EmergencyContactFormData } from "@/lib/validations/senior-profile";
import { saveEmergencyContact } from "@/lib/actions/senior-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Phone } from "lucide-react";

export default function EmergencyContactPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const seniorId = params.id;

  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<EmergencyContactFormData>({
    resolver: zodResolver(EmergencyContactSchema),
    defaultValues: { is_primary: true },
  });

  const isPrimary = watch("is_primary");

  function onSubmit(data: EmergencyContactFormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveEmergencyContact(seniorId, data);
      if (result.success) {
        router.push(`/family/seniors/${seniorId}`);
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <a
          href={`/family/seniors/${seniorId}`}
          className="text-sm text-sage-600 hover:underline mb-2 inline-block"
        >
          ← Back to senior profile
        </a>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Emergency Contact</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Add or update the emergency contact for this senior.
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p>{serverError}</p>
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Contact Details
          </CardTitle>
          <CardDescription>
            This person will be contacted in the event of an emergency during a visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <Label htmlFor="ec-name">
                Full name <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input id="ec-name" className="mt-1" {...register("name")} />
              {errors.name && (
                <p role="alert" className="mt-1 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ec-relationship">
                Relationship <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="ec-relationship"
                className="mt-1"
                placeholder="e.g. Daughter, Son, Spouse, Friend"
                {...register("relationship")}
              />
              {errors.relationship && (
                <p role="alert" className="mt-1 text-sm text-destructive">{errors.relationship.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ec-phone">
                Phone number <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input id="ec-phone" type="tel" className="mt-1" placeholder="+15550001234" {...register("phone")} />
              {errors.phone && (
                <p role="alert" className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ec-email">
                Email address <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input id="ec-email" type="email" className="mt-1" {...register("email")} />
              {errors.email && (
                <p role="alert" className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Checkbox
                id="ec-primary"
                checked={isPrimary}
                onCheckedChange={(v) => setValue("is_primary", v === true)}
              />
              <Label htmlFor="ec-primary" className="cursor-pointer font-normal">
                Mark as primary emergency contact
              </Label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save Emergency Contact"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(`/family/seniors/${seniorId}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
