import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShieldCheck, AlertTriangle, Activity } from "lucide-react";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          Admin Overview
        </h1>
        <p className="text-senior-lg text-gray-500">
          Manage companions, bookings, verifications, and platform health.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Total users",
            value: "—",
            icon: Users,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Active bookings",
            value: "—",
            icon: Calendar,
            color: "bg-sage-50 text-sage-600",
          },
          {
            label: "Pending verifications",
            value: "—",
            icon: ShieldCheck,
            color: "bg-warm-50 text-warm-600",
          },
          {
            label: "Open incidents",
            value: "—",
            icon: AlertTriangle,
            color: "bg-red-50 text-red-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-display text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Recent platform activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-gray-300 mb-4" aria-hidden="true" />
            <p className="text-senior-lg font-medium text-gray-500 mb-2">
              Activity feed coming soon
            </p>
            <p className="text-senior-base text-gray-400 max-w-sm">
              Booking updates, new companion registrations, and incident flags will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
