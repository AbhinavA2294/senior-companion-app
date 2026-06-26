import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Star, PlusCircle } from "lucide-react";
import { SeniorRatingsClient } from "./SeniorRatingsClient";

export default async function SeniorRatingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name")
    .eq("user_id", user.id)
    .single();
  if (!profile) redirect("/login");

  // Ratings already submitted
  const { data: ratings } = await supabase
    .from("ratings")
    .select(`
      id, rating, comment, created_at,
      profiles!ratings_rated_profile_id_fkey (first_name, last_name)
    `)
    .eq("rated_by_profile_id", profile.id)
    .order("created_at", { ascending: false });

  // Completed bookings not yet reviewed
  const { data: reviewableBookings } = await supabase
    .from("bookings")
    .select(`
      id, scheduled_start_time,
      companion_profiles!bookings_companion_profile_id_fkey (
        id,
        profiles!companion_profiles_profile_id_fkey (first_name, last_name)
      )
    `)
    .eq("senior_profile_id", profile.id)
    .in("status", ["completed", "needs_review"])
    .not("id", "in", `(${(ratings ?? []).map(r => `'${r.id}'`).join(",") || "'00000000-0000-0000-0000-000000000000'"})`)

  return (
    <SeniorRatingsClient
      profileId={profile.id}
      ratings={ratings ?? []}
      reviewableBookings={reviewableBookings ?? []}
    />
  );
}