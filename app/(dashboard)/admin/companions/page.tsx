import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Companions – Admin" };

type StatusFilter = "pending" | "under_review" | "approved" | "suspended" | "rejected";

const TABS: { label: string; value: StatusFilter }[] = [
  { label: "Pending Applications", value: "pending" },
  { label: "Under Review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Suspended", value: "suspended" },
  { label: "Rejected", value: "rejected" },
];

interface Props {
  searchParams: { status?: string };
}

export default async function AdminCompanionsPage({ searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/login");

  const activeStatus = (searchParams.status ?? "pending") as StatusFilter;

  const { data: companions } = await supabase
    .from("companion_profiles")
    .select(
      `id, verification_status, created_at, background_check_consent, code_of_conduct_accepted,
       profile:profiles(id, first_name, last_name, city, state, created_at)`
    )
    .eq("verification_status", activeStatus)
    .order("created_at", { ascending: true });

  // Counts for each status
  const countQueries = await Promise.all(
    TABS.map(async (tab) => {
      const { count } = await supabase
        .from("companion_profiles")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", tab.value);
      return { status: tab.value, count: count ?? 0 };
    })
  );
  const counts = Object.fromEntries(countQueries.map(({ status, count }) => [status, count]));

  const badgeVariant = (s: string) =>
    s === "approved"
      ? ("success" as const)
      : s === "suspended" || s === "rejected"
      ? ("destructive" as const)
      : ("warning" as const);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Companions</h1>
        <p className="text-senior-lg text-gray-500">
          Review applications, approve or suspend companions.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/companions?status=${tab.value}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeStatus === tab.value
                ? "bg-sage-500 text-white border-sage-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-sage-300"
            }`}
          >
            {tab.label}
            {counts[tab.value] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeStatus === tab.value ? "bg-white/20" : "bg-gray-100"}`}>
                {counts[tab.value]}
              </span>
            )}
          </Link>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sage-600" />
            {TABS.find((t) => t.value === activeStatus)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!companions || companions.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500">No companions in this category</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {companions.map((c) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = c.profile as any;
                const name = p ? `${p.first_name} ${p.last_name}` : "Unknown";
                const location = p?.city && p?.state ? `${p.city}, ${p.state}` : null;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/admin/companions/${c.id}`}
                      className="flex items-center justify-between gap-4 py-4 hover:bg-gray-50 rounded-xl px-3 -mx-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{name}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-sm text-gray-500">
                          {location && <span>{location}</span>}
                          <span>Applied {new Date(c.created_at).toLocaleDateString()}</span>
                          {!(c as Record<string, unknown>).background_check_consent && (
                            <span className="text-amber-600 font-medium">No BG consent</span>
                          )}
                          {!(c as Record<string, unknown>).code_of_conduct_accepted && (
                            <span className="text-amber-600 font-medium">No CoC</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge
                          variant={badgeVariant(c.verification_status as string)}
                          className="capitalize hidden sm:flex"
                        >
                          {(c.verification_status as string).replace("_", " ")}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <span><ChevronRight className="h-4 w-4" /></span>
                        </Button>
                      </div>
                    </Link>
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
