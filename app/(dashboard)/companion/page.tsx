import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Star, Clock, ShieldCheck, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Companion Dashboard" };

export default async function CompanionDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "companion") redirect("/login");

  const { data: companionProfile } = await supabase
    .from("companion_profiles")
    .select("verification_status")
    .eq("profile_id", profile.id)
    .single();

  const verificationStatus = companionProfile?.verification_status ?? "pending";
  const isPending = verificationStatus === "pending" || verificationStatus === "under_review";
  const isApproved = verificationStatus === "approved";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          Companion Dashboard
        </h1>
        <p className="text-senior-lg text-gray-500">
          Manage your schedule, bookings, and companion profile.
        </p>
      </div>

      {/* Verification alert */}
      {isPending && (
        <Alert variant="warning">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Verification in progress</AlertTitle>
          <AlertDescription>
            Your companion profile is being reviewed. You&apos;ll be notified once approved and
            can start receiving booking requests.{" "}
            <Link href="/companion/verification" className="font-semibold underline">
              View verification status
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Status card */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-sage-100">
            <ShieldCheck className="h-7 w-7 text-sage-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-senior-base">Verification status</p>
            <Badge
              variant={isApproved ? "success" : "warning"}
              className="mt-1 capitalize"
            >
              {verificationStatus.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="default" asChild>
          <Link href="/companion/verification">View details</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Upcoming bookings", value: "0", icon: Calendar },
          { label: "Hours completed", value: "0", icon: Clock },
          { label: "Average rating", value: "—", icon: Star },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage-50 text-sage-600">
                  <Icon className="h-6 w-6" aria-hidden="true" />
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

      {/* Bookings placeholder */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming bookings</CardTitle>
          <CardDescription>Visits assigned to you that are coming up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
            <p className="text-senior-lg font-medium text-gray-500 mb-2">
              No upcoming bookings
            </p>
            <p className="text-senior-base text-gray-400 max-w-sm">
              {isApproved
                ? "Once seniors book with you, visits will appear here."
                : "Complete your verification to start receiving bookings."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
