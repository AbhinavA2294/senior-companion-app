import { createAdminClient } from "@/lib/supabase/server";

export interface NotificationPayload {
  profileId: string;
  title: string;
  body: string;
  relatedBookingId?: string;
  notificationType?: string;
}

export interface NotificationProvider {
  inApp(payload: NotificationPayload): Promise<void>;
  email(to: string, subject: string, body: string): Promise<void>;
  sms(to: string, body: string): Promise<void>;
}

export class MockNotificationProvider implements NotificationProvider {
  async inApp(payload: NotificationPayload): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      profile_id: payload.profileId,
      title: payload.title,
      body: payload.body,
      channel: "in_app",
      status: "sent",
      related_booking_id: payload.relatedBookingId ?? null,
      notification_type: payload.notificationType ?? "general",
    });
    if (error) {
      console.error("[MockNotificationProvider] inApp error:", error.message);
    } else {
      console.log(`[MockNotificationProvider] inApp → profile=${payload.profileId} title="${payload.title}"`);
    }
  }

  async email(to: string, subject: string, body: string): Promise<void> {
    console.log(`[MockNotificationProvider] EMAIL (not sent)\n  To: ${to}\n  Subject: ${subject}\n  Body: ${body.slice(0, 120)}…`);
  }

  async sms(to: string, body: string): Promise<void> {
    console.log(`[MockNotificationProvider] SMS (not sent)\n  To: ${to}\n  Body: ${body.slice(0, 160)}`);
  }
}

export const notificationProvider: NotificationProvider = new MockNotificationProvider();