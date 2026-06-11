import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingCard } from "@/components/bookings/booking-card";
import {
  User, Phone, Mail, MapPin, Calendar, AlertTriangle,
  Edit, Plus, Heart, BookOpen,
} from "lucide-react";
import type { Profile, SeniorProfile, EmergencyContact, BookingWithDetails } from "@/types";

export const metadata: Metadata = { title: "Senior Profile" };

interface Props {
  params: { id: string };
}

export default async function SeniorProfilePage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!callerProfile || !["family", "admin"].includes(callerProfile.role as string)) {
    redirect("/login");
  }

  // Verify access
  const { data: managedCheck } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", params.id)
    .eq("managed_by_profile_id", callerProfile.id)
    .single();

  const { data: relCheck } = await supabase
    .from("family_senior_relationships")
    .select("id, relationship_label")
    .eq("family_profile_id", callerProfile.id)
    .eq("senior_profile_id", params.id)
    .single();

  if (!managedCheck && !relCheck && callerProfile.role !== "admin") {
    notFound();
  }

  const { data: seniorProfileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!seniorProfileRaw || seniorProfileRaw.role !== "senior") notFound();
  const seniorProfile = seniorProfileRaw as unknown as Profile;

  const { data: seniorDetailRaw } = await supabase
    .from("senior_profiles")
    .select("*")
    .eq("profile_id", params.id)
    .single();
  const seniorDetail = seniorDetailRaw as unknown as SeniorProfile | null;

  const { data: emergencyContactsRaw } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("senior_profile_id", params.id)
    .order("is_primary", { ascending: false });
  const emergencyContacts = (emergencyContactsRaw ?? []) as unknown as EmergencyContact[];

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select(`
      *,
      activity_type:activity_types(id, name, description, icon_name, is_active, sort_order, created_at)
    `)
    .eq("senior_profile_id", params.id)
    .in("status", ["requested", "assigned", "accepted", "completed"])
    .order("scheduled_date", { ascending: false })
    .limit(5);
  const bookings = (bookingsRaw ?? []) as unknown as BookingWithDetails[];

  const displayName =
    seniorDetail?.preferred_name
      ? `${seniorProfile.first_name} "${seniorDetail.preferred_name}" ${seniorProfile.last_name}`
      : `${seniorProfile.first_name} ${seniorProfile.last_name}`;

  const location = [
    seniorProfile.street_address,
    seniorProfile.city,
    seniorProfile.state,
    seniorProfile.zip_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/family/seniors" className="text-sm text-sage-600 hover:underline mb-2 inline-block">
            ← Back to seniors
          </Link>
          <h1 className="font-display text-senior-3xl font-bold text-gray-900">{displayName}</h1>
          {relCheck?.relationship_label && (
            <p className="text-senior-base text-sage-600 font-medium">{relCheck.relationship_label}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/family/seniors/${params.id}/edit`}>
              <Edit className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/family/bookings/new?senior=${params.id}`}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Book Visit
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-sage-600" aria-hidden="true" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {seniorProfile.phone && (
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={seniorProfile.phone} />
            )}
            {seniorDetail?.contact_email && (
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={seniorDetail.contact_email} />
            )}
            {location && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={location} />
            )}
            {seniorProfile.date_of_birth && (
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Date of birth"
                value={new Date(seniorProfile.date_of_birth).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-warm-500" aria-hidden="true" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seniorDetail?.preferred_language && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Preferred language</p>
                <p className="text-senior-sm text-gray-900">{seniorDetail.preferred_language}</p>
              </div>
            )}
            {seniorDetail?.additional_languages && seniorDetail.additional_languages.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Also speaks</p>
                <div className="flex flex-wrap gap-1">
                  {seniorDetail.additional_languages.map((l) => (
                    <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                  ))}
                </div>
              </div>
            )}
            {seniorDetail?.preferred_companion_gender && seniorDetail.preferred_companion_gender !== "no_preference" && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Preferred companion</p>
                <p className="text-senior-sm text-gray-900 capitalize">{seniorDetail.preferred_companion_gender}</p>
              </div>
            )}
            {seniorDetail?.interests && seniorDetail.interests.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Interests</p>
                <div className="flex flex-wrap gap-1">
                  {seniorDetail.interests.map((i) => (
                    <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accessibility notes */}
        {(seniorDetail?.mobility_notes || seniorDetail?.accessibility_needs || seniorDetail?.dietary_notes) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" aria-hidden="true" />
                Accessibility Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {seniorDetail?.mobility_notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Mobility</p>
                  <p className="text-senior-sm text-gray-700">{seniorDetail.mobility_notes}</p>
                </div>
              )}
              {seniorDetail?.accessibility_needs && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Accessibility</p>
                  <p className="text-senior-sm text-gray-700">{seniorDetail.accessibility_needs}</p>
                </div>
              )}
              {seniorDetail?.dietary_notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Dietary</p>
                  <p className="text-senior-sm text-gray-700">{seniorDetail.dietary_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Free-text notes */}
        {seniorDetail?.free_text_notes && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Companion Notes</CardTitle>
              <CardDescription>Non-medical preferences &amp; context</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-senior-sm text-gray-700 leading-relaxed">{seniorDetail.free_text_notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Emergency contacts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-senior-xl font-semibold text-gray-900">
            Emergency Contacts
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/family/seniors/${params.id}/emergency-contact`}>
              {emergencyContacts.length > 0 ? "Manage" : "Add contact"}
            </Link>
          </Button>
        </div>

        {emergencyContacts.length === 0 ? (
          <Card className="border-0 shadow-sm border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-400 mb-2" aria-hidden="true" />
              <p className="text-senior-base font-medium text-gray-600 mb-1">No emergency contact on file</p>
              <p className="text-sm text-gray-400 mb-4">Adding an emergency contact is strongly recommended.</p>
              <Button variant="outline" asChild>
                <Link href={`/family/seniors/${params.id}/emergency-contact`}>Add emergency contact</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {emergencyContacts.map((contact) => (
              <Card key={contact.id} className="border-0 shadow-sm">
                <CardContent className="flex items-start gap-4 pt-4 pb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-senior-base text-gray-900">{contact.name}</p>
                      {contact.is_primary && (
                        <Badge variant="success" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{contact.relationship}</p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-sm text-gray-700 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                        {contact.phone}
                      </p>
                      {contact.email && (
                        <p className="text-sm text-gray-700 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-senior-xl font-semibold text-gray-900">
              Recent Bookings
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/family/bookings">View all</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} basePath="/family/bookings" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-senior-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}
