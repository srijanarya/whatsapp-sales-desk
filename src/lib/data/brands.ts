import type { Brand } from "@/lib/types";

// Only facts shown on the public franchise listings of scale100x.ai on 16 Oct 2026.
// These are directory listings, not confirmed clients. No other facts may be attributed to them.
const SOURCE = "https://scale100x.ai";
const AS_OF = "2026-10-16";

export const BRANDS: Brand[] = [
  { id: "banjos", name: "Banjos The Food Chain", sector: "Food service (QSR)", investment: "₹13 lakh", base: "Maharashtra", sourceUrl: SOURCE, asOf: AS_OF },
  { id: "garagewalle", name: "Garagewalle", sector: "Automotive (two-wheeler service)", investment: "₹13 lakh", base: "Maharashtra", sourceUrl: SOURCE, asOf: AS_OF },
  { id: "chargze", name: "Chargze", sector: "Electric vehicles (two-wheelers)", investment: "₹13 lakh", base: "Noida", sourceUrl: SOURCE, asOf: AS_OF },
  { id: "rfg", name: "RFG – Roar for Good", sector: "Retail", investment: "₹55 lakh", base: "Maharashtra", outlets: "45+ outlets", sourceUrl: SOURCE, asOf: AS_OF },
  { id: "mihikoli", name: "Mi Hi Koli", sector: "Food & beverage", investment: "₹50 lakh", base: "Maharashtra", sourceUrl: SOURCE, asOf: AS_OF },
  { id: "eveez", name: "EVeez", sector: "Automotive", investment: "₹90 lakh – ₹1 crore", base: "Gurugram", outlets: "10+ outlets", sourceUrl: SOURCE, asOf: AS_OF },
];

export const brandById = (id: string | null) => BRANDS.find((b) => b.id === id) ?? null;
