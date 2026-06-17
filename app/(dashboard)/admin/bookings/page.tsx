import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronRight, Search } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";

export const metadata: Metadata = { title: "Bookings – Admin" };

const TABS = [
  { label: "All",              value: "all" },
  { label: "Needs Assignment", value: "requested" },
  { label: "Assigned",         value: "assigned" },
  { label: "Confirmed",        value: "accepted" },
  { label: "In Progress",      value: "in_progress" },
  { label: "Completed",        value: "completed" },
  { label: "Needs Review",     value: "needs_review" },
  { label: "Cancelled",        value: "cancelled" },
] as const;

const PAGE_SIZE = 15;

interface Props {
  searchParams: { status?: string; search?: string; page?: string; late?: string };
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const activeStatus = searchParams.status ?? "all";
  const search = searchParams.search ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const lateFilter = searchParams.late;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createAdminClient();

  let query = admin
    .from("bookings")
    .select(`
      id, status, scheduled_date, scheduled_start_time, duration_hours,
      late_checkin_flag, late_checkout_flag,
      activity_type:activity_types(name),
      senior:profiles!bookings_senior_profile_id_fkey(first_name, last_name),
      companion_profile:companion_profiles(profile:profiles(first_name, last_name))
    `, { count: "exact" })
    .order("scheduled_date", { ascending: false })
    .order("scheduled_start_time", { ascending: false })
    .range(from, to);

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }
  if (lateFilter === "checkin") {
    query = query.eq("late_checkin_flag", true);
  } else if (lateFilter === "checkout") {
    query = query.eq("late_checkout_flag", true);
  }

  const { data: bookings, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Count per tab
  const countQueries = await Promise.all(
    TABS.filter(t => t.value !== "all").map(async (tab) => {
      const { count: c } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", tab.value);
      return { status: tab.value, count: c ?? 0 };
    })
  );
  const counts = Object.fromEntries(countQueries.map(({ status, count: c }) => [status, c]));

  // Filter by search client-side (simple name match)
  const filtered = search
    ? (bookings ?? []).filter((b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = (b.senior as any);
        const name = s ? `${s.first_name} ${s.last_name}`.toLowerCase() : "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const at = (b.activity_type as any)?.name?.toLowerCase() ?? "";
        return name.includes(search.toLowerCase()) || at.includes(search.toLowerCase());
      })
    : (bookings ?? []);

  function buildHref(params: Record<string, string>) {
    const p = new URLSearchParams({ status: activeStatus, ...params });
    if (search) p.set("search", search);
    return `/admin/bookings?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Bookings</h1>
        <p className="text-senior-lg text-gray-500">Assign companions and monitor all visits.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <form method="GET" action="/admin/bookings">
          <input type="hidden" name="status" value={activeStatus} />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search senior or activity..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
        </form>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          const tabCount = tab.value === "all" ? (count ?? 0) : (counts[tab.value] ?? 0);
          return (
            <Link
              key={tab.value}
              href={`/admin/bookings?status=${tab.value}${search ? `&search=${search}` : ""}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-sage-500 text-white border-sage-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-sage-300"
              }`}
            >
              {tab.label}
              {tabCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20" : "bg-gray-100"}`}>
                  {tabCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Late filters */}
      {(lateFilter) && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-orange-700 font-medium">
            Filtering: {lateFilter === "checkin" ? "Late Check-Ins" : "Late Check-Outs"}
          </span>
          <Link href="/admin/bookings" className="text-xs text-gray-400 hover:underline">Clear</Link>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-senior-base">
            {TABS.find(t => t.value === activeStatus)?.label ?? "All"}
            <span className="ml-2 text-sm font-normal text-gray-400">({count ?? 0} total)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Senior</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Companion</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="py-3 px-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((b) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const senior = (b.senior as any);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const actType = (b.activity_type as any);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const companion = (b.companion_profile as any)?.profile;
                      return (
                        <tr key={b.id} className="hover:bg-gray-50 group">
                          <td className="py-3 px-2 font-medium text-gray-900">
                            {senior ? `${senior.first_name} ${senior.last_name}` : "—"}
                          </td>
                          <td className="py-3 px-2 text-gray-600">{actType?.name ?? "—"}</td>
                          <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              {b.scheduled_date ? formatDate(b.scheduled_date) : "—"}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {b.scheduled_start_time ? formatTime(b.scheduled_start_time) : "—"}
                              {b.duration_hours ? ` · ${b.duration_hours}h` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {companion ? `${companion.first_name} ${companion.last_name}` : (
                              <span className="text-gray-300 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <BookingStatusBadge status={b.status as import("@/types").BookingStatus} />
                              {b.late_checkin_flag && (
                                <Badge variant="warning" className="text-xs">Late check-in</Badge>
                              )}
                              {b.late_checkout_flag && (
                                <Badge variant="warning" className="text-xs">Late check-out</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Link href={`/admin/bookings/${b.id}`} className="text-sage-600 hover:underline flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              View <ChevronRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages} · {count} total
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                        ← Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                        Next →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
