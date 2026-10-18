// WhatsApp Cloud API webhook. GET: Meta's verify handshake. POST: signed inbound events.
// Inbound text is stored before we answer 200; the AI reply runs after the response.
import { after } from "next/server";
import { aiTurn, applyAndSend, claimOnce, loadState, releaseOnce, storeConfigured } from "@/lib/live-store";
import { leadIdFor, parseInbound, verifySignature } from "@/lib/whatsapp";

export const maxDuration = 60;

export function GET(req: Request) {
  const expected = process.env.WA_VERIFY_TOKEN;
  if (!expected) return new Response("verify token not configured", { status: 503 });
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === expected) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const secret = process.env.WA_APP_SECRET;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  if (!secret || !phoneNumberId || !storeConfigured()) return new Response("not configured", { status: 503 });
  const raw = await req.text();
  if (raw.length > 1_000_000) return new Response("too large", { status: 413 });
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret)) return new Response("bad signature", { status: 401 });

  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // Status callbacks and other numbers' traffic map to nothing: 200, no change, no retry.
  for (const m of parseInbound(payload, phoneNumberId)) {
    const key = `wamid:${m.id}`;
    if (!(await claimOnce(key))) continue; // Meta retry of a message we already stored
    const leadId = leadIdFor(m.waId);
    let paused = false;
    try {
      const state = await loadState();
      if (!state.leads.some((l) => l.id === leadId)) {
        await applyAndSend({ type: "lead_created", leadId, name: m.name, phone: `+${m.waId}`, at: m.at });
      }
      await applyAndSend({ type: "lead_message", leadId, body: m.body, at: m.at });
      paused = state.pausedChannels.includes("whatsapp");
      if (paused) await applyAndSend({ type: "lead_held", leadId, channel: "whatsapp", at: m.at });
    } catch (err) {
      await releaseOnce(key).catch(() => {});
      console.error(JSON.stringify({ event: "wa_inbound_failed", error: (err as Error).message }));
      return new Response("store failed", { status: 500 }); // Meta retries; the claim was released
    }
    if (!paused) after(() => aiTurn(leadId, m.at));
  }
  return new Response("ok", { status: 200 });
}
