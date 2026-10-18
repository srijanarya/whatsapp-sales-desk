// WhatsApp Cloud API: webhook signature check, inbound mapping, outbound text, 24-hour window.
// Pure functions except sendText, so the trust boundary is unit-tested directly.
import { createHmac, timingSafeEqual } from "node:crypto";

export const GRAPH_VERSION = "v26.0";
export { windowOpen } from "@/lib/desk";

// Meta signs the raw body with the App Secret: X-Hub-Signature-256: sha256=<hex>.
// Fails closed: no secret, no header or a wrong length all mean "not from Meta".
export function verifySignature(rawBody: string, header: string | null, appSecret: string | undefined): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"));
  const got = Buffer.from(header.slice("sha256=".length));
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export interface Inbound {
  id: string; // wamid, used for dedupe
  waId: string; // sender's WhatsApp number, digits only
  name: string;
  body: string;
  at: string; // ISO, from Meta's timestamp
}

type Payload = {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string } }[];
      };
    }[];
  }[];
};

// Messages sent to OUR number only (anything for another phone number id is dropped).
// Status callbacks (sent/delivered/read) carry no `messages` and map to nothing.
// Non-text messages become a placeholder so the consultant knows to look on the phone.
export function parseInbound(payload: unknown, phoneNumberId: string): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of (payload as Payload)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (change.field !== "messages" || v?.metadata?.phone_number_id !== phoneNumberId) continue;
      for (const m of v.messages ?? []) {
        if (!m.id || !m.from) continue;
        const contact = v.contacts?.find((c) => c.wa_id === m.from) ?? v.contacts?.[0];
        const body = m.type === "text" ? (m.text?.body ?? "") : `(sent ${m.type === "image" || m.type === "audio" ? "an" : "a"} ${m.type ?? "message"}; open WhatsApp to view)`;
        const secs = Number(m.timestamp);
        out.push({
          id: m.id,
          waId: m.from,
          name: contact?.profile?.name || `+${m.from}`,
          body: body.slice(0, 2000),
          at: new Date(Number.isFinite(secs) && secs > 0 ? secs * 1000 : Date.now()).toISOString(),
        });
      }
    }
  }
  return out;
}

export const leadIdFor = (waId: string) => `wa-${waId}`;
export const waIdFor = (leadId: string) => (leadId.startsWith("wa-") ? leadId.slice(3) : null);

// Sends one text. Returns Meta's error text on failure, so the desk can show it.
export async function sendText(to: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = process.env.WA_PHONE_NUMBER_ID;
  const token = process.env.WA_ACCESS_TOKEN;
  if (!id || !token) return { ok: false, error: "WhatsApp is not configured (WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN)" };
  const base = process.env.GRAPH_API_BASE ?? "https://graph.facebook.com"; // overridden only by the local e2e mock
  try {
    const res = await fetch(`${base}/${GRAPH_VERSION}/${id}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, error: `Meta ${res.status}: ${data?.error?.message ?? "unknown error"}` };
  } catch (err) {
    return { ok: false, error: `Meta unreachable: ${(err as Error).message}` };
  }
}
