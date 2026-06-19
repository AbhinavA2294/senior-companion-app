import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

// Roles permitted for self-registration. Admin accounts must be created
// by an existing admin through the dashboard — never via this endpoint.
const SELF_REGISTRATION_ROLES = ["senior", "family", "companion"] as const;
type SelfRegistrationRole = (typeof SELF_REGISTRATION_ROLES)[number];

const RegisterSchema = z.object({
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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({ error: first.message }, { status: 400 });
    }
    const { role, first_name, last_name, phone } = parsed.data;

    // Build an SSR Supabase client from the request cookies so we can
    // verify the calling user's session without exposing the service-role key.
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
            });
          },
        },
      }
    );

    // Verify the request comes from an authenticated Supabase session.
    // We NEVER accept a user_id from the request body — we use the
    // authenticated user's own ID from their JWT.
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Prevent duplicate profiles (idempotent: if a profile already exists, succeed silently).
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    // Insert using the anon client — the RLS policy
    // "Authenticated users can insert their own profile" enforces
    // user_id = auth.uid(), making it impossible to spoof another user's ID.
    const { error: insertErr } = await supabase.from("profiles").insert({
      user_id: user.id,           // from JWT, never from request body
      role: role as SelfRegistrationRole,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone?.trim() || null,
    });

    if (insertErr) {
      // Return a generic error — never expose internal DB messages.
      console.error("[/api/register] profile insert error:", insertErr.code);
      return NextResponse.json(
        { error: "Could not create profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
