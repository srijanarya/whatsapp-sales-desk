import type { Lead } from "@/lib/types";

// Pre-written demo conversations. They carry NO takeover decisions: every lead message goes
// through the rules engine, and a scripted AI reply is discarded if a human owns the chat by then.
export type Step =
  | { kind: "lead"; body: string }
  | {
      kind: "ai";
      body: string;
      keenness?: number;
      qualification?: Partial<Pick<Lead, "city" | "budgetLakh" | "timeline" | "hasSpace" | "experience">>;
      unknown?: boolean;
    };

export interface Scenario {
  id: string;
  title: string;
  leadId: string;
  steps: Step[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "earnings",
    title: "Earnings question (Hinglish)",
    leadId: "l1",
    steps: [
      { kind: "lead", body: "Haan, Nashik mein ek chhoti shop hai mere paas." },
      { kind: "ai", body: "Badhiya, Rahul! Aapka pehle koi business experience raha hai?", keenness: 66, qualification: { hasSpace: true } },
      { kind: "lead", body: "Kirana chalaya hai 5 saal. Lekin pakka faayda kitna hoga?" },
      { kind: "ai", body: "Aapko har mahine achha return milega!" },
    ],
  },
  {
    id: "discount",
    title: "Discount request",
    leadId: "l2",
    steps: [{ kind: "lead", body: "Can you do it for 11 lakh instead?" }],
  },
  {
    id: "ready",
    title: "Ready to pay",
    leadId: "l4",
    steps: [
      { kind: "lead", body: "I've found a retail space near Thane station." },
      { kind: "ai", body: "That's great, Priya. A space near the station suits retail well. Shall I share the next steps?", keenness: 84, qualification: { hasSpace: true } },
      { kind: "lead", body: "Yes. Can I pay the booking amount this week?" },
    ],
  },
  {
    id: "person",
    title: "Asks for a person (Hinglish)",
    leadId: "l3",
    steps: [
      { kind: "lead", body: "Lucknow se hoon, 14 lakh hai, 2 mahine mein start karna hai." },
      { kind: "ai", body: "Shukriya Imran! Kya aapke paas shop ki jagah hai?", keenness: 55, qualification: { city: "Lucknow", budgetLakh: 14, timeline: "2 months" } },
      { kind: "lead", body: "Pehle kisi insaan se baat karao." },
    ],
  },
  {
    id: "founder",
    title: "Brand founder",
    leadId: "l5",
    steps: [{ kind: "ai", body: "Great to hear, Arjun. How many outlets do you run, and roughly what yearly revenue?", keenness: 50 }],
  },
  {
    id: "unknown",
    title: "Can't answer, twice",
    leadId: "l2",
    steps: [
      { kind: "lead", body: "What royalty do you charge every month?" },
      { kind: "ai", body: "Let me check the royalty with the team and come back to you.", unknown: true },
      { kind: "lead", body: "And what training do you give my mechanics?" },
      { kind: "ai", body: "I'll check the training details too.", unknown: true },
    ],
  },
];
