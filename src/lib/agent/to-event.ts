import type { AgentOutput } from "@/lib/agent/schema";
import type { DeskEvent } from "@/lib/desk";
import type { Action, Lead } from "@/lib/types";

// Turns an agent answer into a desk event. Every failure becomes ai_failed: the chat goes to a human.
export function toDeskEvent(lead: Lead, data: Partial<{ output: AgentOutput; blocked: string; error: string; meta: Action["meta"] }>, at: string): DeskEvent {
  if (data.error) return { type: "ai_failed", leadId: lead.id, reason: data.error, at };
  if (data.blocked) return { type: "ai_failed", leadId: lead.id, reason: `reply blocked by guard: ${data.blocked}`, at };
  const o = data.output;
  if (!o) return { type: "ai_failed", leadId: lead.id, reason: "empty reply", at };
  return {
    type: "ai_reply",
    leadId: lead.id,
    body: o.reply,
    at,
    keenness: o.keenness,
    unknown: o.said_will_check,
    modelHandoff: o.handoff ? (o.handoff_reason as Extract<DeskEvent, { type: "ai_reply" }>["modelHandoff"]) : null,
    qualification: {
      city: o.qualification.city ?? lead.city,
      budgetLakh: o.qualification.budget_lakh ?? lead.budgetLakh,
      timeline: o.qualification.timeline ?? lead.timeline,
      hasSpace: o.qualification.has_space ?? lead.hasSpace,
      experience: o.qualification.experience ?? lead.experience,
    },
    meta: data.meta,
  };
}
