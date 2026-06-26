import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

// Roles permitted for self-registration. Admin accounts must be created
// by an existing admin through the dashboard — never via this endpoint.
const SELF_REGISTRATION_ROLES = ["senior", "family", "companion"] as const;
type SelfRegistrationRole = (typeof SELF_REGISTRATION_ROLES)[number];

const SUPPORTED_LOCALES = ["en", "es", "hi", "ta"] as const;

const RegisterSchema = z.object({
  user_id: z.string().uuid("Invalid user ID."),
  role: z.enum(SELF_REGISTRATION_ROLES, {
    errorMap: () => ({ message: "Invalid role. Allowed: senior, family, companion." }),
  }),
  first_name: z
    .string()
    .min(1, "First name is required.")
    .max(100, "First name is too long.")
    .regex(/^[a-zA-Z\s'\-\.]+$/, "First name contains invalid characters."),
  last_name: z
    .string()
    .min(1, "Last name is required.")
    .max(100, "Last name is too long.")
    .regex(/^[a-zA-Z\s'\-\.]+$/, "Last name contains invalid characters."),
  phone: z
    .string()
    .max(30)
    .regex(/^[\d\s\+\-\(\)\.]+$/, "Invalid phone number format.")
    .optional()
    .or(z.literal("")),
  ui_language: z.enum(SUPPORTED_LOCALES).optional().default("en"),
});

// Service-role client — bypasses RLS, no cookie/session dependency.
// The service role key is never exposed to the browser.
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({ error: first.message }, { status: 400 });
    }
    const { user_id, role, first_name, last_name, phone, ui_language } = parsed.data;

    const admin = createAdminClient();

    // Try to insert the full profile. The handle_new_user DB trigger may have
    // already created a minimal row (role/name only); if so, we get a unique
    // conflict on user_id and fall through to the UPDATE path below.
    const { error: insertErr } = await admin.from("profiles").insert({
      user_id,
      role: role as SelfRegistrationRole,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone?.trim() || null,
      ui_language,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        // Profile already exists (trigger beat us to it).
        // Update only the supplemental fields the trigger doesn't set.
        const { error: updateErr } = await admin
          .from("profiles")
          .update({
            phone: phone?.trim() || null,
            ui_language,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);

        if (updateErr) {
          console.error("[/api/register] profile update error:", updateErr.code);
          return NextResponse.json(
            { error: "Could not update profile. Please try again." },
            { status: 500 }
          );
        }
      } else {
        // Real error — guard against exposing internal DB messages.
        console.error("[/api/register] profile insert error:", insertErr.code);
        return NextResponse.json(
          { error: "Could not create profile. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
