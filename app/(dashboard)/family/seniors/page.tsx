import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SeniorCard } from "@/components/seniors/senior-card";
import { Users, Plus } from "lucide-react";
import type { Profile, SeniorProfile } from "@/types";

export const metadata: Metadata = { title: "My Seniors" };

export default async function FamilySeniorsPage() {
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

  // Linked seniors via relationship table
  const { data: relationships } = await supabase
    .from("family_senior_relationships")
    .select("senior_profile_id, relationship_label")
    .eq("family_profile_id", profile.id);

  const linkedIds = relationships?.map((r) => r.senior_profile_id) ?? [];

  // Managed seniors
  const { data: managedRaw } = await supabase
    .from("profiles")
    .select("id")
    .eq("managed_by_profile_id", profile.id)
    .eq("is_managed", true);

  const managedIds = managedRaw?.map((p) => p.id) ?? [];
  const allIds = Array.from(new Set([...linkedIds, ...managedIds]));

  let seniors: { profile: Profile; seniorProfile: SeniorProfile | null; relationshipLabel?: string }[] = [];

  if (allIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("*")
      .in("id", allIds);

    const { data: detailsRaw } = await supabase
      .from("senior_profiles")
      .select("*")
      .in("profile_id", allIds);

    seniors = (profilesRaw ?? []).map((p) => ({
      profile: p as unknown as Profile,
      seniorProfile: (detailsRaw?.find((d) => d.profile_id === p.id) ?? null) as SeniorProfile | null,
      relationshipLabel: relationships?.find((r) => r.senior_profile_id === p.id)?.relationship_label,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-senior-3xl font-bold text-gray-900">Seniors I Support</h1>
          <p className="text-senior-lg text-gray-500 mt-1">
            Manage profiles and book companions for your loved ones.
          </p>
        </div>
        <Button asChild>
          <Link href="/family/seniors/add">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Senior
          </Link>
        </Button>
      </div>

      {seniors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-gray-200 mb-5" aria-hidden="true" />
          <h2 className="text-senior-xl font-semibold text-gray-500 mb-2">No seniors linked yet</h2>
          <p className="text-senior-base text-gray-400 mb-8 max-w-sm">
            Add a family member to manage companion visits on their behalf.
          </p>
          <Button asChild size="lg">
            <Link href="/family/seniors/add">
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              Add your first senior
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {seniors.map(({ profile: sp, seniorProfile, relationshipLabel }) => (
            <SeniorCard
              key={sp.id}
              profile={sp}
              seniorProfile={seniorProfile}
              relationshipLabel={relationshipLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
