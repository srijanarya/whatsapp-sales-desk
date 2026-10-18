// Live desk API (behind the password in src/proxy.ts). GET: current state. POST: a consultant action.
import { after, connection } from "next/server";
import { z } from "zod";
import { aiTurn, applyAndSend, loadState, storeConfigured } from "@/lib/live-store";
import { windowOpen } from "@/lib/whatsapp";

export const maxDuration = 60;

const leadId = z.string().startsWith("wa-");
// Only what a consultant can do. Lead messages and AI replies come from WhatsApp and the server, never the browser.
const Body = z.union([
  z.object({ type: z.enum(["takeover", "hand_back", "false_alarm"]), leadId }),
  z.object({ type: z.literal("human_reply"), leadId, body: z.string().trim().min(1).max(4096) }),
  z.object({ type: z.literal("close"), leadId, outcome: z.enum(["won", "lost"]) }),
  z.object({ type: z.literal("toggle_channel"), channel: z.enum(["meta_ads", "whatsapp", "voice", "email"]) }),
  z.object({ type: z.literal("retry_ai"), leadId }),
]);

export async function GET() {
  await connection(); // always read live state at request time, never prerender it
  if (!storeConfigured()) return Response.json({ error: "store_not_configured" }, { status: 503 });
  return Response.json({ state: await loadState(), whatsapp: Boolean(process.env.WA_PHONE_NUMBER_ID && process.env.WA_ACCESS_TOKEN) });
}

export async function POST(req: Request) {
  if (!storeConfigured()) return Response.json({ error: "store_not_configured" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const e = parsed.data;
  const at = new Date().toISOString();

  if (e.type === "toggle_channel") return Response.json({ state: await applyAndSend({ ...e }) });
  if (e.type === "retry_ai") {
    await applyAndSend({ type: "false_alarm", leadId: e.leadId, at });
    after(() => aiTurn(e.leadId));
    return Response.json({ state: await loadState() });
  }
  if (e.type === "human_reply") {
    const s = await loadState();
    const lastInbound = s.messages.findLast((m) => m.leadId === e.leadId && m.sender === "lead")?.at;
    if (!windowOpen(lastInbound)) {
      return Response.json({ error: "Outside WhatsApp's 24-hour window: a free-form reply can't be sent until the lead writes again." }, { status: 409 });
    }
  }
  return Response.json({ state: await applyAndSend({ ...e, at }) });
}
