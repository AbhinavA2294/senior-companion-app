import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerTranslation } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SeniorCard } from "@/components/seniors/senior-card";
import { BookingCard } from "@/components/bookings/booking-card";
import { Calendar, Plus, Users, Heart, Phone } from "lucide-react";
import type { Profile, SeniorProfile, BookingWithDetails } from "@/types";

export const metadata: Metadata = { title: "Family Dashboard" };

export default async function FamilyDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "family") redirect("/login");

  const { data: relationships } = await supabase
    .from("family_senior_relationships")
    .select("senior_profile_id, relationship_label")
    .eq("family_profile_id", profile.id);

  const seniorIds = relationships?.map((r) => r.senior_profile_id) ?? [];

  const { data: managedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("managed_by_profile_id", profile.id)
    .eq("is_managed", true);

  const managedIds = managedProfiles?.map((p) => p.id) ?? [];
  const allSeniorIds = Array.from(new Set([...seniorIds, ...managedIds]));

  let seniors: { profile: Profile; seniorProfile: SeniorProfile | null; relationshipLabel?: string }[] = [];

  if (allSeniorIds.length > 0) {
    const { data: seniorProfiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", allSeniorIds);

    const { data: seniorProfileDetails } = await supabase
      .from("senior_profiles")
      .select("*")
      .in("profile_id", allSeniorIds);

    seniors = (seniorProfiles ?? []).map((sp) => ({
      profile: sp as unknown as Profile,
      seniorProfile: (seniorProfileDetails?.find((d) => d.profile_id === sp.id) ?? null) as SeniorProfile | null,
      relationshipLabel: relationships?.find((r) => r.senior_profile_id === sp.id)?.relationship_label,
    }));
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: upcomingBookingsRaw } = await supabase
    .from("bookings")
    .select(`
      *,
      activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at),
      senior_profile:profiles!senior_profile_id(id, first_name, last_name)
    `)
    .eq("booked_by_profile_id", profile.id)
    .in("status", ["requested", "assigned", "accepted"])
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(3);

  const upcomingBookings = (upcomingBookingsRaw ?? []) as unknown as BookingWithDetails[];

  const { data: pastBookingsRaw } = await supabase
    .from("bookings")
    .select(`
      *,
      activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at),
      senior_profile:profiles!senior_profile_id(id, first_name, last_name)
    `)
    .eq("booked_by_profile_id", profile.id)
    .in("status", ["completed", "cancelled"])
    .order("scheduled_date", { ascending: false })
    .limit(3);

  const pastBookings = (pastBookingsRaw ?? []) as unknown as BookingWithDetails[];
  const totalBookings = (upcomingBookings?.length ?? 0) + (pastBookings?.length ?? 0);

  const { t } = getServerTranslation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          {t("family.dashboard.pageTitle")}
        </h1>
        <p className="text-senior-lg text-gray-500">
          {t("family.dashboard.subtitle")}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-sage-600 to-sage-700 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-senior-xl mb-2">{t("family.dashboard.bookCardTitle")}</h2>
          <p className="text-sage-100 text-senior-sm mb-5">
            {t("family.dashboard.bookCardDesc")}
          </p>
          <Button size="default" variant="warm" asChild>
            <Link href="/family/bookings/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("family.dashboard.newBooking")}
            </Link>
          </Button>
        </div>
        <div className="bg-gradient-to-br from-warm-500 to-warm-600 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-senior-xl mb-2">{t("family.dashboard.addSeniorCardTitle")}</h2>
          <p className="text-warm-100 text-senior-sm mb-5">
            {t("family.dashboard.addSeniorCardDesc")}
          </p>
          <Button
            size="default"
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-warm-700"
            asChild
          >
            <Link href="/family/seniors/add">
              <Users className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("family.dashboard.addSeniorButton")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: t("family.dashboard.statSeniors"), value: String(allSeniorIds.length), icon: Users },
          { label: t("family.dashboard.statUpcoming"), value: String(upcomingBookings.length), icon: Calendar },
          { label: t("family.dashboard.statTotal"),   value: String(totalBookings), icon: Heart },
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

      {/* Seniors I Support */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-senior-xl font-semibold text-gray-900">
            {t("family.dashboard.seniorsSection")}
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/family/seniors">{t("family.dashboard.viewAll")}</Link>
          </Button>
        </div>

        {seniors.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
              <p className="text-senior-lg font-medium text-gray-500 mb-2">{t("family.dashboard.noSeniorsTitle")}</p>
              <p className="text-senior-base text-gray-400 mb-6 max-w-sm">
                {t("family.dashboard.noSeniorsDesc")}
              </p>
              <Button asChild>
                <Link href="/family/seniors/add">{t("family.dashboard.addSeniorLink")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seniors.slice(0, 4).map(({ profile: sp, seniorProfile, relationshipLabel }) => (
              <SeniorCard
                key={sp.id}
                profile={sp}
                seniorProfile={seniorProfile}
                relationshipLabel={relationshipLabel}
              />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming bookings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-senior-xl font-semibold text-gray-900">
            {t("family.dashboard.upcomingSection")}
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/family/bookings">{t("family.dashboard.viewAll")}</Link>
          </Button>
        </div>

        {upcomingBookings.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mb-3" aria-hidden="true" />
              <p className="text-senior-base font-medium text-gray-500 mb-4">{t("family.dashboard.noUpcoming")}</p>
              <Button asChild>
                <Link href="/family/bookings/new">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("family.dashboard.bookVisit")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                basePath="/family/bookings"
                showSeniorName
              />
            ))}
          </div>
        )}
      </section>

      {/* Past bookings */}
      {pastBookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-senior-xl font-semibold text-gray-900">
              {t("family.dashboard.pastSection")}
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/family/bookings?tab=past">{t("family.dashboard.viewAll")}</Link>
            </Button>
          </div>
          <div className="space-y-4">
            {pastBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                basePath="/family/bookings"
                showSeniorName
              />
            ))}
          </div>
        </section>
      )}

      {/* Support */}
      <Card className="border-0 shadow-sm bg-sage-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sage-800">
            <Phone className="h-5 w-5" aria-hidden="true" />
            {t("family.dashboard.supportTitle")}
          </CardTitle>
          <CardDescription>{t("family.dashboard.supportSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-senior-sm text-gray-600 mb-3">
            {t("family.dashboard.supportMessage")}
          </p>
          <p className="font-semibold text-sage-700 text-senior-base">
            {t("family.dashboard.supportPhone")}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t("family.dashboard.supportAvailable")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
