"use client";

import { stateLabel } from "@/components/desk/leads-table";
import { useDesk } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Conversation() {
  const { state } = useDesk();
  const lead = state.leads.find((l) => l.id === state.selectedLeadId);
  const messages = state.messages.filter((m) => m.leadId === state.selectedLeadId);
  if (!lead) return null;

  return (
    <section className="flex h-full flex-col rounded-lg border bg-card" aria-label="Conversation">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="font-medium">{lead.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{lead.phone}</div>
        </div>
        <span data-testid="conversation-state" className="rounded-md border px-2 py-1 text-xs">
          {stateLabel[lead.state]}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4" data-testid="messages">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.sender === "lead" ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                m.sender === "lead" && "bg-muted",
                m.sender === "ai" && "bg-primary/20",
                m.sender === "human" && "bg-success/20",
              )}
            >
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {m.sender === "lead" ? lead.name.split(" ")[0] : m.sender === "ai" ? "AI agent" : "Consultant"}
              </div>
              {m.body}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        Takeover controls and live replies arrive in the next build step.
      </div>
    </section>
  );
}
