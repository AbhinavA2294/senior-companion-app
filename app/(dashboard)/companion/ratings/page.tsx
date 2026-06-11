import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

export const metadata: Metadata = { title: "My Ratings – Companion" };

export default async function CompanionRatingsPage() {
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

  const { data: ratings } = await supabase
    .from("ratings")
    .select("id, rating, comment, created_at")
    .eq("rated_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const avg =
    ratings && ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + (r.rating as number), 0) / ratings.length).toFixed(1)
      : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900 mb-2">My Ratings</h1>
        <p className="text-senior-lg text-gray-500">Feedback from seniors and families after completed visits.</p>
      </div>

      {avg && (
        <Card className="border-0 shadow-sm bg-sage-50">
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sage-100">
              <Star className="h-7 w-7 text-sage-600 fill-sage-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-4xl font-bold text-gray-900">{avg}</p>
              <p className="text-sm text-gray-500">
                Average from {ratings?.length} review{(ratings?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>All reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {!ratings || ratings.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Reviews appear here after completed visits are rated by seniors or their families.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {ratings.map((r) => (
                <li key={r.id} className="border-b border-gray-50 pb-5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < (r.rating as number) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
