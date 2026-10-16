import { describe, expect, it } from "vitest";
import { deskReducer, initialState, type DeskEvent, type DeskState } from "@/lib/desk";
import { aiHumanSplit } from "@/lib/metrics";

const T = "2026-10-16T12:00:00+05:30";
const run = (events: DeskEvent[], start: DeskState = initialState()) => events.reduce(deskReducer, start);
const lead = (s: DeskState, id: string) => s.leads.find((l) => l.id === id)!;
const aiMessages = (s: DeskState, id: string) => s.messages.filter((m) => m.leadId === id && m.sender === "ai").length;

describe("ownership invariants", () => {
  it("a late AI reply after a human takes over is discarded, never shown", () => {
    const before = aiMessages(initialState(), "l1");
    const s = run([
      { type: "takeover", leadId: "l1", at: T },
      { type: "ai_reply", leadId: "l1", body: "Late reply", at: T },
    ]);
    expect(aiMessages(s, "l1")).toBe(before);
    expect(s.actions.at(-1)?.type).toBe("reply_discarded");
  });

  it("an earnings question hands over, and the AI cannot reply while waiting", () => {
    const s = run([
      { type: "lead_message", leadId: "l1", body: "Pakka faayda hoga na? Kitna profit hoga?", at: T },
      { type: "ai_reply", leadId: "l1", body: "Let me explain", at: T },
    ]);
    expect(lead(s, "l1").state).toBe("waiting");
    expect(lead(s, "l1").activeReason).toBe("t1_earnings");
    expect(s.messages.filter((m) => m.leadId === "l1" && m.body === "Let me explain")).toHaveLength(0);
  });

  it("an AI reply that talks about earnings is blocked even if the lead didn't ask", () => {
    const s = run([{ type: "ai_reply", leadId: "l1", body: "You will easily get a 30% return in year one!", at: T }]);
    expect(s.messages.some((m) => m.body.includes("30% return"))).toBe(false);
    expect(lead(s, "l1").state).toBe("waiting");
  });

  it("a one-shot rule does not re-fire after hand-back", () => {
    const s = run([
      { type: "lead_message", leadId: "l2", body: "Can you do it for 11 lakh instead?", at: T },
      { type: "takeover", leadId: "l2", at: T },
      { type: "human_reply", leadId: "l2", body: "The fee is fixed, but we can talk about phasing.", at: T },
      { type: "hand_back", leadId: "l2", at: T },
      { type: "lead_message", leadId: "l2", body: "Ok, any discount at all?", at: T },
    ]);
    expect(lead(s, "l2").state).toBe("ai_talking");
  });

  it("earnings questions always come back to a human, even after hand-back", () => {
    const s = run([
      { type: "lead_message", leadId: "l2", body: "What returns can I expect?", at: T },
      { type: "takeover", leadId: "l2", at: T },
      { type: "hand_back", leadId: "l2", at: T },
      { type: "lead_message", leadId: "l2", body: "Ok but guaranteed profit?", at: T },
    ]);
    expect(lead(s, "l2").activeReason).toBe("t1_earnings");
  });

  it("a false alarm returns the chat to the AI", () => {
    const s = run([
      { type: "lead_message", leadId: "l3", body: "Call me", at: T },
      { type: "false_alarm", leadId: "l3", at: T },
    ]);
    expect(lead(s, "l3").state).toBe("ai_talking");
  });

  it("brand founders cannot be handed back to the AI", () => {
    const s = run([
      { type: "ai_reply", leadId: "l5", body: "How many outlets do you run?", at: T, qualification: { budgetLakh: 40 } },
      { type: "takeover", leadId: "l5", at: T },
      { type: "hand_back", leadId: "l5", at: T },
    ]);
    expect(lead(s, "l5").state).toBe("human_talking");
  });

  it("two unanswerable questions hand over; the first only says 'let me check'", () => {
    const s1 = run([{ type: "ai_reply", leadId: "l4", body: "Let me check the royalty and come back.", at: T, unknown: true }]);
    expect(lead(s1, "l4").state).toBe("ai_talking");
    const s2 = run([{ type: "ai_reply", leadId: "l4", body: "I'll check the area rights too.", at: T, unknown: true }], s1);
    expect(lead(s2, "l4").activeReason).toBe("t6_cant_answer_twice");
  });

  it("a message after a closed deal reopens it for a human", () => {
    const s = run([{ type: "lead_message", leadId: "l6", body: "One more question", at: T }]);
    expect(lead(s, "l6").state).toBe("waiting");
  });

  it("SLA expiry sends one holding message only", () => {
    const s = run([
      { type: "lead_message", leadId: "l3", body: "Call me", at: T },
      { type: "sla_expire", leadId: "l3", at: T },
      { type: "sla_expire", leadId: "l3", at: T },
    ]);
    expect(s.actions.filter((a) => a.leadId === "l3" && a.type === "sla_alert")).toHaveLength(1);
  });

  it("every message and action id is unique (React keys)", () => {
    const s = run([
      { type: "lead_message", leadId: "l1", body: "Hello", at: T },
      { type: "ai_reply", leadId: "l1", body: "Hi!", at: T },
      { type: "lead_message", leadId: "l1", body: "Call me", at: T },
    ]);
    const ids = [...s.messages.map((m) => m.id), ...s.actions.map((a) => a.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the reducer never mutates the previous state", () => {
    const start = initialState();
    const frozen = JSON.stringify(start);
    run([{ type: "lead_message", leadId: "l1", body: "Call me", at: T }], start);
    expect(JSON.stringify(start)).toBe(frozen);
  });

  it("the badge equals a recount from the action log, excluding system events", () => {
    const s = run([
      { type: "lead_message", leadId: "l1", body: "Call me", at: T },
      { type: "takeover", leadId: "l1", at: T },
      { type: "sla_expire", leadId: "l3", at: T },
    ]);
    const ai = s.actions.filter((a) => a.actor === "ai").length;
    const human = s.actions.filter((a) => a.actor === "human").length;
    const split = aiHumanSplit(s.actions);
    expect(split.ai).toBe(ai);
    expect(split.human).toBe(human);
    expect(split.aiPct + split.humanPct).toBe(100);
  });
});
