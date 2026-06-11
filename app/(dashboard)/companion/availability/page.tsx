import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "./_form";

export const metadata: Metadata = { title: "Availability – Companion" };

export default async function CompanionAvailabilityPage() {
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
  if (profile?.role !== "companion") redirect("/login");

  const { data: cp } = await supabase
    .from("companion_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const { data: rows } = await supabase
    .from("companion_availability")
    .select("day_of_week, start_time, end_time, is_active")
    .eq("companion_profile_id", cp?.id ?? "")
    .eq("is_active", true);

  type DaySlot = { is_active: boolean; start_time: string; end_time: string };
  const initialSlots: Record<number, DaySlot> = {};
  if (rows) {
    for (const row of rows) {
      initialSlots[row.day_of_week as number] = {
        is_active: true,
        start_time: (row.start_time as string).slice(0, 5),
        end_time: (row.end_time as string).slice(0, 5),
      };
    }
  }

  return <AvailabilityForm initialSlots={initialSlots} />;
}
