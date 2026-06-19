import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route-level auth middleware.
 * All /senior, /family, /companion, /admin, /settings paths require a valid session.
 * Unauthenticated requests are redirected to /login.
 */
export async function middleware(req: NextRequest) {
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
            req.cookies.set(name, value);
            res.cookies.set(
              name,
              value,
              options as Parameters<typeof res.cookies.set>[2]
            );
          });
        },
      },
    }
  );

  // getUser() performs a server-side JWT verification — it does not rely
  // on the potentially-stale cookie session object.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirected_from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  // Protect all dashboard routes. Public pages (/login, /, /about, etc.)
  // are not listed here and remain accessible without authentication.
  matcher: [
    "/senior/:path*",
    "/family/:path*",
    "/companion/:path*",
    "/admin/:path*",
    "/settings/:path*",
  ],
};
