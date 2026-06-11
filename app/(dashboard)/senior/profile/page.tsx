import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Calendar, Heart, BookOpen } from "lucide-react";
import type { Profile, SeniorProfile } from "@/types";

export const metadata: Metadata = { title: "My Profile" };

export default async function SeniorProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (profileRaw?.role !== "senior") redirect("/login");
  const profile = profileRaw as unknown as Profile;

  const { data: detailRaw } = await supabase
    .from("senior_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .single();
  const detail = detailRaw as unknown as SeniorProfile | null;

  const displayName = detail?.preferred_name
    ? `${profile.first_name} "${detail.preferred_name}" ${profile.last_name}`
    : `${profile.first_name} ${profile.last_name}`;

  const location = [profile.street_address, profile.city, profile.state, profile.zip_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Your information helps companions prepare for visits.
        </p>
      </div>

      {/* Identity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-sage-600" aria-hidden="true" />
            About Me
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-gray-400">Name</p>
            <p className="text-senior-xl font-semibold text-gray-900">{displayName}</p>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-2 text-senior-base text-gray-700">
              <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
              {profile.phone}
            </div>
          )}
          {location && (
            <div className="flex items-start gap-2 text-senior-base text-gray-700">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              {location}
            </div>
          )}
          {profile.date_of_birth && (
            <div className="flex items-center gap-2 text-senior-base text-gray-700">
              <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
              {new Date(profile.date_of_birth).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      {detail && (detail.preferred_language || detail.interests?.length > 0) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-warm-500" aria-hidden="true" />
              My Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.preferred_language && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Preferred language</p>
                <p className="text-senior-base text-gray-800">{detail.preferred_language}</p>
              </div>
            )}
            {detail.additional_languages?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Also speaks</p>
                <div className="flex flex-wrap gap-1">
                  {detail.additional_languages.map((l) => (
                    <Badge key={l} variant="secondary">{l}</Badge>
                  ))}
                </div>
              </div>
            )}
            {detail.interests?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Interests</p>
                <div className="flex flex-wrap gap-1">
                  {detail.interests.map((i) => (
                    <Badge key={i} variant="outline">{i}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes for companions */}
      {detail && (detail.mobility_notes || detail.accessibility_needs || detail.free_text_notes) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" aria-hidden="true" />
              Notes for Companions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.mobility_notes && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Mobility</p>
                <p className="text-senior-base text-gray-700">{detail.mobility_notes}</p>
              </div>
            )}
            {detail.accessibility_needs && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Accessibility</p>
                <p className="text-senior-base text-gray-700">{detail.accessibility_needs}</p>
              </div>
            )}
            {detail.free_text_notes && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Other preferences</p>
                <p className="text-senior-base text-gray-700">{detail.free_text_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-gray-400 text-center">
        To update your profile, please contact your family member or our support team at{" "}
        <span className="font-medium text-sage-600">1-800-555-2273</span>.
      </p>
    </div>
  );
}
