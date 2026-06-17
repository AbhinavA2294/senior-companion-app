import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Audit Log – Admin" };

const PAGE_SIZE = 25;

interface Props {
  searchParams: { page?: string; action?: string };
}

const ACTION_COLORS: Record<string, string> = {
  add_internal_note:       "bg-blue-100 text-blue-800",
  issue_mock_refund:       "bg-purple-100 text-purple-800",
  mark_needs_review:       "bg-orange-100 text-orange-800",
  export_csv:              "bg-gray-100 text-gray-700",
  companion_status_update: "bg-sage-100 text-sage-800",
  check_in:                "bg-green-100 text-green-800",
  check_out:               "bg-green-100 text-green-800",
  incident_resolved:       "bg-red-100 text-red-800",
};

export default async function AdminAuditPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createAdminClient();

  let query = admin
    .from("audit_log")
    .select(`
      id, action, entity_type, entity_id, notes, created_at,
      actor:profiles!audit_log_actor_profile_id_fkey(first_name, last_name, role)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.action) {
    query = query.eq("action", searchParams.action);
  }

  const { data: logs, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Audit Log</h1>
        <p className="text-senior-lg text-gray-500">Full history of administrator actions.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-senior-base">
            <Activity className="h-5 w-5 text-sage-500" />
            Action History
            {count != null && (
              <span className="text-sm font-normal text-gray-400 ml-1">({count} total)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No audit log entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const actor = (log.actor as any);
                    const actionColor = ACTION_COLORS[log.action as string] ?? "bg-gray-100 text-gray-700";
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="py-3 px-2 text-xs text-gray-400 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium text-gray-800">
                          {actor ? `${actor.first_name} ${actor.last_name}` : "—"}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}>
                            {(log.action as string).replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500 text-xs">
                          {log.entity_type as string}
                          {log.entity_id && (
                            <span className="ml-1 text-gray-300">
                              {(log.entity_id as string).slice(0, 8)}…
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-gray-500 max-w-xs truncate">
                          {(log.notes as string) ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a href={`/admin/audit?page=${page - 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                    ← Previous
                  </a>
                )}
                {page < totalPages && (
                  <a href={`/admin/audit?page=${page + 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
