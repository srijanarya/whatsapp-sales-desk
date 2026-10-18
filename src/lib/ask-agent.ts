import type { DeskEvent } from "@/lib/desk";
import { toDeskEvent } from "@/lib/agent/to-event";
import type { Lead, Message } from "@/lib/types";

// Calls the live AI for one lead (demo page) and turns the answer into a desk event.
// Every failure becomes an ai_failed event: shown on the chat, and the chat goes to a human.
export async function askAgent(lead: Lead, messages: Message[]): Promise<DeskEvent> {
  const at = new Date().toISOString();
  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        brandId: lead.brandId,
        leadType: lead.leadType,
        messages: messages.map((m) => ({ sender: m.sender, body: m.body })),
      }),
    });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    return toDeskEvent(lead, data, at);
  } catch {
    return { type: "ai_failed", leadId: lead.id, reason: "network error", at };
  }
}
