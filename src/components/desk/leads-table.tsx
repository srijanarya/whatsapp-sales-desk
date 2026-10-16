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
              <TableHead>Interest</TableHead>
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
                  onClick={() => dispatch({ type: "select_lead", leadId: lead.id })}
                  className={cn("cursor-pointer", selected && "bg-primary/10")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tempIcon[temperature(lead.score)]}
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.city ?? "City unknown"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.leadType === "founder" ? (
                      <Badge variant="outline">Brand founder</Badge>
                    ) : (
                      <span>{brand?.name}</span>
                    )}
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
                  <TableCell className="text-xs text-muted-foreground">{stateLabel[lead.state]}</TableCell>
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
