// Conversation ownership as a pure reducer, so the safety rules can be tested directly.
// States: ai_talking -> waiting (human alerted) -> human_talking -> closed.
// Invariant: the AI can only add a message while the lead is ai_talking.
import { SEED_ACTIONS, SEED_LEADS, SEED_MESSAGES } from "@/lib/data/seed";
import { evaluateRules, replyMakesEarningsClaim, ruleById, type TriggerId } from "@/lib/rules";
import type { Action, Actor, ActionType, Channel, Lead, Message } from "@/lib/types";

export interface DeskState {
  leads: Lead[];
  messages: Message[];
  actions: Action[];
  selectedLeadId: string;
  pausedChannels: Channel[];
  heldLeads: number;
  seq: number;
}

type Qualification = Partial<Pick<Lead, "city" | "budgetLakh" | "timeline" | "hasSpace" | "experience">>;

export type DeskEvent =
  | { type: "select_lead"; leadId: string }
  | { type: "toggle_channel"; channel: Channel }
  | { type: "reset" }
  | { type: "lead_message"; leadId: string; body: string; at: string }
  | {
      type: "ai_reply";
      leadId: string;
      body: string;
      at: string;
      keenness?: number;
      qualification?: Qualification;
      unknown?: boolean;
      modelHandoff?: TriggerId | null;
      meta?: Action["meta"];
    }
  | { type: "ai_failed"; leadId: string; reason: string; at: string }
  | { type: "takeover"; leadId: string; at: string }
  | { type: "human_reply"; leadId: string; body: string; at: string }
  | { type: "hand_back"; leadId: string; at: string }
  | { type: "false_alarm"; leadId: string; at: string }
  | { type: "sla_expire"; leadId: string; at: string }
  | { type: "close"; leadId: string; outcome: "won" | "lost"; at: string }
  | { type: "lead_held"; leadId: string; channel: Channel; at: string };

export const HOLDING_MESSAGE = "Thanks for waiting. A consultant will reply here shortly.";
// t1 (earnings) and t2 (complaint) fire every time; the rest are one-shot per issue.
const ALWAYS_REFIRE: TriggerId[] = ["t1_earnings", "t2_complaint"];

export const initialState = (): DeskState => ({
  leads: SEED_LEADS,
  messages: SEED_MESSAGES,
  actions: SEED_ACTIONS,
  selectedLeadId: SEED_LEADS[0].id,
  pausedChannels: [],
  heldLeads: 0,
  seq: 1,
});

export const qualifiedFields = (l: Lead) =>
  [l.city, l.budgetLakh, l.timeline, l.hasSpace, l.experience].filter((v) => v !== null && v !== undefined).length;

export const reasonLabel = (reason: string | null) =>
  reason === "ai_unavailable" ? "AI unavailable" : reason === "reopened" ? "Lead wrote after the deal closed" : (ruleById(reason ?? "")?.label ?? reason ?? "");

