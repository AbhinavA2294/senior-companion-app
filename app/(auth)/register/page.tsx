"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Heart, Loader2, AlertCircle, User, Users, UserCheck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { RegisterSchema, type RegisterFormData } from "@/lib/validations/auth";
import { getDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/types";

const roleOptions = [
  { value: "senior" as const, label: "Senior", description: "I want to book a companion for myself", icon: User },
  { value: "family" as const, label: "Family Member", description: "I want to book a companion for a loved one", icon: Users },
  { value: "companion" as const, label: "Companion", description: "I want to provide companionship to seniors", icon: UserCheck },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") ?? "senior") as "senior" | "family" | "companion";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(defaultRole);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { role: defaultRole },
  });

  const onRoleSelect = (role: "senior" | "family" | "companion") => {
    setSelectedRole(role);
    setValue("role", role, { shouldValidate: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { first_name: data.firstName, last_name: data.lastName, role: data.role },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    if (signUpError) { setServerError(signUpError.message); setIsLoading(false); return; }
    if (authData.user) {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: authData.user.id, role: data.role, first_name: data.firstName, last_name: data.lastName, phone: data.phone || null }),
      });
      if (!res.ok) { setServerError("Account created but profile setup failed. Please contact support."); setIsLoading(false); return; }
      router.push(getDashboardPath(data.role as UserRole));
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-sage-50">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-sm border border-sage-100 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 mb-4">
              <Heart className="h-7 w-7 text-sage-600" />
            </div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Create your account</h1>
            <p className="text-senior-base text-gray-500">Join Senior Companion in a few easy steps</p>
          </div>
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <fieldset>
              <legend className="block text-senior-base font-semibold text-gray-900 mb-3">I am joining as a…</legend>
              <div className="grid grid-cols-1 gap-3">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedRole === option.value;
                  return (
                    <button key={option.value} type="button" onClick={() => onRoleSelect(option.value)}
                      className={cn("flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all", isSelected ? "border-sage-500 bg-sage-50" : "border-gray-200 hover:border-sage-300")}>
                      <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl", isSelected ? "bg-sage-500 text-white" : "bg-gray-100 text-gray-500")}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-senior-base text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                      {isSelected && <CheckCircle className="h-6 w-6 text-sage-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...register("role")} />
            </fieldset>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" type="text" placeholder="Jane" {...register("firstName")} />
                {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" type="text" placeholder="Smith" {...register("lastName")} />
                {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create a password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" className="pr-12" {...register("password")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-sm text-gray-500">Must be at least 8 characters with one uppercase letter and one number.</p>
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Re-enter your password" className="pr-12" {...register("confirmPassword")} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-400">
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
            </div>
            <div className="flex items-start gap-3">
              <input id="agreeToTerms" type="checkbox" className="h-5 w-5 mt-0.5 rounded border-2 border-gray-300" {...register("agreeToTerms")} />
              <Label htmlFor="agreeToTerms" className="font-normal text-gray-600 cursor-pointer">
                I agree to the <Link href="/terms" className="text-sage-600 hover:underline font-semibold">Terms of Service</Link> and <Link href="/privacy" className="text-sage-600 hover:underline font-semibold">Privacy Policy</Link>. I understand that Senior Companion provides non-medical companionship only.
              </Label>
            </div>
            {errors.agreeToTerms && <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating account…</> : "Create my account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-senior-base text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-sage-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}