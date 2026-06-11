import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookings – Admin" };

const TABS = [
  { label: "Needs Assignment", value: "requested" },
  { label: "Assigned", value: "assigned" },
  { label: "Confirmed", value: "accepted" },
  { label: "Needs Review", value: "needs_review" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface Props {
  searchParams: { status?: string };
}

export default async function AdminBookingsPage({ searchParams }: Props) {
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

  const activeStatus = (searchParams.status ?? "requested") as TabValue;

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      activity_type:activity_types(name),
      senior:profiles!bookings_senior_profile_id_fkey(first_name, last_name)
    `)
    .eq("status", activeStatus)
    .order("scheduled_date")
    .order("scheduled_start_time");

  const countQueries = await Promise.all(
    TABS.map(async (tab) => {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", tab.value);
      return { status: tab.value, count: count ?? 0 };
    })
  );
  const counts = Object.fromEntries(countQueries.map(({ status, count }) => [status, count]));

  const badgeVariant = (s: string) =>
    s === "accepted"
      ? ("success" as const)
      : s === "needs_review"
      ? ("destructive" as const)
      : ("warning" as const);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Bookings</h1>
        <p className="text-senior-lg text-gray-500">
          Assign companions to requested bookings and monitor confirmed visits.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/bookings?status=${tab.value}`}
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
          <CardTitle>{TABS.find((t) => t.value === activeStatus)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500">No bookings in this category</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {bookings.map((b) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const actType = b.activity_type as any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const senior = b.senior as any;
                const seniorName = senior ? `${senior.first_name} ${senior.last_name}` : "—";
                return (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="flex items-center justify-between gap-4 py-4 hover:bg-gray-50 rounded-xl px-3 -mx-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {actType?.name ?? "Companion Visit"}
                          <span className="font-normal text-gray-500 ml-2">for {seniorName}</span>
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {b.scheduled_date ? formatDate(b.scheduled_date) : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {b.scheduled_start_time ? formatTime(b.scheduled_start_time) : "—"}
                            {b.duration_hours ? ` · ${b.duration_hours}h` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={badgeVariant(b.status)} className="capitalize hidden sm:flex">
                          {(b.status as string).replace("_", " ")}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
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
