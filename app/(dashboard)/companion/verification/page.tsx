import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, ClipboardList, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Verification Status – Companion" };

const STATUS_META = {
  not_submitted: { label: "Not submitted", variant: "secondary" as const, icon: Clock },
  submitted: { label: "Submitted", variant: "warning" as const, icon: Clock },
  under_review: { label: "Under review", variant: "warning" as const, icon: Clock },
  verified: { label: "Verified", variant: "success" as const, icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: AlertTriangle },
  not_requested: { label: "Not requested", variant: "secondary" as const, icon: Clock },
  requested: { label: "Requested", variant: "warning" as const, icon: Clock },
  in_progress: { label: "In progress", variant: "warning" as const, icon: Clock },
  completed: { label: "Completed", variant: "success" as const, icon: CheckCircle },
  pending: { label: "Pending review", variant: "warning" as const, icon: Clock },
  approved: { label: "Approved", variant: "success" as const, icon: CheckCircle },
  suspended: { label: "Suspended", variant: "destructive" as const, icon: AlertTriangle },
} as const;

export default async function CompanionVerificationPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "companion") redirect("/login");

  const { data: cp } = await supabase
    .from("companion_profiles")
    .select(
      "id, verification_status, id_verification_status, id_verification_notes, id_verified_at, background_check_status, background_check_consent, background_check_admin_notes, background_check_requested_at, background_check_completed_at, code_of_conduct_accepted, code_of_conduct_accepted_at, emergency_protocol_completed, emergency_protocol_completed_at"
    )
    .eq("profile_id", profile.id)
    .single();

  const { data: statusHistory } = await supabase
    .from("companion_status_history")
    .select("id, previous_status, new_status, notes, created_at")
    .eq("companion_profile_id", cp?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(10);

  const verStatus = (cp?.verification_status as string) ?? "pending";
  const idStatus = (cp as Record<string, unknown>)?.id_verification_status as string ?? "not_submitted";
  const bgStatus = (cp as Record<string, unknown>)?.background_check_status as string ?? "not_requested";

  const verMeta = STATUS_META[verStatus as keyof typeof STATUS_META] ?? STATUS_META.pending;
  const idMeta = STATUS_META[idStatus as keyof typeof STATUS_META] ?? STATUS_META.not_submitted;
  const bgMeta = STATUS_META[bgStatus as keyof typeof STATUS_META] ?? STATUS_META.not_requested;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">
          Verification Status
        </h1>
        <p className="text-senior-lg text-gray-500">
          Track the status of your application review and required compliance items.
        </p>
      </div>

      {/* Overall status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Overall application status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={verMeta.variant} className="capitalize text-sm">
                {verMeta.label}
              </Badge>
              {verStatus === "pending" && (
                <p className="text-sm text-gray-500 mt-2">
                  Your application has been received. An administrator will review it and
                  update your status.
                </p>
              )}
              {verStatus === "under_review" && (
                <p className="text-sm text-gray-500 mt-2">
                  Our team is reviewing your application. We may contact your references.
                </p>
              )}
              {verStatus === "approved" && (
                <p className="text-sm text-green-700 mt-2 font-medium">
                  You are approved to receive and accept booking assignments.
                </p>
              )}
              {verStatus === "rejected" && (
                <p className="text-sm text-destructive mt-2">
                  Your application was not approved at this time. Please contact support for details.
                </p>
              )}
              {verStatus === "suspended" && (
                <p className="text-sm text-destructive mt-2">
                  Your account has been suspended. You cannot accept new bookings. Contact support to discuss reinstatement.
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/companion/profile">Edit profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Verification checklist
          </CardTitle>
          <CardDescription>
            All items below must be completed before your application can be approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Government ID */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${idStatus === "verified" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
              {idStatus === "verified"
                ? <CheckCircle className="h-3.5 w-3.5" />
                : <Clock className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Government ID verification</span>
                <Badge variant={idMeta.variant} className="text-xs capitalize">{idMeta.label}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                A government-issued ID is verified by our team. You do not need to upload it here.
                {typeof (cp as Record<string, unknown>)?.id_verification_notes === "string" && (
                  <span className="block mt-1 text-amber-700">
                    Admin note: {(cp as Record<string, unknown>).id_verification_notes as string}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Background check */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${bgStatus === "completed" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
              {bgStatus === "completed"
                ? <CheckCircle className="h-3.5 w-3.5" />
                : <Clock className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Background check</span>
                <Badge variant={bgMeta.variant} className="text-xs capitalize">{bgMeta.label}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {(cp as Record<string, unknown>)?.background_check_consent
                  ? "Consent provided. Our team will initiate the check."
                  : "Please provide background check consent in your profile."}
                {typeof (cp as Record<string, unknown>)?.background_check_admin_notes === "string" && (
                  <span className="block mt-1 text-amber-700">
                    Admin note: {(cp as Record<string, unknown>).background_check_admin_notes as string}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Code of conduct */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${cp?.code_of_conduct_accepted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
              {cp?.code_of_conduct_accepted
                ? <CheckCircle className="h-3.5 w-3.5" />
                : <Clock className="h-3.5 w-3.5" />}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Code of conduct accepted</span>
              {!cp?.code_of_conduct_accepted && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Accept the code of conduct in your <Link href="/companion/profile" className="underline text-sage-600">profile</Link>.
                </p>
              )}
            </div>
          </div>

          {/* Emergency protocol */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${(cp as Record<string, unknown>)?.emergency_protocol_completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
              {(cp as Record<string, unknown>)?.emergency_protocol_completed
                ? <CheckCircle className="h-3.5 w-3.5" />
                : <Clock className="h-3.5 w-3.5" />}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Emergency-protocol training</span>
              {!(cp as Record<string, unknown>)?.emergency_protocol_completed && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Mark as complete in your <Link href="/companion/profile" className="underline text-sage-600">profile</Link> after completing the training.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status history */}
      {statusHistory && statusHistory.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-senior-base">Status history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {statusHistory.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-400 flex-shrink-0 text-xs mt-0.5">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                  <div>
                    <span className="text-gray-700 font-medium capitalize">
                      {(h.new_status as string).replace("_", " ")}
                    </span>
                    {h.notes && (
                      <span className="text-gray-500 ml-1">— {h.notes}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
