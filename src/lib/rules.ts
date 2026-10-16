// Takeover rules: the code side of the 8 triggers in the approved Task 3 design.
// The model also returns a handoff flag; either one is enough to hand over.
// To add a rule live: append one object to RULES (id, priority, label, aiMayResume, test).

export type TriggerId =
  | "t1_earnings"
  | "t2_complaint"
  | "t3_commercials"
  | "t4_ready_to_act"
  | "t5_human_request"
  | "t6_cant_answer_twice"
  | "t7_loop"
  | "t8_brand_founder";

export interface RuleContext {
  leadType: "investor" | "founder";
  keenness: number;
  unansweredCount: number; // AI "let me check" replies so far, including the latest
  qualifiedFields: number;
  priorLeadMessages: string[];
  message: string;
}

export interface Rule {
  id: TriggerId;
  priority: number; // 1 = most serious
  label: string; // shown in the takeover banner
  aiMayResume: boolean; // false = only an explicit human hand-back returns the chat to AI
  test: (c: RuleContext) => boolean;
}

const has = (re: RegExp, text: string) => re.test(text.toLowerCase());

// Lead side: only "not asking/looking for a guarantee"-type phrases are ignored; everything else is checked,
// so "not asking for a guarantee, just the profit" and "not sure about the returns" both fire.
const NEGATED_SPAN = /\b(not|no|don'?t|do not|nahi|nahin)\s+(asking|looking|need|needing|want|wanting|expecting|interested)\s+(in\s+|for\s+)?(any\s+|a\s+|the\s+)?(guarantees?|guaranteed|profits?|returns?|earnings?)\b/g;
// AI side: only the refusal phrase itself is exempt ("can't promise any returns"); the rest of the sentence
// is still checked, so "I can't promise anything, but you'll earn great returns" is blocked.
const REFUSAL_SPAN = /\b(can'?t|cannot|won'?t|don'?t|do not|unable to|not able to)\s+(\w+\s+){0,2}(promise|guarantee|predict|estimate|commit to|share)(\s+(any|the|you|exact|specific|fixed|future))*(\s+(profits?|returns?|earnings?|income|figures?|numbers?))?\b/g;
const EARNINGS =
  /\b(profit|profits|returns?|roi|payback|pay back|break[- ]?even|earn|earning|earnings|income|guarantee[ds]?|guaranteed|munafa|faayda|fayda|kamai|kamayi|recover (my|the|our) (money|investment)|get (my|the) money back in|kitna (milega|kamaunga|bachega))\b/;

const COMPLAINT =
  /\b(scam|fraud|cheat(ed|ing)?|refund|money back|paise wapas|paisa wapas|consumer court|court|lawyer|legal action|police|complaint|complain|useless|worst|pathetic|dhoka|bakwas|harass(ed|ing)?)\b/;

const COMMERCIALS =
  /\b(discount|negotiat\w*|reduce (the )?(fee|price|amount)|lower (the )?(fee|price)|cheaper|emi|instal+ments?|payment plan|kam (karo|kar do|ho sakta)|exclusive|exclusivity|territory|whole (city|district)|royalty (waive|reduce|kam)|waive)\b|\b(do it|for) (in |at )?(rs\.?|₹)?\s?\d+(\.\d+)? ?(lakh|l|lac)\b/;

const HUMAN_REQUEST =
  /\b(call me|give me a call|phone (me|karo|kijiye)|call (karo|kijiye|back)|callback|speak to (a |an |some)?(human|person|someone|manager|consultant)|talk to (a |an |some)?(human|person|someone|real|manager|consultant)|real person|insaan|kisi (insaan|aadmi|banda) se|baat karao|manager se)\b/;

const NEXT_STEP =
  /\b(pay|payment today|token|booking amount|advance|sign|agreement|visit|see (an|the) outlet|meet (you|your team)|start (the )?process|aaj hi|book (it|karo|kar do))\b/;

function similar(a: string, b: string) {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2));
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return false;
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / new Set([...A, ...B]).size >= 0.6;
}

export const RULES: Rule[] = [
  {
    id: "t1_earnings",
    priority: 1,
    label: "Earnings or guarantee question",
    aiMayResume: false,
    test: (c) => has(EARNINGS, c.message.toLowerCase().replace(NEGATED_SPAN, " ")),
  },
  {
    id: "t2_complaint",
    priority: 2,
    label: "Complaint, refund or legal language",
    aiMayResume: false,
    // "What is the refund policy on the deposit?" is a question, not a complaint (golden case g32).
    test: (c) => has(COMPLAINT, c.message.toLowerCase().replace(/refund(able)? policy|refundable/g, "")),
  },
  { id: "t3_commercials", priority: 3, label: "Negotiating price or terms", aiMayResume: true, test: (c) => has(COMMERCIALS, c.message) },
  { id: "t4_ready_to_act", priority: 4, label: "Ready to act (keen, with a next step)", aiMayResume: true, test: (c) => c.keenness >= 80 && has(NEXT_STEP, c.message) },
  { id: "t5_human_request", priority: 5, label: "Asked for a person or a call", aiMayResume: true, test: (c) => has(HUMAN_REQUEST, c.message) },
  { id: "t6_cant_answer_twice", priority: 6, label: "AI couldn't answer, twice", aiMayResume: true, test: (c) => c.unansweredCount >= 2 },
  { id: "t7_loop", priority: 7, label: "Going in circles", aiMayResume: true, test: (c) => c.priorLeadMessages.some((p) => similar(p, c.message)) },
  { id: "t8_brand_founder", priority: 8, label: "Brand founder (partnerships team)", aiMayResume: false, test: (c) => c.leadType === "founder" && c.qualifiedFields >= 1 },
];

export const ruleById = (id: string) => RULES.find((r) => r.id === id);

// Highest-priority rule that fires and hasn't already fired for this lead (rules are one-shot per issue).
export function evaluateRules(c: RuleContext, alreadyFired: TriggerId[] = []): Rule | null {
  return [...RULES].sort((a, b) => a.priority - b.priority).find((r) => !alreadyFired.includes(r.id) && r.test(c)) ?? null;
}

// Replies the AI must never send: earnings talk, whatever the model returned.
export const replyMakesEarningsClaim = (reply: string) => has(EARNINGS, reply.toLowerCase().replace(REFUSAL_SPAN, " "));
