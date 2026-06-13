import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { IncidentResolveForm } from "./_resolve";

export const metadata: Metadata = { title: "Incident Reports – Admin" };

interface Props {
  searchParams: { resolved?: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  senior_did_not_answer: "Senior did not answer",
  companion_delayed: "Companion delayed",
  senior_felt_unwell: "Senior felt unwell",
  transportation_issue: "Transportation issue",
  safety_concern: "Safety concern",
  inappropriate_behavior: "Inappropriate behavior",
  lost_property: "Lost property",
  other: "Other",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default async function AdminIncidentReportsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const showResolved = searchParams.resolved === "1";

  const { data: reports } = await supabase
    .from("incident_reports")
    .select(`
      id, category, description, severity, admin_notes,
      is_resolved, resolved_at, created_at, reported_by_role,
      reporter:profiles!incident_reports_reported_by_profile_id_fkey(first_name, last_name),
      booking:bookings(id, scheduled_date, activity_type:activity_types(name))
    `)
    .eq("is_resolved", showResolved)
    .order("created_at", { ascending: false });

  const { count: openCount } = await supabase.from("incident_reports").select("id", { count: "exact", head: true }).eq("is_resolved", false);
  const { count: resolvedCount } = await supabase.from("incident_reports").select("id", { count: "exact", head: true }).eq("is_resolved", true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Incident Reports</h1>
        <p className="text-senior-lg text-gray-500">Review, add notes, and resolve submitted incident reports.</p>
      </div>

      <div className="flex gap-2">
        <a href="/admin/reports" className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!showResolved ? "bg-sage-500 text-white border-sage-500" : "bg-white text-gray-600 border-gray-200 hover:border-sage-300"}`}>
          <AlertTriangle className="h-4 w-4" />
          Open
          {(openCount ?? 0) > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${!showResolved ? "bg-white/20" : "bg-red-100 text-red-700"}`}>{openCount}</span>}
        </a>
        <a href="/admin/reports?resolved=1" className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showResolved ? "bg-sage-500 text-white border-sage-500" : "bg-white text-gray-600 border-gray-200 hover:border-sage-300"}`}>
          <CheckCircle className="h-4 w-4" />
          Resolved ({resolvedCount ?? 0})
        </a>
      </div>

      <div className="space-y-4">
        {!reports || reports.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500">{showResolved ? "No resolved reports yet." : "No open incident reports. Great!"}</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = report as any;
            const reporter = r.reporter;
            const booking = r.booking;
            return (
              <Card key={report.id} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[report.severity as string] ?? "bg-gray-100 text-gray-700"}`}>
                          {(report.severity as string).charAt(0).toUpperCase() + (report.severity as string).slice(1)} severity
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {CATEGORY_LABELS[report.category as string] ?? report.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Reported by: {reporter ? `${reporter.first_name} ${reporter.last_name}` : "Unknown"} {r.reported_by_role ? `(${r.reported_by_role})` : ""}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {booking && (
                    <p className="text-xs text-gray-500">
                      Booking: <a href={`/admin/bookings/${booking.id}`} className="text-sage-600 hover:underline font-medium">
                        {booking.activity_type?.name ?? "Visit"} on {booking.scheduled_date ? new Date(`${booking.scheduled_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </a>
                    </p>
                  )}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{report.description}</p>
                  </div>
                  {report.admin_notes && (
                    <div className="rounded-lg bg-sage-50 border border-sage-200 p-3">
                      <p className="text-xs text-sage-600 mb-1 font-medium">Admin notes</p>
                      <p className="text-sm text-sage-800">{report.admin_notes}</p>
                    </div>
                  )}
                  {report.resolved_at && <p className="text-xs text-gray-400">Resolved on {new Date(report.resolved_at).toLocaleDateString()}</p>}
                  {!showResolved && <IncidentResolveForm incidentId={report.id} />}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}