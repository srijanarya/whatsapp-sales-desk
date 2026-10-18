// The live desk shows real customers' phone numbers and messages, so it sits behind a password.
// Browser: sign in at /login (HttpOnly session cookie). Scripts and tests: HTTP Basic auth, any username.
// LIVE_DESK_PASSWORD unset = locked.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, passwordMatches, validSession } from "@/lib/desk-session";

export function proxy(req: NextRequest) {
  if (validSession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const [scheme, encoded] = (req.headers.get("authorization") ?? "").split(" ");
  let given: string | null = null;
  try {
    if (scheme === "Basic" && encoded) given = atob(encoded).split(":").slice(1).join(":");
  } catch {} // malformed header = no password
  if (given !== null && passwordMatches(given)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "login_required" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/live", "/live/:path*", "/api/live", "/api/live/:path*"] };
