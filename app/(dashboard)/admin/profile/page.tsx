import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, ShieldCheck } from "lucide-react";
import type { Profile } from "@/types";

export const metadata: Metadata = { title: "Admin Profile" };

export default async function AdminProfilePage() {
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
  if (profileRaw?.role !== "admin") redirect("/login");
  const profile = profileRaw as unknown as Profile;

  async function updateProfile(formData: FormData) {
    "use server";
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        phone: (formData.get("phone") as string) || null,
      })
      .eq("user_id", user.id);

    revalidatePath("/admin/profile");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-senior-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-senior-lg text-gray-500 mt-1">
          Your administrator account information.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="first_name" className="text-xs text-gray-400">First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  defaultValue={profile.first_name}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="last_name" className="text-xs text-gray-400">Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  defaultValue={profile.last_name}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Email</label>
              <p className="text-sm text-gray-500 py-2">{user.email}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="phone" className="text-xs text-gray-400">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder="e.g. 555-123-4567"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sage-600" aria-hidden="true" />
            Role & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className="bg-sage-100 text-sage-700 hover:bg-sage-100">Administrator</Badge>
          <p className="text-sm text-gray-500 mt-2">
            Full access to manage bookings, companions, seniors, reports, and platform settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}