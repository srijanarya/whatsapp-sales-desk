import type { Action, Lead, Message } from "@/lib/types";

// Synthetic people, conversations and history. No real person or real chat.
// Seed data never carries trigger decisions: takeovers come from the rules engine at run time.

export const SEED_LEADS: Lead[] = [
  { id: "l1", name: "Rahul Patil", phone: "+91 98xxx xx012", leadType: "investor", brandId: "banjos", channel: "whatsapp", city: "Nashik", budgetLakh: 12, timeline: "3 months", hasSpace: null, experience: null, status: "contacted", score: 58, state: "ai_talking", firedTriggers: [], activeReason: null, unansweredCount: 0, createdAt: "2026-10-16T09:12:00+05:30" },
  { id: "l2", name: "Sneha Kulkarni", phone: "+91 97xxx xx448", leadType: "investor", brandId: "garagewalle", channel: "meta_ads", city: "Pune", budgetLakh: 15, timeline: "1 month", hasSpace: true, experience: "Runs a spare-parts shop", status: "qualified", score: 76, state: "ai_talking", firedTriggers: [], activeReason: null, unansweredCount: 0, createdAt: "2026-10-16T09:40:00+05:30" },
  { id: "l3", name: "Imran Shaikh", phone: "+91 99xxx xx731", leadType: "investor", brandId: "chargze", channel: "whatsapp", city: "Lucknow", budgetLakh: null, timeline: null, hasSpace: null, experience: null, status: "new", score: 30, state: "ai_talking", firedTriggers: [], activeReason: null, unansweredCount: 0, createdAt: "2026-10-16T10:05:00+05:30" },
  { id: "l4", name: "Priya Nair", phone: "+91 96xxx xx209", leadType: "investor", brandId: "rfg", channel: "email", city: "Thane", budgetLakh: 60, timeline: "6 months", hasSpace: false, experience: "10 years in retail management", status: "contacted", score: 64, state: "ai_talking", firedTriggers: [], activeReason: null, unansweredCount: 0, createdAt: "2026-10-15T17:20:00+05:30" },
  { id: "l5", name: "Arjun Mehta", phone: "+91 98xxx xx865", leadType: "founder", brandId: null, channel: "meta_ads", city: "Pune", budgetLakh: null, timeline: null, hasSpace: null, experience: "Runs 3 cafés", status: "new", score: 45, state: "ai_talking", firedTriggers: [], activeReason: null, unansweredCount: 0, createdAt: "2026-10-16T11:02:00+05:30" },
  { id: "l6", name: "Kavita Deshmukh", phone: "+91 95xxx xx510", leadType: "investor", brandId: "mihikoli", channel: "voice", city: "Ratnagiri", budgetLakh: 50, timeline: "Next year", hasSpace: true, experience: null, status: "won", score: 92, state: "closed", firedTriggers: [], activeReason: null, unansweredCount: 0, createdAt: "2026-10-12T12:30:00+05:30" },
];

export const SEED_MESSAGES: Message[] = [
  { id: "m1", leadId: "l1", sender: "lead", body: "Hi, I saw the Banjos franchise. I'm in Nashik and have about 12 lakh. Is that enough?", at: "2026-10-16T09:12:00+05:30" },
  { id: "m2", leadId: "l1", sender: "ai", body: "Hi Rahul! Banjos lists a starting investment of ₹13 lakh, so you're close. When are you hoping to start?", at: "2026-10-16T09:12:20+05:30" },
  { id: "m3", leadId: "l1", sender: "lead", body: "In about 3 months.", at: "2026-10-16T09:15:00+05:30" },
  { id: "m4", leadId: "l1", sender: "ai", body: "Great. Do you already have a shop space in Nashik, or would you be looking for one?", at: "2026-10-16T09:15:15+05:30" },
  { id: "m5", leadId: "l2", sender: "lead", body: "Saw your ad for Garagewalle. I run a spare-parts shop in Pune and have 15 lakh ready.", at: "2026-10-16T09:40:00+05:30" },
  { id: "m6", leadId: "l2", sender: "ai", body: "That's a strong fit, Sneha. Garagewalle lists ₹13 lakh to start. Do you have a space for the workshop?", at: "2026-10-16T09:40:30+05:30" },
  { id: "m7", leadId: "l2", sender: "lead", body: "Yes, next to my shop. I want to start within a month.", at: "2026-10-16T09:42:00+05:30" },
  { id: "m8", leadId: "l3", sender: "lead", body: "Chargze ka franchise kaise milta hai?", at: "2026-10-16T10:05:00+05:30" },
  { id: "m9", leadId: "l3", sender: "ai", body: "Namaste Imran! Chargze lists ₹13 lakh ka starting investment. Aap kis city mein start karna chahte hain?", at: "2026-10-16T10:05:25+05:30" },
  { id: "m10", leadId: "l4", sender: "lead", body: "Interested in RFG for Thane. I have about 60 lakh and plan to start in 6 months.", at: "2026-10-15T17:20:00+05:30" },
  { id: "m11", leadId: "l4", sender: "ai", body: "Thanks Priya. RFG lists ₹55 lakh to start and has 45+ outlets. Do you have a retail space in mind?", at: "2026-10-15T17:21:00+05:30" },
  { id: "m12", leadId: "l5", sender: "lead", body: "I run 3 cafés in Pune and want to franchise my own brand. Can you help?", at: "2026-10-16T11:02:00+05:30" },
  { id: "m13", leadId: "l6", sender: "human", body: "Welcome aboard, Kavita. The agreement and onboarding checklist are on their way.", at: "2026-10-14T16:00:00+05:30" },
];

export const SEED_ACTIONS: Action[] = [
  { id: "a1", leadId: "l1", actor: "ai", type: "ai_reply", detail: "Answered investment question from brand facts", at: "2026-10-16T09:12:20+05:30" },
  { id: "a2", leadId: "l1", actor: "ai", type: "ai_qualified", detail: "City, budget, timeline captured", at: "2026-10-16T09:15:15+05:30" },
  { id: "a3", leadId: "l2", actor: "ai", type: "ai_reply", detail: "Answered investment question from brand facts", at: "2026-10-16T09:40:30+05:30" },
  { id: "a4", leadId: "l2", actor: "ai", type: "ai_qualified", detail: "All five qualification fields captured", at: "2026-10-16T09:42:30+05:30" },
  { id: "a5", leadId: "l3", actor: "ai", type: "ai_reply", detail: "Replied in Hinglish", at: "2026-10-16T10:05:25+05:30" },
  { id: "a6", leadId: "l4", actor: "ai", type: "ai_reply", detail: "Answered investment question from brand facts", at: "2026-10-15T17:21:00+05:30" },
  { id: "a7", leadId: "l6", actor: "ai", type: "ai_qualified", detail: "Qualified on voice", at: "2026-10-12T12:40:00+05:30" },
  { id: "a8", leadId: "l6", actor: "human", type: "takeover", detail: "Consultant took over to close", at: "2026-10-13T10:00:00+05:30" },
  { id: "a9", leadId: "l6", actor: "human", type: "human_reply", detail: "Sent agreement and onboarding checklist", at: "2026-10-14T16:00:00+05:30" },
  { id: "a10", leadId: "l6", actor: "human", type: "closed", detail: "Won", at: "2026-10-14T16:05:00+05:30" },
];
