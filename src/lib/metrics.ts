import type { Action, Lead, LeadTemperature, Message } from "@/lib/types";

// The badge is computed from the action log, never typed in.
// System events (alerts, held leads) count as neither AI nor human.
export function aiHumanSplit(actions: Action[]) {
  const ai = actions.filter((a) => a.actor === "ai").length;
  const human = actions.filter((a) => a.actor === "human").length;
  const total = ai + human;
  if (total === 0) return { ai: 0, human: 0, aiPct: 0, humanPct: 0 };
  const aiPct = Math.round((ai / total) * 100);
  return { ai, human, aiPct, humanPct: 100 - aiPct };
}

export function counters(leads: Lead[], messages: Message[]) {
  return {
    leads: leads.length,
    messages: messages.length,
    conversations: leads.filter((l) => l.state !== "closed").length,
  };
}

// Same thresholds as the score bar colours in growth-gap-fund's leads table.
export function temperature(score: number): LeadTemperature {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
