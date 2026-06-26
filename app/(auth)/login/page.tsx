"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Heart, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useTranslation } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { LoginSchema, type LoginFormData } from "@/lib/validations/auth";
import { getDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/types";

export default function LoginPage() {
  const { t } = useTranslation();
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
      setServerError(t("auth.login.error"));
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      const metaRole = authData.user.user_metadata?.role as string | undefined;
      const role = (profile?.role ?? metaRole ?? "senior") as UserRole;

      if (!profile) {
        const metaFirst = authData.user.user_metadata?.first_name as string | undefined;
        const metaLast = authData.user.user_metadata?.last_name as string | undefined;
        await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: authData.user.id,
            role,
            first_name: metaFirst ?? "User",
            last_name: metaLast ?? "",
          }),
        }).catch(() => {});
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = getDashboardPath(role);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 bg-sage-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-sm border border-sage-100 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 mb-4">
              <Heart className="h-7 w-7 text-sage-600" aria-hidden="true" />
            </div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
              {t("auth.login.title")}
            </h1>
            <p className="text-senior-base text-gray-500">{t("auth.login.subtitle")}</p>
          </div>

          <div className="flex justify-end mb-2 -mt-2">
            <LanguageSelector />
          </div>

          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.login.emailPlaceholder")}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.login.passwordLabel")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-sage-600 hover:text-sage-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                >
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="pr-12"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
                  aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
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

            <Button type="button" size="lg" className="w-full" disabled={isLoading} onClick={() => handleSubmit(onSubmit)()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                  {t("auth.login.submitting")}
                </>
              ) : (
                t("auth.login.submit")
              )}
            </Button>

          </form>

          <button 
            type="button" 
            onClick={() => alert("JavaScript is working!")}
            style={{width:"100%",marginTop:"16px",padding:"8px",background:"red",color:"white",borderRadius:"8px",border:"none",cursor:"pointer"}}
          >
            Test JS
          </button>

          <p className="mt-6 text-center text-senior-base text-gray-500">
            {t("auth.login.noAccount")}{" "}
            <Link
              href="/register"
              className="text-sage-600 font-semibold hover:text-sage-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded"
            >
              {t("auth.login.createLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}