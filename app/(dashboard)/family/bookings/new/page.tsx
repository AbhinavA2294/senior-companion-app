import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "@/components/bookings/booking-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import type { Profile, SeniorProfile, ActivityType } from "@/types";

export const metadata: Metadata = { title: "New Booking" };

interface Props {
  searchParams: { senior?: string };
}

export default async function NewFamilyBookingPage({ searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "family") redirect("/login");

  // Fetch linked seniors
  const { data: relationships } = await supabase
    .from("family_senior_relationships")
    .select("senior_profile_id, relationship_label")
    .eq("family_profile_id", profile.id);
  const linkedIds = relationships?.map((r) => r.senior_profile_id) ?? [];

  // Fetch managed seniors
  const { data: managedRaw } = await supabase
    .from("profiles")
    .select("id")
    .eq("managed_by_profile_id", profile.id)
    .eq("is_managed", true);
  const managedIds = managedRaw?.map((p) => p.id) ?? [];

  const allSeniorIds = Array.from(new Set([...linkedIds, ...managedIds]));

  let seniors: { profile: Profile; seniorProfile: SeniorProfile | null; relationshipLabel?: string }[] = [];

  if (allSeniorIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("*")
      .in("id", allSeniorIds);
    const { data: detailsRaw } = await supabase
      .from("senior_profiles")
      .select("*")
      .in("profile_id", allSeniorIds);

    seniors = (profilesRaw ?? []).map((p) => ({
      profile: p as unknown as Profile,
      seniorProfile: (detailsRaw?.find((d) => d.profile_id === p.id) ?? null) as SeniorProfile | null,
      relationshipLabel: relationships?.find((r) => r.senior_profile_id === p.id)?.relationship_label,
    }));
  }

  // Fetch active activity types
  const { data: activityTypesRaw } = await supabase
    .from("activity_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const activityTypes = (activityTypesRaw ?? []) as unknown as ActivityType[];

  if (seniors.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-6">New Booking</h1>
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <div>
            <p className="font-medium">No seniors linked to your account</p>
            <p className="text-sm mt-1">
              You need to{" "}
              <Link href="/family/seniors/add" className="underline font-medium">
                add a senior
              </Link>{" "}
              before you can create a booking.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  const defaultSeniorId = searchParams.senior && allSeniorIds.includes(searchParams.senior)
    ? searchParams.senior
    : undefined;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/family/bookings" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          ← Back to bookings
        </Link>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">New Booking</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Request a companion visit in a few simple steps.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <BookingWizard
            seniors={seniors}
            activityTypes={activityTypes}
            defaultSeniorId={defaultSeniorId}
            successRedirect="/family/bookings"
          />
        </CardContent>
      </Card>
    </div>
  );
}
