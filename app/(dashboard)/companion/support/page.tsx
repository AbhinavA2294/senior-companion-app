import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, FileText, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Support – Companion" };

export default async function CompanionSupportPage() {
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
  if (profile?.role !== "companion") redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">Support</h1>
        <p className="text-senior-lg text-gray-500">
          We&apos;re here to help. Reach out if you have questions about your application,
          bookings, or anything else.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Contact our team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50">
              <Phone className="h-5 w-5 text-sage-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Phone support</p>
              <p className="text-senior-lg font-bold text-sage-700 mt-0.5">1-800-555-2273</p>
              <p className="text-sm text-gray-500 mt-0.5">Monday–Friday, 8 AM–6 PM local time</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50">
              <Mail className="h-5 w-5 text-sage-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Email support</p>
              <p className="text-sage-700 mt-0.5">companions@seniorcompanion.example.com</p>
              <p className="text-sm text-gray-500 mt-0.5">We respond within one business day.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Common topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-800">Verification &amp; background check</p>
              <p className="text-sm text-gray-500">
                Questions about your application status or background check process.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-800">Booking or visit issues</p>
              <p className="text-sm text-gray-500">
                Problems with a scheduled visit, cancellations, or reporting an incident.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-800">Emergency during a visit</p>
              <p className="text-sm text-gray-500">
                If there is a medical emergency or urgent safety concern during a visit,
                call 911 first, then call our emergency line: <strong>1-800-555-9111</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
