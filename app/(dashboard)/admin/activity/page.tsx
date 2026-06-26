import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, UserPlus, Calendar, CheckCircle,
  AlertTriangle, ShieldCheck, LogIn, LogOut, Clock
} from "lucide-react";

export const metadata: Metadata = { title: "Activity Feed – Admin" };

interface Props {
  searchParams: { page?: string };
}

const PAGE_SIZE = 30;

type EventType =
  | "booking_created"
  | "booking_completed"
  | "booking_cancelled"
  | "companion_registered"
  | "companion_approved"
  | "companion_suspended"
  | "check_in"
  | "check_out"
  | "incident_reported"
  | "incident_resolved";

interface ActivityEvent {
  id: string;
  type: EventType;
  description: string;
  actor: string;
  timestamp: string;
  severity: "info" | "success" | "warning" | "error";
}

const EVENT_CONFIG: Record<EventType, { icon: React.ElementType; color: string; label: string }> = {
  booking_created:      { icon: Calendar,      color: "bg-blue-50 text-blue-600",    label: "Booking Created" },
  booking_completed:    { icon: CheckCircle,   color: "bg-sage-50 text-sage-600",    label: "Booking Completed" },
  booking_cancelled:    { icon: Calendar,      color: "bg-gray-100 text-gray-500",   label: "Booking Cancelled" },
  companion_registered: { icon: UserPlus,      color: "bg-purple-50 text-purple-600",label: "Companion Registered" },
  companion_approved:   { icon: ShieldCheck,   color: "bg-sage-50 text-sage-600",    label: "Companion Approved" },
  companion_suspended:  { icon: ShieldCheck,   color: "bg-red-50 text-red-600",      label: "Companion Suspended" },
  check_in:             { icon: LogIn,         color: "bg-green-50 text-green-600",  label: "Check-In" },
  check_out:            { icon: LogOut,        color: "bg-green-50 text-green-600",  label: "Check-Out" },
  incident_reported:    { icon: AlertTriangle, color: "bg-orange-50 text-orange-600",label: "Incident Reported" },
  incident_resolved:    { icon: CheckCircle,   color: "bg-sage-50 text-sage-600",    label: "Incident Resolved" },
};

export default async function AdminActivityPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch recent bookings
  const { data: recentBookings } = await admin
    .from("bookings")
    .select("id, status, created_at, updated_at, scheduled_date, booked_by_profile_id, senior:profiles!bookings_senior_profile_id_fkey(first_name, last_name), activity_type:activity_types(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch recent companion profiles
  const { data: recentCompanions } = await admin
    .from("companion_profiles")
    .select("id, verification_status, created_at, updated_at, profile:profiles(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch recent check-in events
  const { data: checkInEvents } = await admin
    .from("check_in_events")
    .select("id, event_type, created_at, booking_id")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch recent incidents
  const { data: incidents } = await admin
    .from("incident_reports")
    .select("id, is_resolved, created_at, resolved_at, category, reported_by_role, reporter:profiles!incident_reports_reported_by_profile_id_fkey(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(20);

  // Build unified activity feed
  const events: ActivityEvent[] = [];

  // Bookings
  for (const b of recentBookings ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const senior = (b.senior as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actType = (b.activity_type as any);
    const seniorName = senior ? `${senior.first_name} ${senior.last_name}` : "a senior";
    const activity = actType?.name ?? "a visit";

    if (b.status === "requested") {
      events.push({
        id: `booking-created-${b.id}`,
        type: "booking_created",
        description: `New booking request: ${activity} for ${seniorName}`,
        actor: "Family",
        timestamp: b.created_at,
        severity: "info",
      });
    }
    if (b.status === "completed") {
      events.push({
        id: `booking-completed-${b.id}`,
        type: "booking_completed",
        description: `Visit completed: ${activity} for ${seniorName}`,
        actor: "Companion",
        timestamp: b.updated_at,
        severity: "success",
      });
    }
    if (b.status === "cancelled") {
      events.push({
        id: `booking-cancelled-${b.id}`,
        type: "booking_cancelled",
        description: `Booking cancelled: ${activity} for ${seniorName}`,
        actor: "Family",
        timestamp: b.updated_at,
        severity: "warning",
      });
    }
  }

  // Companions
  for (const c of recentCompanions ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (c.profile as any);
    const name = p ? `${p.first_name} ${p.last_name}` : "A companion";

    events.push({
      id: `companion-registered-${c.id}`,
      type: "companion_registered",
      description: `${name} applied to become a companion`,
      actor: name,
      timestamp: c.created_at,
      severity: "info",
    });

    if (c.verification_status === "approved") {
      events.push({
        id: `companion-approved-${c.id}`,
        type: "companion_approved",
        description: `${name} was approved as a companion`,
        actor: "Admin",
        timestamp: c.updated_at,
        severity: "success",
      });
    }
    if (c.verification_status === "suspended") {
      events.push({
        id: `companion-suspended-${c.id}`,
        type: "companion_suspended",
        description: `${name}'s account was suspended`,
        actor: "Admin",
        timestamp: c.updated_at,
        severity: "error",
      });
    }
  }

  // Check-in events
  for (const e of checkInEvents ?? []) {
    events.push({
      id: `checkin-${e.id}`,
      type: e.event_type === "check_in" ? "check_in" : "check_out",
      description: e.event_type === "check_in"
        ? "Companion checked in to a visit"
        : "Companion checked out of a visit",
      actor: "Companion",
      timestamp: e.created_at,
      severity: "success",
    });
  }

  // Incidents
  for (const i of incidents ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = (i.reporter as any);
    const reporterName = reporter ? `${reporter.first_name} ${reporter.last_name}` : i.reported_by_role ?? "Unknown";
    const category = (i.category as string).replace(/_/g, " ");

    events.push({
      id: `incident-${i.id}`,
      type: "incident_reported",
      description: `Incident reported: ${category} by ${reporterName}`,
      actor: reporterName,
      timestamp: i.created_at,
      severity: "warning",
    });

    if (i.is_resolved && i.resolved_at) {
      events.push({
        id: `incident-resolved-${i.id}`,
        type: "incident_resolved",
        description: `Incident resolved: ${category}`,
        actor: "Admin",
        timestamp: i.resolved_at,
        severity: "success",
      });
    }
  }

  // Sort all events by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Paginate
  const totalPages = Math.ceil(events.length / PAGE_SIZE);
  const paginated = events.slice(from, to + 1);

  const severityBadge: Record<string, string> = {
    info:    "bg-blue-100 text-blue-800",
    success: "bg-sage-100 text-sage-800",
    warning: "bg-orange-100 text-orange-800",
    error:   "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Activity Feed</h1>
        <p className="text-senior-lg text-gray-500">Real-time stream of platform events.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-senior-base">
            <Activity className="h-5 w-5 text-sage-500" />
            Recent Events
            <span className="text-sm font-normal text-gray-400">({events.length} total)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginated.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {paginated.map((event) => {
                const config = EVENT_CONFIG[event.type];
                const Icon = config.icon;
                return (
                  <div key={event.id} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{event.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${severityBadge[event.severity]}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">by {event.actor}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a href={`/admin/activity?page=${page - 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">← Previous</a>
                )}
                {page < totalPages && (
                  <a href={`/admin/activity?page=${page + 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Next →</a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}