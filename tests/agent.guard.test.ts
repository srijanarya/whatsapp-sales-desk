import { describe, expect, it } from "vitest";
import { checkReply, moneyFigures } from "@/lib/agent/guard";
import { SYSTEM_PROMPT_TEMPLATE } from "@/lib/agent/prompt";

const BANJOS = "Banjos The Food Chain: Food service (QSR); listed investment ₹13 lakh; based in Maharashtra.";
const RFG = "RFG – Roar for Good: Retail; listed investment ₹55 lakh; based in Maharashtra; 45+ outlets.";

describe("reply guard", () => {
  it("normalises lakh formats", () => {
    expect(moneyFigures("₹13 lakh, 13L, 13 lac and Rs 1300000")).toEqual(["13lakh", "13lakh", "13lakh", "13lakh"]);
  });

  it("allows figures from this brand's facts", () => {
    expect(checkReply("Banjos lists ₹13 lakh to start.", BANJOS, "").ok).toBe(true);
  });

  it("blocks another brand's figure attributed here", () => {
    expect(checkReply("Banjos needs ₹55 lakh.", BANJOS, "").ok).toBe(false);
    expect(checkReply("RFG needs ₹55 lakh.", RFG, "").ok).toBe(true);
  });

  it("allows numbers the lead wrote themselves", () => {
    expect(checkReply("With your 12 lakh you're close.", BANJOS, "I have 12 lakh").ok).toBe(true);
  });

  it("blocks earnings claims, including Hinglish, but not refusals to promise", () => {
    expect(checkReply("Aapko pakka faayda hoga!", BANJOS, "").ok).toBe(false);
    expect(checkReply("You'll get your money back in 18 months via strong returns.", BANJOS, "").ok).toBe(false);
    expect(checkReply("I can't promise any returns; our consultant will explain.", BANJOS, "").ok).toBe(true);
  });

  it("blocks invented percentages", () => {
    expect(checkReply("Margins are around 40% here.", BANJOS, "").ok).toBe(false);
  });
});

describe("system prompt", () => {
  it("stays within the brief's 150-250 words", () => {
    const words = SYSTEM_PROMPT_TEMPLATE.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(150);
    expect(words).toBeLessThanOrEqual(250);
  });
});

describe("negation cannot be used to bypass the earnings checks (security review finding)", () => {
  it("blocks an earnings claim that merely contains a negative word", () => {
    expect(checkReply("No doubt you'll get great returns here.", BANJOS, "").ok).toBe(false);
    expect(checkReply("No worries, the profit is strong in Nashik.", BANJOS, "").ok).toBe(false);
  });
  it("still hands over a lead who negates one thing but asks about profit", async () => {
    const { evaluateRules } = await import("@/lib/rules");
    const r = evaluateRules({ leadType: "investor", keenness: 50, unansweredCount: 0, qualifiedFields: 1, priorLeadMessages: [], message: "Not asking for a guarantee, just tell me the profit." });
    expect(r?.id).toBe("t1_earnings");
  });
});

describe("second security review: refusal and negation spans stay narrow", () => {
  it("a refusal clause does not shield the rest of the sentence", () => {
    expect(checkReply("I can't promise anything, but you'll earn great returns.", BANJOS, "").ok).toBe(false);
    expect(checkReply("I can't promise any returns; our consultant will explain.", BANJOS, "").ok).toBe(true);
  });
  it("'not sure about the returns' is still an earnings question", async () => {
    const { evaluateRules } = await import("@/lib/rules");
    const ctx = { leadType: "investor" as const, keenness: 50, unansweredCount: 0, qualifiedFields: 1, priorLeadMessages: [] };
    expect(evaluateRules({ ...ctx, message: "Not sure about the returns, how much will I make?" })?.id).toBe("t1_earnings");
    expect(evaluateRules({ ...ctx, message: "I'm not asking for any guarantee, just the investment amount." })?.id ?? "none").toBe("none");
  });
});
