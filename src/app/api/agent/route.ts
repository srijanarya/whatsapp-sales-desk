// Live AI reply for one lead. Fails loudly: every failure returns an error the UI shows,
// and the chat goes to a human. The API key never leaves the server.
import { AgentRequest } from "@/lib/agent/schema";
import { runAgent } from "@/lib/agent/run";

export const maxDuration = 30;

// This is a public demo, so the endpoint cannot hold a secret login. It makes abuse harder and
// caps the damage instead: same-site requests only, a per-visitor rate limit, size caps, and the
// owner's spend limit in the Anthropic console as the hard ceiling (documented as an accepted risk).
// ponytail: in-memory limiter is per server instance; move to a shared store (e.g. Upstash) if abused.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 20;
const calls = new Map<string, number[]>();

function rateLimited(ip: string) {
  const t = Date.now();
  const recent = (calls.get(ip) ?? []).filter((x) => t - x < WINDOW_MS);
  recent.push(t);
  calls.set(ip, recent);
  return recent.length > MAX_CALLS;
}

function sameSite(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  return Boolean(origin && host && new URL(origin).host === host);
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "live_ai_off" }, { status: 503 });
  if (!sameSite(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  // Use the client IP recorded by Vercel's edge, not the first x-forwarded-for entry (callers can set that).
  const ip = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });
  // Read the body ourselves with a hard cap; a missing or false content-length header can't bypass it.
  const raw = await req.text();
  if (raw.length > 20_000) return Response.json({ error: "too_large" }, { status: 413 });

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  const parsed = AgentRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { brandId, leadType, messages } = parsed.data;
  const { status = 200, ...result } = await runAgent(brandId, leadType, messages) as Awaited<ReturnType<typeof runAgent>> & { status?: number };
  return Response.json(result, { status });
}
