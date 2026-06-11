import Link from "next/link";
import { User, MapPin, Phone, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Profile, SeniorProfile } from "@/types";

interface SeniorCardProps {
  profile: Profile;
  seniorProfile: SeniorProfile | null;
  relationshipLabel?: string;
  basePath?: string;
}

export function SeniorCard({
  profile,
  seniorProfile,
  relationshipLabel,
  basePath = "/family/seniors",
}: SeniorCardProps) {
  const displayName = seniorProfile?.preferred_name
    ? `${profile.first_name} "${seniorProfile.preferred_name}" ${profile.last_name}`
    : `${profile.first_name} ${profile.last_name}`;

  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-4 pt-5 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 flex-shrink-0">
          <User className="h-6 w-6 text-sage-600" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-senior-base text-gray-900 truncate">
            {displayName}
          </p>
          {relationshipLabel && (
            <p className="text-sm text-sage-600 font-medium">{relationshipLabel}</p>
          )}
          <div className="mt-1 space-y-0.5">
            {location && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                {location}
              </p>
            )}
            {profile.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                {profile.phone}
              </p>
            )}
          </div>
          {seniorProfile?.interests && seniorProfile.interests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {seniorProfile.interests.slice(0, 3).map((interest) => (
                <span
                  key={interest}
                  className="text-xs bg-sage-50 text-sage-700 px-2 py-0.5 rounded-full"
                >
                  {interest}
                </span>
              ))}
              {seniorProfile.interests.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{seniorProfile.interests.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
          <Link href={`${basePath}/${profile.id}`} aria-label={`View ${profile.first_name}'s profile`}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
