import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPilotMetrics, getAllPilotSettings } from "@/lib/actions/pilot-settings";
import { PILOT_CONSTRAINTS, PILOT_FLAGS } from "@/lib/pilot/config";
import { PilotSettingsForm } from "@/components/admin/pilot-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle, XCircle, Calendar, Users, Star, AlertTriangle,
  Clock, ThumbsUp, Shield, Settings, BarChart3, RefreshCw, Activity,
} from "lucide-react";

export const metadata: Metadata = { title: "Pilot Operations — Admin" };

function MetricTile({
  label, value, icon: Icon, color,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-4 flex items-start gap-3 shadow-sm`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function ConstraintRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      {allowed ? (
        <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
          <CheckCircle className="h-4 w-4" /> Allowed
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-700 text-xs font-medium">
          <XCircle className="h-4 w-4" /> Blocked
        </span>
      )}
    </div>
  );
}

function FlagRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {enabled ? "ON" : "OFF"}
      </span>
    </div>
  );
}

export default async function AdminPilotPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin");

  const [metrics, settingRows] = await Promise.all([
    getPilotMetrics(),
    getAllPilotSettings(),
  ]);

  const metricTiles = [
    { label: "Completed Bookings",      value: metrics.completedBookings,        icon: CheckCircle,  color: "bg-green-100 text-green-600" },
    { label: "Cancelled Bookings",      value: metrics.cancelledBookings,         icon: XCircle,      color: "bg-red-100 text-red-600" },
    { label: "Pending Bookings",        value: metrics.pendingBookings,           icon: Calendar,     color: "bg-blue-100 text-blue-600" },
    { label: "Active Right Now",        value: metrics.activeBookings,            icon: Activity,     color: "bg-sage-100 text-sage-600" },
    { label: "Unique Seniors Served",   value: metrics.uniqueSeniors,             icon: Users,        color: "bg-warm-100 text-warm-600" },
    { label: "Unique Companions Used",  value: metrics.uniqueCompanions,          icon: Users,        color: "bg-purple-100 text-purple-600" },
    { label: "Late Check-Ins",          value: metrics.lateCheckins,              icon: Clock,        color: "bg-orange-100 text-orange-600" },
    { label: "Late Check-Outs",         value: metrics.lateCheckouts,             icon: Clock,        color: "bg-orange-100 text-orange-600" },
    { label: "Open Incidents",          value: metrics.openIncidents,             icon: AlertTriangle,color: "bg-red-100 text-red-600" },
    { label: "Resolved Incidents",      value: metrics.resolvedIncidents,         icon: Shield,       color: "bg-green-100 text-green-600" },
    { label: "Avg. Star Rating",        value: metrics.avgRating,                 icon: Star,         color: "bg-yellow-100 text-yellow-600" },
    { label: "Companion Acceptance",    value: metrics.companionAcceptanceRate,   icon: ThumbsUp,     color: "bg-sage-100 text-sage-600" },
    { label: "Feedback Submissions",    value: metrics.feedbackCount,             icon: BarChart3,    color: "bg-indigo-100 text-indigo-600" },
    { label: "Avg. Feedback Rating",    value: metrics.avgFeedbackRating,         icon: Star,         color: "bg-yellow-100 text-yellow-600" },
    { label: "Would Rebook",            value: metrics.wouldRebookPct,            icon: RefreshCw,    color: "bg-green-100 text-green-600" },
    { label: "Felt Safe",              value: metrics.feltSafePct,               icon: Shield,       color: "bg-green-100 text-green-600" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          Pilot Operations
        </h1>
        <p className="text-senior-base text-gray-500">
          Pilot metrics, hard constraints, feature flags, and configurable settings.
        </p>
      </div>

      {/* Metrics grid */}
      <section>
        <h2 className="text-senior-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sage-500" />
          Pilot Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metricTiles.map((t) => (
            <MetricTile key={t.label} label={t.label} value={t.value} icon={t.icon} color={t.color} />
          ))}
        </div>
      </section>

      {/* Hard constraints + feature flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Hard Pilot Constraints
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              These cannot be changed via settings — they define the service boundary.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ConstraintRow label="Overnight bookings"         allowed={PILOT_CONSTRAINTS.allowOvernightBookings} />
            <ConstraintRow label="Emergency requests"         allowed={PILOT_CONSTRAINTS.allowEmergencyRequests} />
            <ConstraintRow label="Medical care"               allowed={PILOT_CONSTRAINTS.allowMedicalCare} />
            <ConstraintRow label="Personal care"              allowed={PILOT_CONSTRAINTS.allowPersonalCare} />
            <ConstraintRow label="Companion driving"          allowed={PILOT_CONSTRAINTS.allowCompanionDriving} />
            <ConstraintRow label="Cash payments"              allowed={PILOT_CONSTRAINTS.allowCashPayments} />
            <ConstraintRow label="Admin approves companions"  allowed={PILOT_CONSTRAINTS.requireCompanionAdminApproval} />
            <ConstraintRow label="Human reviews AI matches"   allowed={PILOT_CONSTRAINTS.requireHumanAIReview} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-sage-500" />
              Feature Flags
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Set via environment variables on the Vercel deployment.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <FlagRow label="Feedback form enabled"         enabled={PILOT_FLAGS.feedbackEnabled} />
            <FlagRow label="Voice booking enabled"         enabled={PILOT_FLAGS.voiceBookingEnabled} />
            <FlagRow label="AI matching enabled"           enabled={PILOT_FLAGS.matchingEnabled} />
            <FlagRow label="Flag first booking for review" enabled={PILOT_FLAGS.requireFirstBookingReview} />
          </CardContent>
        </Card>
      </div>

      {/* Configurable settings */}
      <section>
        <h2 className="text-senior-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
          <Settings className="h-5 w-5 text-sage-500" />
          Configurable Settings
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Changes take effect immediately for new bookings. Existing bookings are not affected.
        </p>
        <Card>
          <CardContent className="pt-6">
            <PilotSettingsForm rows={settingRows} />
          </CardContent>
        </Card>
      </section>

      {/* Quick links */}
      <section className="border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Assign Bookings", href: "/admin/bookings?status=requested" },
            { label: "Companion Applications", href: "/admin/companions?status=pending" },
            { label: "Incident Reports", href: "/admin/reports" },
            { label: "Audit Log", href: "/admin/audit" },
            { label: "Export CSV", href: "/admin/export" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

