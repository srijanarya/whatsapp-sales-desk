"use client";

import { Check, Minus } from "lucide-react";
import { brandById } from "@/lib/data/brands";
import { useDesk } from "@/lib/store";
import { cn } from "@/lib/utils";

const actorStyle = { ai: "text-primary", human: "text-success", system: "text-alert" } as const;

export function LeadCard() {
  const { state } = useDesk();
  const lead = state.leads.find((l) => l.id === state.selectedLeadId);
  if (!lead) return null;
  const brand = brandById(lead.brandId);
  const actions = state.actions.filter((a) => a.leadId === lead.id);

  const checklist = [
    { label: "City", value: lead.city },
    { label: "Budget", value: lead.budgetLakh != null ? `₹${lead.budgetLakh} lakh` : null },
    { label: "Start timeline", value: lead.timeline },
    { label: "Shop space", value: lead.hasSpace == null ? null : lead.hasSpace ? "Has space" : "Needs space" },
    { label: "Business experience", value: lead.experience },
  ];

  return (
    <aside className="flex h-full flex-col gap-4 overflow-auto" aria-label="Lead card">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">{lead.leadType === "founder" ? "Brand founder" : "Brand interest"}</h2>
        {brand ? (
          <dl className="space-y-1 text-sm" data-testid="brand-facts">
            <div className="font-medium">{brand.name}</div>
            <div className="text-muted-foreground">{brand.sector}</div>
            <div>
              Listed investment: <span className="font-mono">{brand.investment}</span>
            </div>
            <div className="text-muted-foreground">
              {brand.base}
              {brand.outlets ? ` · ${brand.outlets}` : ""}
            </div>
            <a href={brand.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              Source: public listing, {brand.asOf}
            </a>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Wants to franchise their own brand. Routed to the brand partnerships team.</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Qualification</h2>
        <ul className="space-y-1.5 text-sm">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              {c.value ? <Check className="h-4 w-4 text-success" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className="text-muted-foreground">{c.label}:</span>
              <span>{c.value ?? "not yet"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Action log</h2>
        <ol className="space-y-1.5 font-mono text-xs" data-testid="action-log">
          {actions.length === 0 && <li className="text-muted-foreground">No actions yet</li>}
          {actions.map((a) => (
            <li key={a.id}>
              <span className={cn("uppercase", actorStyle[a.actor])}>{a.actor}</span>{" "}
              <span className="text-muted-foreground">{a.type.replace("_", " ")}</span> · {a.detail}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
