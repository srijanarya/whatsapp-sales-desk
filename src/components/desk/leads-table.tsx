"use client";

// Adapted from my growth-gap-fund admin leads table: same temperature icons,
// status badges, search and score bar; columns changed for franchise leads.
import { useState } from "react";
import { Flame, Search, Snowflake, ThermometerSun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brandById } from "@/lib/data/brands";
import { temperature } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { ConversationState, LeadTemperature } from "@/lib/types";
import { cn } from "@/lib/utils";

const tempIcon: Record<LeadTemperature, React.ReactNode> = {
  hot: <Flame className="h-4 w-4 text-red-400" aria-label="hot" />,
  warm: <ThermometerSun className="h-4 w-4 text-alert" aria-label="warm" />,
  cold: <Snowflake className="h-4 w-4 text-sky-400" aria-label="cold" />,
};

export const stateLabel: Record<ConversationState, string> = {
  ai_talking: "AI talking",
  waiting: "Waiting for human",
  human_talking: "Human talking",
  closed: "Closed",
};

// Short owner chip for the list, so the column fits beside name and keenness at laptop widths.
const stateChip: Record<ConversationState, { label: string; className: string }> = {
  ai_talking: { label: "AI", className: "border-blue-400/40 text-blue-400" },
  waiting: { label: "Needs human", className: "border-alert bg-alert/10 text-alert" },
  human_talking: { label: "Human", className: "border-success/60 text-success" },
  closed: { label: "Closed", className: "text-muted-foreground" },
};

// Below the lg breakpoint the chat sits under the lead list; bring it into view after a selection.
export function showConversationOnPhone() {
  if (!window.matchMedia("(max-width: 1023px)").matches) return;
  setTimeout(() => document.querySelector('section[aria-label="Conversation"]')?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
}

export function LeadsTable() {
  const { state, dispatch } = useDesk();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const leads = state.leads.filter(
    (l) => !q || l.name.toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search leads or cities" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border" data-testid="leads-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Keenness</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const brand = brandById(lead.brandId);
              const selected = lead.id === state.selectedLeadId;
              return (
                <TableRow
                  key={lead.id}
                  data-testid="lead-row"
                  data-selected={selected}
                  onClick={() => {
                    dispatch({ type: "select_lead", leadId: lead.id });
                    showConversationOnPhone();
                  }}
                  className={cn("cursor-pointer", selected && "bg-primary/10")}
                >
                  <TableCell className="max-w-0 w-full">
                    <div className="flex items-center gap-2">
                      {tempIcon[temperature(lead.score)]}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{lead.name}</div>
                        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          {lead.leadType === "founder" ? (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Brand founder</Badge>
                          ) : (
                            <span className="truncate">{brand?.name}</span>
                          )}
                          <span className="shrink-0">· {lead.city ?? "City unknown"}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full", lead.score >= 70 ? "bg-success" : lead.score >= 40 ? "bg-alert" : "bg-muted-foreground")}
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{lead.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      title={stateLabel[lead.state]}
                      className={cn("whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs", stateChip[lead.state].className)}
                    >
                      {stateChip[lead.state].label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {leads.length} of {state.leads.length} leads
      </p>
    </div>
  );
}
