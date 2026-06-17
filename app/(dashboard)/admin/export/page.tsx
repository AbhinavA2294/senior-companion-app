import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ExportButton } from "./_export-button";

export const metadata: Metadata = { title: "Export Metrics – Admin" };

export default async function AdminExportPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Export Pilot Metrics</h1>
        <p className="text-senior-lg text-gray-500">Download booking and visit data as CSV for analysis.</p>
      </div>

      <Card className="border-0 shadow-sm max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-senior-base">
            <TrendingUp className="h-5 w-5 text-sage-500" />
            Pilot Metrics CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            The export includes all bookings with the following fields:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {[
              "Booking ID", "Status", "Scheduled Date", "Scheduled Time",
              "Duration (hours)", "Activity Type", "Senior Name", "Companion Name",
              "Check-in Time", "Check-out Time", "Late Check-in", "Late Check-out", "Visit Note"
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <ExportButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
