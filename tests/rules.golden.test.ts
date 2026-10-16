import { describe, expect, it } from "vitest";
import cases from "./golden/rule-cases.json";
import { evaluateRules } from "@/lib/rules";

// Golden cases were written by a separate agent from the Task 3 text, before the engine existed.
// "code" cases must pass on the code rules alone. "model" cases (paraphrases, judgment calls)
// are scored here for visibility only; the live-model eval is where they count.

type Case = {
  id: string;
  lead_type: "investor" | "founder";
  context: { keenness: number; unanswered_count: number; qualified_fields: number };
  prior_lead_messages: string[];
  message: string;
  expected: string;
  checkable_by: "code" | "model";
  note: string;
};

const run = (c: Case) =>
  evaluateRules({
    leadType: c.lead_type,
    keenness: c.context.keenness,
    unansweredCount: c.context.unanswered_count,
    qualifiedFields: c.context.qualified_fields,
    priorLeadMessages: c.prior_lead_messages,
    message: c.message,
  })?.id ?? "none";

const all = cases as Case[];

describe("golden rule cases (code-checkable)", () => {
  for (const c of all.filter((x) => x.checkable_by === "code")) {
    it(`${c.id}: ${c.message.slice(0, 60)} -> ${c.expected}`, () => {
      expect(run(c)).toBe(c.expected);
    });
  }
});

describe("golden rule cases (model-checkable, report only)", () => {
  it("prints code-rule coverage of model cases", () => {
    const model = all.filter((x) => x.checkable_by === "model");
    const hits = model.filter((c) => run(c) === c.expected);
    console.log(`code rules also catch ${hits.length}/${model.length} model-checkable cases:`,
      model.map((c) => `${c.id}:${run(c) === c.expected ? "hit" : `miss(${run(c)})`}`).join(" "));
    expect(model.length).toBeGreaterThan(0);
  });
});
