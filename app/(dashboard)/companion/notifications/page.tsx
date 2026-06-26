import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Bell, CheckCheck } from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 60_000) return rtf.format(-Math.round(diff / 1_000), "second");
  if (diff < 3_600_000) return rtf.format(-Math.round(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.round(diff / 3_600_000), "hour");
  return rtf.format(-Math.round(diff / 86_400_000), "day");
}

export const metadata: Metadata = { title: "Notifications" };

interface Notification {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  notification_type: string;
  read_at: string | null;
  created_at: string;
}

export default async function CompanionNotificationsPage() {
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

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, channel, status, notification_type, read_at, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (notifications ?? []) as Notification[];
  const unreadCount = items.filter((n) => n.status !== "read").length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-senior-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-senior-base text-gray-500 mt-1">Booking assignments and platform updates.</p>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warm-700 bg-warm-50 border border-warm-200 px-3 py-1.5 rounded-full">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount} new
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-14 w-14 text-gray-200 mb-4" aria-hidden="true" />
          <p className="text-senior-xl font-medium text-gray-400">No notifications yet</p>
          <p className="text-senior-base text-gray-400 mt-1">
            New booking assignments and status updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {items.map((n) => {
            const isUnread = n.status !== "read";
            return (
              <li
                key={n.id}
                className={`px-5 py-4 flex items-start gap-4 ${isUnread ? "bg-sage-50/60" : ""}`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                    isUnread ? "bg-sage-100" : "bg-gray-100"
                  }`}
                >
                  {isUnread ? (
                    <Bell className="h-5 w-5 text-sage-600" aria-hidden="true" />
                  ) : (
                    <CheckCheck className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-senior-base font-medium ${isUnread ? "text-gray-900" : "text-gray-500"}`}>
                      {n.title}
                    </p>
                    <time className="flex-shrink-0 text-sm text-gray-400" dateTime={n.created_at}>
                      {timeAgo(n.created_at)}
                    </time>
                  </div>
                  <p className="text-senior-sm text-gray-600 mt-0.5">{n.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
