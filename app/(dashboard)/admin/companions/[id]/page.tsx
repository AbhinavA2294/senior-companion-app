$content = @'
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, User, Phone, MapPin, Languages, Clock, CheckCircle, XCircle } from "lucide-react";
import { CompanionStatusActions } from "./_actions";
import type { CompanionVerificationStatus } from "@/types";

export const metadata: Metadata = { title: "Companion Review - Admin" };

interface Props {
  params: { id: string };
}

export default async function AdminCompanionDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (adminProfile?.role !== "admin") redirect("/login");

  const admin = createAdminClient();

  const { data: cp } = await admin
    .from("companion_profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!cp) notFound();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", cp.profile_id)
    .single();

  const { data: refs } = await admin
    .from("companion_references")
    .select("*")
    .eq("companion_profile_id", cp.id)
    .order("sort_order");

  const { data: statusHistory } = await admin
    .from("companion_status_history")
    .select("id, previous_status, new_status, notes, created_at, changed_by:profiles(first_name, last_name)")
    .eq("companion_profile_id", cp.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const verStatus = cp.verification_status as CompanionVerificationStatus;
  const verBadge =
    verStatus === "approved"
      ? ("success" as const)
      : verStatus === "suspended" || verStatus === "rejected"
      ? ("destructive" as const)
      : ("warning" as const);

  function Check({ value }: { value: unknown }) {
    return value ? (
      <CheckCircle className="h-4 w-4 text-green-500 inline" aria-label="Yes" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-300 inline" aria-label="No" />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/companions" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
          &larr; Back to companions
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-senior-3xl font-bold text-gray-900">
              {profile ? `${profile.first_name} ${profile.last_name}` : "Companion"}
            </h1>
            <div className="mt-1">
              <Badge variant={verBadge} className="capitalize">
                {verStatus.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Verification Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompanionStatusActions
            companionProfileId={cp.id}
            currentStatus={verStatus}
          />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {profile?.phone ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Location</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : (profile as any)?.street_address ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Service radius</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {cp.max_travel_miles} miles
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Prior experience</p>
              <p className="font-medium">
                {(cp as Record<string, unknown>).has_prior_experience ? `Yes${cp.years_experience ? ` (${cp.years_experience}y)` : ""}` : "No"}
              </p>
            </div>
          </div>

          {profile?.bio && (
            <div>
              <p className="text-xs text-gray-400">Bio</p>
              <p className="mt-0.5 text-gray-700">{profile.bio}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-1">Languages</p>
            <div className="flex flex-wrap gap-1">
              {(cp.languages_spoken ?? []).map((l: string) => (
                <span key={l} className="px-2 py-0.5 rounded-full bg-sage-50 text-sage-700 text-xs">{l}</span>
              ))}
            </div>
          </div>

          {(cp as Record<string, unknown>).activities_supported && ((cp as Record<string, unknown>).activities_supported as string[]).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" /> Activities supported
              </p>
              <div className="flex flex-wrap gap-1">
                {((cp as Record<string, unknown>).activities_supported as string[]).map((a) => (
                  <span key={a} className="px-2 py-0.5 rounded-full bg-warm-50 text-warm-700 text-xs">{a}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Check value={(cp as Record<string, unknown>).background_check_consent} />
            <span className="text-gray-700">Background check consent</span>
          </div>
          <div className="flex items-center gap-2">
            <Check value={(cp as Record<string, unknown>).code_of_conduct_accepted} />
            <span className="text-gray-700">Code of conduct accepted</span>
          </div>
          <div className="flex items-center gap-2">
            <Check value={(cp as Record<string, unknown>).emergency_protocol_completed} />
            <span className="text-gray-700">Emergency protocol completed</span>
          </div>
          <div className="pt-2 border-t border-gray-50 mt-2 space-y-1">
            <p className="text-xs text-gray-400">ID verification status</p>
            <Badge variant="secondary" className="capitalize text-xs">
              {String((cp as Record<string, unknown>).id_verification_status ?? "not_submitted").replace("_", " ")}
            </Badge>
            {typeof (cp as Record<string, unknown>).id_verification_notes === "string" && (
              <p className="text-xs text-gray-500 mt-0.5">{(cp as Record<string, unknown>).id_verification_notes as string}</p>
            )}
          </div>
          <div className="pt-2 border-t border-gray-50 space-y-1">
            <p className="text-xs text-gray-400">Background check status</p>
            <Badge variant="secondary" className="capitalize text-xs">
              {String((cp as Record<string, unknown>).background_check_status ?? "not_requested").replace("_", " ")}
            </Badge>
            {typeof (cp as Record<string, unknown>).background_check_admin_notes === "string" && (
              <p className="text-xs text-gray-500 mt-0.5">{(cp as Record<string, unknown>).background_check_admin_notes as string}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {refs && refs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {refs.map((r, i) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-800">Reference {i + 1}: {r.reference_name}</p>
                <p className="text-gray-500">Relationship: {r.relationship}</p>
                <p className="text-gray-500">Phone: {r.reference_phone}</p>
                {r.reference_email && <p className="text-gray-500">Email: {r.reference_email}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {statusHistory && statusHistory.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {statusHistory.map((h) => {
                const changedBy = h.changed_by as any;
                return (
                  <li key={h.id} className="text-sm flex items-start gap-3">
                    <span className="text-gray-400 text-xs flex-shrink-0 mt-0.5">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                    <div>
                      <span className="font-medium capitalize text-gray-700">
                        {(h.new_status as string).replace("_", " ")}
                      </span>
                      {h.previous_status && (
                        <span className="text-gray-400 ml-1">
                          (from {(h.previous_status as string).replace("_", " ")})
                        </span>
                      )}
                      {changedBy && (
                        <span className="text-gray-400 ml-1">
                          by {changedBy.first_name} {changedBy.last_name}
                        </span>
                      )}
                      {h.notes && <p className="text-gray-500 mt-0.5">{h.notes}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
'@
[System.IO.File]::WriteAllText("$PWD\app\(dashboard)\admin\companions\[id]\page.tsx", $content, [System.Text.Encoding]::UTF8)