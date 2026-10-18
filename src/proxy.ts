// The live desk shows real customers' phone numbers and messages, so it sits behind a password.
// HTTP Basic auth (any username), password from LIVE_DESK_PASSWORD. Unset password = locked.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const password = process.env.LIVE_DESK_PASSWORD;
  const [scheme, encoded] = (req.headers.get("authorization") ?? "").split(" ");
  let given: string | null = null;
  try {
    if (scheme === "Basic" && encoded) given = atob(encoded).split(":").slice(1).join(":");
  } catch {} // malformed header = no password
  if (password && given === password) return NextResponse.next();
  return new NextResponse(password ? "Password required" : "Live desk is locked: LIVE_DESK_PASSWORD is not set", {
    status: 401,
    headers: password ? { "www-authenticate": 'Basic realm="Live sales desk"' } : {},
  });
}

export const config = { matcher: ["/live", "/live/:path*", "/api/live", "/api/live/:path*"] };