export function deskReducer(state: DeskState, e: DeskEvent): DeskState {
  let s = { ...state }; // copy first: the id counter below must never mutate the previous state
  const lead = "leadId" in e ? s.leads.find((l) => l.id === e.leadId) : undefined;

  const id = (p: string) => `run-${p}${s.seq++}`; // "run-" keeps ids distinct from seed ids (m1, a1, ...)
  const patch = (changes: Partial<Lead>) => {
    s = { ...s, leads: s.leads.map((l) => (l.id === lead!.id ? { ...l, ...changes } : l)) };
  };
  const cur = () => s.leads.find((l) => l.id === lead!.id)!;
  const act = (actor: Actor, type: ActionType, detail: string, at: string, meta?: Action["meta"]) => {
    const actionId = id("a"); // take the id before copying s, or the counter bump is lost
    s = { ...s, actions: [...s.actions, { id: actionId, leadId: lead!.id, actor, type, detail, at, meta }] };
  };
  const say = (sender: Message["sender"], body: string, at: string) => {
    const messageId = id("m");
    s = { ...s, messages: [...s.messages, { id: messageId, leadId: lead!.id, sender, body, at }] };
  };
  const trigger = (rule: TriggerId, at: string, via: "code" | "model") => {
    const l = cur();
    patch({
      state: "waiting",
      activeReason: rule,
      firedTriggers: l.firedTriggers.includes(rule) ? l.firedTriggers : [...l.firedTriggers, rule],
    });
    act("system", "trigger", `${ruleById(rule)?.label} (${via} rule)`, at);
  };
  const check = (message: string, at: string, modelHandoff?: TriggerId | null) => {
    const l = cur();
    const prior = s.messages.filter((m) => m.leadId === l.id && m.sender === "lead").map((m) => m.body).slice(0, -1);
    const blocked = l.firedTriggers.filter((t) => !ALWAYS_REFIRE.includes(t as TriggerId)) as TriggerId[];
    const rule = evaluateRules(
      { leadType: l.leadType, keenness: l.score, unansweredCount: l.unansweredCount, qualifiedFields: qualifiedFields(l), priorLeadMessages: prior, message },
      blocked,
    );
    const model = modelHandoff && !blocked.includes(modelHandoff) ? ruleById(modelHandoff) : null;
    const winner = [rule, model].filter(Boolean).sort((a, b) => a!.priority - b!.priority)[0];
    if (rule && model && rule.id !== model.id) act("system", "trigger", `Model said ${model.id}, code said ${rule.id}; showing the more serious`, at);
    if (winner) trigger(winner.id, at, winner === rule ? "code" : "model");
  };

  switch (e.type) {
    case "select_lead":
      return { ...s, selectedLeadId: e.leadId };
    case "toggle_channel": {
      const paused = s.pausedChannels.includes(e.channel);
      return { ...s, pausedChannels: paused ? s.pausedChannels.filter((c) => c !== e.channel) : [...s.pausedChannels, e.channel] };
    }
    case "reset":
      return initialState();
  }

  if (!lead) return state;

  switch (e.type) {
    case "lead_message": {
      say("lead", e.body, e.at);
      if (lead.state === "closed") {
        patch({ state: "waiting", activeReason: "reopened" });
        act("system", "reopened", "Lead wrote after the deal closed", e.at);
      } else if (lead.state === "ai_talking") {
        check(e.body, e.at);
      }
      return s;
    }
    case "ai_reply": {
      if (lead.state !== "ai_talking") {
        act("system", "reply_discarded", "Late AI reply discarded: the chat had already gone to a human", e.at);
        return s;
      }
      if (replyMakesEarningsClaim(e.body)) {
        act("system", "reply_discarded", "AI reply blocked: it talked about earnings", e.at);
        trigger("t1_earnings", e.at, "code");
        return s;
      }
      say("ai", e.body, e.at);
      act("ai", "ai_reply", e.unknown ? "Said it would check (answer not in brand facts)" : "Replied", e.at, e.meta);
      const before = qualifiedFields(lead);
      patch({
        ...(e.qualification ?? {}),
        score: e.keenness ?? lead.score,
        unansweredCount: lead.unansweredCount + (e.unknown ? 1 : 0),
        status: lead.status === "new" ? "contacted" : lead.status,
      });
      if (qualifiedFields(cur()) > before) act("ai", "ai_qualified", `Captured ${qualifiedFields(cur())}/5 qualification fields`, e.at);
      const lastLead = [...s.messages].reverse().find((m) => m.leadId === lead.id && m.sender === "lead");
      check(lastLead?.body ?? "", e.at, e.modelHandoff);
      return s;
    }
    case "ai_failed": {
      if (lead.state !== "ai_talking") return s;
      patch({ state: "waiting", activeReason: "ai_unavailable" });
      act("system", "ai_unavailable", `AI unavailable: ${e.reason}`, e.at);
      return s;
    }
    case "takeover": {
      if (lead.state === "human_talking" || lead.state === "closed") return s;
      patch({ state: "human_talking" });
      act("human", "takeover", `Consultant took over${lead.activeReason ? `: ${reasonLabel(lead.activeReason)}` : ""}`, e.at);
      return s;
    }
    case "human_reply": {
      if (lead.state === "closed") return s;
      if (lead.state !== "human_talking") {
        patch({ state: "human_talking" });
        act("human", "takeover", "Consultant took over by replying", e.at);
      }
      say("human", e.body, e.at);
      act("human", "human_reply", "Consultant replied", e.at);
      return s;
    }
    case "hand_back": {
      if (lead.state !== "human_talking" || lead.leadType === "founder") return s; // founders stay with a human
      patch({ state: "ai_talking", activeReason: null, unansweredCount: 0 });
      act("human", "hand_back", "Handed back to AI", e.at);
      return s;
    }
    case "false_alarm": {
      if (lead.state !== "waiting") return s;
      patch({ state: "ai_talking", activeReason: null, unansweredCount: 0 });
      act("human", "false_alarm", "Dismissed as a false alarm", e.at);
      return s;
    }
    case "sla_expire": {
      const last = [...s.actions].reverse().find((a) => a.leadId === lead.id);
      if (lead.state !== "waiting" || last?.type === "sla_alert") return s;
      say("system", HOLDING_MESSAGE, e.at);
      act("system", "sla_alert", "Nobody picked up in time: holding message sent, manager alerted", e.at);
      return s;
    }
    case "close": {
      if (lead.state === "closed") return s;
      patch({ state: "closed", status: e.outcome, activeReason: null });
      act("human", "closed", e.outcome === "won" ? "Won" : "Lost", e.at);
      return s;
    }
    case "lead_held": {
      act("system", "lead_held", `New message held: ${e.channel} channel is paused`, e.at);
      return { ...s, heldLeads: s.heldLeads + 1 };
    }
  }
}
