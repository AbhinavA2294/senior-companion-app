"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Heart, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { LoginSchema, type LoginFormData } from "@/lib/validations/auth";
import { getDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);

    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError("Incorrect email or password. Please try again.");
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // Fetch the user's profile to get their role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      const role = (profile?.role ?? "senior") as UserRole;
      router.push(getDashboardPath(role));
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-sage-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-sage-100 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 mb-4">
              <Heart className="h-7 w-7 text-sage-600" aria-hidden="true" />
            </div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h1>
            <p className="text-senior-base text-gray-500">Sign in to your Senior Companion account</p>
          </div>

          {/* Error */}
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600 flex items-center gap-1" role="alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-sage-600 hover:text-sage-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="pr-12"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600 flex items-center gap-1" role="alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-senior-base text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-sage-600 font-semibold hover:text-sage-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
            >
              Create one — it&apos;s free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
