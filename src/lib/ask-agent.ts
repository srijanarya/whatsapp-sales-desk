import type { DeskEvent } from "@/lib/desk";
import type { Lead, Message } from "@/lib/types";

// Calls the live AI for one lead and turns the answer into a desk event.
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
    if (data.error) return { type: "ai_failed", leadId: lead.id, reason: data.error, at };
    if (data.blocked) return { type: "ai_failed", leadId: lead.id, reason: `reply blocked by guard: ${data.blocked}`, at };
    const o = data.output;
    return {
      type: "ai_reply",
      leadId: lead.id,
      body: o.reply,
      at,
      keenness: o.keenness,
      unknown: o.said_will_check,
      modelHandoff: o.handoff ? o.handoff_reason : null,
      qualification: {
        city: o.qualification.city ?? lead.city,
        budgetLakh: o.qualification.budget_lakh ?? lead.budgetLakh,
        timeline: o.qualification.timeline ?? lead.timeline,
        hasSpace: o.qualification.has_space ?? lead.hasSpace,
        experience: o.qualification.experience ?? lead.experience,
      },
      meta: data.meta,
    };
  } catch {
    return { type: "ai_failed", leadId: lead.id, reason: "network error", at };
  }
}
