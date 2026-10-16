import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Quick redirect for visitors who have no session cookie at all.
// The real check happens on the server: the dashboard and account layouts ask the API who you are,
// and every API route verifies the session and your role. The signing secret never reaches this app.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("beacon_session")?.value) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/account"] };
