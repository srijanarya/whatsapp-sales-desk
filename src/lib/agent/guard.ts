// Code checks on every model reply before it reaches the lead. They fail closed:
// a blocked reply is never shown, and the chat goes to a human.
import { replyMakesEarningsClaim } from "@/lib/rules";

// Money and percentage figures, normalised: "₹13 lakh", "13L", "13 lac", "13,00,000", "30%".
export function moneyFigures(text: string): string[] {
  const t = text.toLowerCase().replace(/,/g, "");
  const out: string[] = [];
  for (const m of t.matchAll(/(?:₹|rs\.?\s?)?(\d+(?:\.\d+)?)\s?(lakh|lac|l\b|crore|cr\b|%)/g)) {
    const n = parseFloat(m[1]);
    const unit = m[2].startsWith("cr") ? "cr" : m[2] === "%" ? "%" : "lakh";
    out.push(`${n}${unit}`);
  }
  for (const m of t.matchAll(/(?:₹|rs\.?\s?)(\d{5,})/g)) out.push(`${parseInt(m[1], 10) / 100000}lakh`);
  return out;
}

export type GuardResult = { ok: true } | { ok: false; reason: string; trigger: "t1_earnings" | null };

// A figure in the reply must appear in this brand's facts or in what the lead wrote.
export function checkReply(reply: string, brandFacts: string, leadText: string): GuardResult {
  if (replyMakesEarningsClaim(reply)) return { ok: false, reason: "reply talked about earnings", trigger: "t1_earnings" };
  const allowed = new Set([...moneyFigures(brandFacts), ...moneyFigures(leadText)]);
  const ungrounded = moneyFigures(reply).filter((f) => !allowed.has(f));
  if (ungrounded.length) return { ok: false, reason: `reply stated figures not in the brand facts: ${ungrounded.join(", ")}`, trigger: null };
  return { ok: true };
}
