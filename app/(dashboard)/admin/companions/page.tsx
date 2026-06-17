import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ChevronRight, Star } from "lucide-react";

export const metadata: Metadata = { title: "Companions – Admin" };

const TABS = [
  { label: "Pending Applications", value: "pending" },
  { label: "Under Review",         value: "under_review" },
  { label: "Approved",             value: "approved" },
  { label: "Suspended",            value: "suspended" },
  { label: "Rejected",             value: "rejected" },
] as const;

const PAGE_SIZE = 15;

interface Props {
  searchParams: { status?: string; search?: string; page?: string };
}

export default async function AdminCompanionsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const activeStatus = searchParams.status ?? "pending";
  const search = searchParams.search ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createAdminClient();

  const { data: companions, count } = await admin
    .from("companion_profiles")
    .select(`
      id, verification_status, background_check_completed,
      background_check_status, code_of_conduct_accepted,
      hourly_rate, max_travel_miles, languages_spoken,
      profile:profiles(id, first_name, last_name, phone, city, state, created_at)
    `, { count: "exact" })
    .eq("verification_status", activeStatus)
    .order("created_at", { ascending: false })
    .range(from, to);

  const countQueries = await Promise.all(
    TABS.map(async (tab) => {
      const { count: c } = await admin.from("companion_profiles").select("id", { count: "exact", head: true }).eq("verification_status", tab.value);
      return { status: tab.value, count: c ?? 0 };
    })
  );
  const counts = Object.fromEntries(countQueries.map(({ status, count: c }) => [status, c]));

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const filtered = search
    ? (companions ?? []).filter((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = (c.profile as any);
        const name = p ? `${p.first_name} ${p.last_name}`.toLowerCase() : "";
        return name.includes(search.toLowerCase());
      })
    : (companions ?? []);

  const verBadge = (s: string) =>
    s === "approved" ? ("success" as const)
    : s === "suspended" || s === "rejected" ? ("destructive" as const)
    : ("warning" as const);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Companions</h1>
        <p className="text-senior-lg text-gray-500">Review applications, approve or suspend companions.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <form method="GET" action="/admin/companions">
          <input type="hidden" name="status" value={activeStatus} />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search companion name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
        </form>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          const tabCount = counts[tab.value] ?? 0;
          return (
            <Link
              key={tab.value}
              href={`/admin/companions?status=${tab.value}${search ? `&search=${search}` : ""}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isActive ? "bg-sage-500 text-white border-sage-500" : "bg-white text-gray-600 border-gray-200 hover:border-sage-300"
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

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-senior-base flex items-center gap-2">
            <Users className="h-5 w-5 text-sage-500" />
            {TABS.find(t => t.value === activeStatus)?.label}
            <span className="text-sm font-normal text-gray-400">({count ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No companions in this category.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">BG Check</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="py-3 px-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((c) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const p = (c.profile as any);
                      return (
                        <tr key={c.id} className="hover:bg-gray-50 group">
                          <td className="py-3 px-2 font-medium text-gray-900">
                            {p ? `${p.first_name} ${p.last_name}` : "—"}
                            <div className="text-xs text-gray-400 font-normal">{p?.phone ?? ""}</div>
                          </td>
                          <td className="py-3 px-2 text-gray-500 text-xs">
                            {p?.city && p?.state ? `${p.city}, ${p.state}` : "—"}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            ${(c.hourly_rate as number).toFixed(2)}/hr
                          </td>
                          <td className="py-3 px-2">
                            {c.background_check_completed ? (
                              <span className="text-xs text-sage-700 font-medium">✓ Complete</span>
                            ) : (
                              <span className="text-xs text-gray-400">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={verBadge(c.verification_status as string)} className="capitalize text-xs">
                              {(c.verification_status as string).replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Link href={`/admin/companions/${c.id}`} className="text-sage-600 hover:underline flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              Review <ChevronRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={`/admin/companions?status=${activeStatus}&page=${page - 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">← Previous</Link>
                    )}
                    {page < totalPages && (
                      <Link href={`/admin/companions?status=${activeStatus}&page=${page + 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Next →</Link>
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
