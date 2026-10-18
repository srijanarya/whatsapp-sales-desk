// Lead fields adapted from my growth-gap-fund CRM schema (leads + lead_activities),
// extended for a WhatsApp franchise sales desk.

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type LeadTemperature = "hot" | "warm" | "cold";
export type Channel = "meta_ads" | "whatsapp" | "voice" | "email";
export type LeadType = "investor" | "founder";
export type ConversationState = "ai_talking" | "waiting" | "human_talking" | "closed";
export type Actor = "ai" | "human" | "system";

export interface Brand {
  id: string;
  name: string;
  sector: string;
  investment: string; // exactly as listed
  base: string;
  outlets?: string;
  sourceUrl: string;
  asOf: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string; // synthetic
  leadType: LeadType;
  brandId: string | null; // null for brand founders
  channel: Channel;
  city: string | null;
  budgetLakh: number | null;
  timeline: string | null;
  hasSpace: boolean | null;
  experience: string | null;
  status: LeadStatus;
  score: number; // keenness 0-100
  state: ConversationState;
  firedTriggers: string[]; // rules are one-shot per issue
  activeReason: string | null; // why the chat is waiting for / held by a human
  unansweredCount: number; // AI "let me check" replies
  createdAt: string;
}

export interface Message {
  id: string;
  leadId: string;
  sender: "lead" | "ai" | "human" | "system";
  body: string;
  at: string;
}

export type ActionType =
  | "ai_reply"
  | "ai_qualified"
  | "trigger"
  | "takeover"
  | "human_reply"
  | "hand_back"
  | "false_alarm"
  | "sla_alert"
  | "closed"
  | "lead_held"
  | "reply_discarded"
  | "reopened"
  | "ai_unavailable"
  | "lead_created"
  | "send_failed";

export interface Action {
  id: string;
  leadId: string;
  actor: Actor;
  type: ActionType;
  detail: string;
  at: string;
  meta?: { model?: string; latencyMs?: number; tokensIn?: number; tokensOut?: number };
}
