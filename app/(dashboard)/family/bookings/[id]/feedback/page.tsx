import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasFeedbackBeenSubmitted } from "@/lib/actions/feedback";
import { BookingFeedbackForm } from "@/components/bookings/booking-feedback-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = { title: "Leave Feedback" };

export default async function FamilyFeedbackPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { feedback?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "family") redirect("/family");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, scheduled_date, senior_profile_id, booked_by_profile_id")
    .eq("id", params.id)
    .eq("booked_by_profile_id", profile.id)
    .single();

  if (!booking) notFound();
  if (booking.status !== "completed") {
    redirect(`/family/bookings/${params.id}`);
  }

  const alreadySubmitted = await hasFeedbackBeenSubmitted(params.id, profile.id as string);

  if (searchParams.feedback === "submitted" || alreadySubmitted) {
    return (
      <div className="max-w-lg mx-auto pt-12 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Thank you for your feedback!
        </h1>
        <p className="text-gray-500">
          Your response helps us improve the pilot program and support our companions.
        </p>
        <a
          href={`/family/bookings/${params.id}`}
          className="inline-block mt-4 px-6 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium hover:bg-sage-700 transition-colors"
        >
          Back to Booking
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-display text-senior-2xl font-bold text-gray-900">Leave Feedback</h1>
        <p className="text-senior-base text-gray-500 mt-1">
          How was the visit on {new Date(booking.scheduled_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}?
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your experience</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingFeedbackForm
            bookingId={params.id}
            redirectTo={`/family/bookings/${params.id}/feedback`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
