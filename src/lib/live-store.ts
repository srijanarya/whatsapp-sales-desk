// Live desk persistence: an append-only log of desk events in Redis (Upstash via the Vercel
// Marketplace, REST API, no client library). State is the existing reducer folded over the log,
// so every safety rule the tests check applies to real WhatsApp chats unchanged.
// ponytail: the whole log is re-folded on each request; snapshot every N events if it grows large.
import { deskReducer, liveInitialState, type DeskEvent, type DeskState } from "@/lib/desk";
import { runAgent } from "@/lib/agent/run";
import { toDeskEvent } from "@/lib/agent/to-event";
import { sendText, waIdFor } from "@/lib/whatsapp";

const KEY = "desk:events";
const url = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
// In-memory store exists only for local e2e runs, and only when asked for by name.
// Never a silent fallback: serverless instances don't share memory.
const memory = () => process.env.DESK_STORE === "memory";
const mem = globalThis as unknown as { __deskLog?: string[]; __deskOnce?: Set<string> };

export const storeConfigured = () => memory() || Boolean(url() && token());

async function redis(...cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(url()!, {
    method: "POST",
    headers: { authorization: `Bearer ${token()}` },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`Redis ${cmd[0]} failed: ${data.error ?? res.status}`);
  return data.result;
}

async function append(e: DeskEvent): Promise<number> {
  if (memory()) return (mem.__deskLog ??= []).push(JSON.stringify(e));
  return (await redis("RPUSH", KEY, JSON.stringify(e))) as number;
}

async function readLog(): Promise<DeskEvent[]> {
  const raw = memory() ? (mem.__deskLog ?? []) : ((await redis("LRANGE", KEY, 0, -1)) as string[]);
  return raw.map((r) => JSON.parse(r));
}

const fold = (events: DeskEvent[]) => events.reduce(deskReducer, liveInitialState());

export async function loadState(): Promise<DeskState> {
  return fold(await readLog());
}

// True the first time a key is seen (Meta retries webhooks for days; this drops the repeats).
export async function claimOnce(key: string, ttlSeconds = 8 * 24 * 3600): Promise<boolean> {
  if (memory()) {
    const once = (mem.__deskOnce ??= new Set());
    if (once.has(key)) return false;
    once.add(key);
    return true;
  }
  return (await redis("SET", `once:${key}`, "1", "NX", "EX", ttlSeconds)) === "OK";
}

// Undo a claim when storing the message failed, so Meta's retry is processed instead of dropped.
export async function releaseOnce(key: string): Promise<void> {
  if (memory()) mem.__deskOnce?.delete(key);
  else await redis("DEL", `once:${key}`);
}

// Appends one event, then sends whatever new messages it produced to WhatsApp.
// The diff is taken at this event's own position in the log, so concurrent writers can't
// make it send someone else's message, and replies the reducer discarded are never sent.
export async function applyAndSend(e: DeskEvent): Promise<DeskState> {
  const n = await append(e);
  const log = (await readLog()).slice(0, n);
  const before = fold(log.slice(0, -1));
  let after = deskReducer(before, log[n - 1]);
  const seen = new Set(before.messages.map((m) => m.id));
  for (const m of after.messages.filter((m) => !seen.has(m.id) && m.sender !== "lead")) {
    const to = waIdFor(m.leadId);
    if (!to) continue;
    const sent = await sendText(to, m.body);
    console.log(JSON.stringify({ event: "wa_send", sender: m.sender, ok: sent.ok, error: sent.ok ? undefined : sent.error }));
    if (!sent.ok) {
      const failed: DeskEvent = { type: "send_failed", leadId: m.leadId, detail: `Not delivered to WhatsApp: ${sent.error}`, at: new Date().toISOString() };
      await append(failed);
      after = deskReducer(after, failed);
    }
  }
  return after;
}

// One AI turn on a live chat, run on the server. Skips if the chat is no longer the AI's,
// the WhatsApp agent is paused, or a newer lead message arrived (its own turn will answer).
export async function aiTurn(leadId: string, forMessageAt?: string): Promise<void> {
  const s = await loadState();
  const lead = s.leads.find((l) => l.id === leadId);
  if (!lead || lead.state !== "ai_talking" || s.pausedChannels.includes("whatsapp")) return;
  const msgs = s.messages.filter((m) => m.leadId === leadId);
  const lastLead = msgs.findLast((m) => m.sender === "lead");
  if (forMessageAt && lastLead && lastLead.at !== forMessageAt) return;
  const result = await runAgent(lead.brandId, lead.leadType, msgs);
  await applyAndSend(toDeskEvent(lead, result, new Date().toISOString()));
}
