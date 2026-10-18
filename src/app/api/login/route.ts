// Live desk sign-in: a plain form POST. Right password -> session cookie -> /live.
import { COOKIE, MAX_AGE, passwordMatches, sessionValue } from "@/lib/desk-session";

export async function POST(req: Request) {
  const password = process.env.LIVE_DESK_PASSWORD;
  const given = String((await req.formData().catch(() => null))?.get("password") ?? "").trim();
  const ok = Boolean(password) && passwordMatches(given);
  const res = Response.redirect(new URL(ok ? "/live" : "/login?error=1", req.url), 303);
  if (!ok) return res;
  const headers = new Headers(res.headers);
  headers.append("set-cookie", `${COOKIE}=${sessionValue(password!)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`);
  return new Response(null, { status: 303, headers });
}
