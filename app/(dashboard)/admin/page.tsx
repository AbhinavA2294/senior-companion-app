import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardMetrics } from "@/lib/actions/admin-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Calendar, ShieldCheck, AlertTriangle, Activity,
  Clock, CheckCircle, Star, RefreshCw, TrendingUp
} from "lucide-react";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const metrics = await getDashboardMetrics();

  const widgets = [
    { label: "Requested Bookings",        value: String(metrics?.requestedBookings ?? "—"),   icon: Calendar,     color: "bg-blue-50 text-blue-600",    href: "/admin/bookings?status=requested" },
    { label: "Bookings Today",            value: String(metrics?.bookingsToday ?? "—"),        icon: Calendar,     color: "bg-sage-50 text-sage-600",    href: "/admin/bookings" },
    { label: "Active Visits",             value: String(metrics?.activeVisits ?? "—"),         icon: Activity,     color: "bg-green-50 text-green-600",  href: "/admin/bookings?status=in_progress" },
    { label: "Late Check-Ins",            value: String(metrics?.lateCheckIns ?? "—"),         icon: Clock,        color: "bg-orange-50 text-orange-600",href: "/admin/bookings?late=checkin" },
    { label: "Late Check-Outs",           value: String(metrics?.lateCheckOuts ?? "—"),        icon: Clock,        color: "bg-orange-50 text-orange-600",href: "/admin/bookings?late=checkout" },
    { label: "Pending Applications",      value: String(metrics?.pendingCompanions ?? "—"),    icon: ShieldCheck,  color: "bg-warm-50 text-warm-600",    href: "/admin/companions?status=pending" },
    { label: "Open Incidents",            value: String(metrics?.openIncidents ?? "—"),        icon: AlertTriangle,color: "bg-red-50 text-red-600",      href: "/admin/reports" },
    { label: "Completed This Week",       value: String(metrics?.completedThisWeek ?? "—"),    icon: CheckCircle,  color: "bg-sage-50 text-sage-600",    href: "/admin/bookings?status=completed" },
    { label: "Repeat Bookings",           value: String(metrics?.repeatBookings ?? "—"),       icon: RefreshCw,    color: "bg-purple-50 text-purple-600",href: "/admin/bookings" },
    { label: "Average Rating",            value: String(metrics?.averageRating ?? "—"),        icon: Star,         color: "bg-yellow-50 text-yellow-600",href: "/admin/bookings" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Admin Overview</h1>
          <p className="text-senior-lg text-gray-500">Manage companions, bookings, verifications, and platform health.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin/bookings?status=requested" className="inline-flex items-center gap-2 px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors">
            <Calendar className="h-4 w-4" />
            Assign Bookings
          </Link>
          <Link href="/admin/export" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-4 w-4" />
            Export CSV
          </Link>
        </div>
      </div>

      {/* Dashboard widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {widgets.map((w) => {
          const Icon = w.icon;
          return (
            <Link key={w.label} href={w.href} className="block">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color} mb-3`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-gray-900">{w.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{w.label}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sage-500" />
              Booking Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Needs Assignment", href: "/admin/bookings?status=requested" },
              { label: "Assigned",         href: "/admin/bookings?status=assigned" },
              { label: "Confirmed",        href: "/admin/bookings?status=accepted" },
              { label: "In Progress",      href: "/admin/bookings?status=in_progress" },
              { label: "Needs Review",     href: "/admin/bookings?status=needs_review" },
              { label: "All Bookings",     href: "/admin/bookings" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block text-sm text-sage-600 hover:underline py-0.5">{l.label}</Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-sage-500" />
              Companion Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Pending Applications", href: "/admin/companions?status=pending" },
              { label: "Under Review",         href: "/admin/companions?status=under_review" },
              { label: "Approved",             href: "/admin/companions?status=approved" },
              { label: "Suspended",            href: "/admin/companions?status=suspended" },
              { label: "All Companions",       href: "/admin/companions" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block text-sm text-sage-600 hover:underline py-0.5">{l.label}</Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-sage-500" />
              Safety & Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Open Incidents",   href: "/admin/reports" },
              { label: "Resolved",         href: "/admin/reports?resolved=1" },
              { label: "Audit Log",        href: "/admin/audit" },
              { label: "Export Metrics",   href: "/admin/export" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block text-sm text-sage-600 hover:underline py-0.5">{l.label}</Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
