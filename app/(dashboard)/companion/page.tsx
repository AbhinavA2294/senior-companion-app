import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getServerTranslation } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, ShieldCheck, AlertTriangle, CheckCircle, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Companion Dashboard" };

export default async function CompanionDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile || profile.role !== "companion") redirect("/login");

  const { data: companionProfile } = await supabase.from("companion_profiles").select("id, verification_status").eq("profile_id", profile.id).single();

  const verificationStatus = companionProfile?.verification_status ?? "pending";
  const isPending = verificationStatus === "pending" || verificationStatus === "under_review";
  const isApproved = verificationStatus === "approved";

  const admin = createAdminClient();

  const { data: completedBookings } = await admin
    .from("bookings")
    .select("id, status, scheduled_date, scheduled_start_time, duration_hours, checked_in_at, checked_out_at, visit_note, activity_type:activity_types(name)")
    .eq("companion_profile_id", companionProfile?.id ?? "")
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(10);

  const totalHours = (completedBookings ?? []).reduce((acc, b) => acc + ((b.duration_hours as number) ?? 0), 0);

  const { t } = getServerTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          {t("companion.dashboard.pageTitle")}
        </h1>
        <p className="text-senior-lg text-gray-500">{t("companion.dashboard.subtitle")}</p>
      </div>

      {isPending && (
        <Alert variant="warning">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>{t("companion.dashboard.verificationAlertTitle")}</AlertTitle>
          <AlertDescription>
            {t("companion.dashboard.verificationAlertDesc")}{" "}
            <Link href="/companion/verification" className="font-semibold underline">
              {t("companion.dashboard.viewVerificationStatus")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-sage-100">
            <ShieldCheck className="h-7 w-7 text-sage-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-senior-base">
              {t("companion.dashboard.verificationStatusLabel")}
            </p>
            <Badge variant={isApproved ? "success" : "warning"} className="mt-1 capitalize">
              {verificationStatus.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="default" asChild>
          <Link href="/companion/verification">{t("companion.dashboard.viewDetails")}</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: t("companion.dashboard.statHours"),  value: totalHours > 0 ? String(Math.round(totalHours)) : "0", icon: Clock },
          { label: t("companion.dashboard.statVisits"), value: String(completedBookings?.length ?? 0), icon: Star },
          { label: t("companion.dashboard.statStatus"), value: isApproved ? t("companion.dashboard.statusActive") : t("companion.dashboard.statusPending"), icon: ShieldCheck },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage-50 text-sage-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-sage-500" />
            {t("companion.dashboard.completedTitle")}
          </CardTitle>
          <CardDescription>{t("companion.dashboard.completedSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!completedBookings || completedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">{t("companion.dashboard.noVisits")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {completedBookings.map((b) => {
                const actType = (b.activity_type as { name?: string } | null);
                return (
                  <li key={b.id} className="py-4 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {actType?.name ?? t("companion.dashboard.companionVisit")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b.scheduled_date ? formatDate(b.scheduled_date) : "—"}
                        </p>
                      </div>
                      <Badge variant="success" className="flex-shrink-0 text-xs">
                        {t("companion.dashboard.completedBadge")}
                      </Badge>
                    </div>
                    {b.visit_note && (
                      <p className="text-xs text-gray-500 italic line-clamp-2">{b.visit_note as string}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
