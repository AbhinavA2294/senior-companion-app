import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "@/components/bookings/booking-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Profile, SeniorProfile, ActivityType } from "@/types";

export const metadata: Metadata = { title: "Book a Visit" };

export default async function NewSeniorBookingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (profileRaw?.role !== "senior") redirect("/login");
  const profile = profileRaw as unknown as Profile;

  const { data: seniorDetailRaw } = await supabase
    .from("senior_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .single();
  const seniorDetail = seniorDetailRaw as unknown as SeniorProfile | null;

  const { data: activityTypesRaw } = await supabase
    .from("activity_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activityTypes = (activityTypesRaw ?? []) as unknown as ActivityType[];

  const seniors = [{ profile, seniorProfile: seniorDetail }];

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/senior/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to my visits
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">Book a Visit</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Schedule a companion visit in a few simple steps.
        </p>
      </div>

      <Alert variant="info" className="mb-6">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm">
          Need help? Call us at <strong>1-800-555-2273</strong> and we will help you book over the phone.
        </p>
      </Alert>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <BookingWizard
            seniors={seniors}
            activityTypes={activityTypes}
            defaultSeniorId={profile.id}
            successRedirect="/senior/bookings"
          />
        </CardContent>
      </Card>
    </div>
  );
}
