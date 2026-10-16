import { z } from "zod";
import { RULES } from "@/lib/rules";

const triggerIds = RULES.map((r) => r.id) as [string, ...string[]];

// Output format enforced by the API's structured outputs (not part of the prompt's word count).
export const AgentOutput = z.object({
  reply: z.string().describe("The WhatsApp reply to send the lead, under 60 words, in the lead's language."),
  qualification: z.object({
    city: z.string().nullable(),
    budget_lakh: z.number().nullable(),
    timeline: z.string().nullable(),
    has_space: z.boolean().nullable(),
    experience: z.string().nullable(),
  }).describe("What you have learned so far; null for anything not yet known."),
  keenness: z.number().int().min(0).max(100).describe("How likely this lead is to buy, 0-100."),
  said_will_check: z.boolean().describe("True if this reply says you will check because the answer is not in the brand facts."),
  handoff: z.boolean(),
  handoff_reason: z.enum(triggerIds).nullable().describe("Which handover rule applies, if handoff is true."),
});

export type AgentOutput = z.infer<typeof AgentOutput>;

export const AgentRequest = z.object({
  leadId: z.string(),
  brandId: z.string().nullable(),
  leadType: z.enum(["investor", "founder"]),
  messages: z.array(z.object({ sender: z.enum(["lead", "ai", "human", "system"]), body: z.string() })).min(1),
});
