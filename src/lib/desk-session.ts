// Session for the live desk: an HttpOnly cookie "<issued-at>.<HMAC(password, issued-at)>".
// Expires after MAX_AGE on the server too; changing LIVE_DESK_PASSWORD logs everyone out.
// ponytail: keyed with the (24-char random) password; add a separate SESSION_SECRET env if the password ever gets weaker.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "desk_session";
export const MAX_AGE = 7 * 24 * 3600;

const sign = (password: string, iat: string) => createHmac("sha256", password).update(`live-desk-session-v2.${iat}`).digest("hex");

export const sessionValue = (password: string, now = Date.now()) => {
  const iat = String(Math.floor(now / 1000));
  return `${iat}.${sign(password, iat)}`;
};

export function validSession(cookie: string | undefined, password = process.env.LIVE_DESK_PASSWORD, now = Date.now()): boolean {
  if (!password || !cookie) return false;
  const [iat, mac = ""] = cookie.split(".");
  const age = now / 1000 - Number(iat);
  if (!(age >= 0 && age < MAX_AGE)) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(password, iat));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordMatches(given: string, password = process.env.LIVE_DESK_PASSWORD): boolean {
  if (!password) return false;
  const a = createHmac("sha256", "cmp").update(given).digest();
  const b = createHmac("sha256", "cmp").update(password).digest();
  return timingSafeEqual(a, b);
}
