// Session for the live desk: an HttpOnly cookie holding an HMAC of the desk password.
// Changing LIVE_DESK_PASSWORD logs everyone out. No password set = nobody gets in.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "desk_session";
export const MAX_AGE = 7 * 24 * 3600;

export const sessionValue = (password: string) => createHmac("sha256", password).update("live-desk-session-v1").digest("hex");

export function validSession(cookie: string | undefined, password = process.env.LIVE_DESK_PASSWORD): boolean {
  if (!password || !cookie) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(sessionValue(password));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordMatches(given: string, password = process.env.LIVE_DESK_PASSWORD): boolean {
  if (!password) return false;
  const a = createHmac("sha256", "cmp").update(given).digest();
  const b = createHmac("sha256", "cmp").update(password).digest();
  return timingSafeEqual(a, b);
}
