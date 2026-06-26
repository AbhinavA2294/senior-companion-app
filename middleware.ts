import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/senior/:path*",
    "/family/:path*",
    "/companion/:path*",
    "/admin/:path*",
    "/settings/:path*",
  ],
};