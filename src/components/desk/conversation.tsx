"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stateLabel } from "@/components/desk/leads-table";
import { askAgent } from "@/lib/ask-agent";
import { deskReducer, reasonLabel, windowOpen } from "@/lib/desk";
import { useDesk } from "@/lib/store";
import { useLiveAi } from "@/lib/use-live-ai";
import { cn } from "@/lib/utils";

const now = () => new Date().toISOString();

export function Conversation() {
  const { state, dispatch, live } = useDesk();
  const liveAi = useLiveAi();
  const [leadText, setLeadText] = useState("");
  const [humanText, setHumanText] = useState("");
  const [thinking, setThinking] = useState(false);
  const lead = state.leads.find((l) => l.id === state.selectedLeadId);
  const messages = state.messages.filter((m) => m.leadId === state.selectedLeadId);
  const scroller = useRef<HTMLDivElement>(null);
  // Keep the newest message in view.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, thinking, state.selectedLeadId]);
  if (!lead)
    return live ? (
      <section className="flex h-full items-center justify-center rounded-lg border bg-card p-6 text-sm text-muted-foreground" aria-label="Conversation">
        No WhatsApp enquiries yet. Message the test number from a registered phone.
      </section>
    ) : null;
  // Live only: a human reply can go out only inside WhatsApp's 24-hour customer-service window.
  const windowClosed = Boolean(live) && !windowOpen(messages.findLast((m) => m.sender === "lead")?.at);
  const lastAction = state.actions.findLast((a) => a.leadId === lead.id);
  const notice = live?.error ?? (lastAction?.type === "send_failed" ? lastAction.detail : null);

  const sendAsLead = async () => {
    const body = leadText.trim().slice(0, 600);
    if (!body) return;
    setLeadText("");
    const event = { type: "lead_message" as const, leadId: lead.id, body, at: now() };
    // Run the same reducer locally to know whether the AI still owns the chat after the rules run.
    const next = deskReducer(state, event);
    dispatch(event);
    const after = next.leads.find((l) => l.id === lead.id)!;
    if (liveAi && after.state === "ai_talking") {
      setThinking(true);
      dispatch(await askAgent(after, next.messages.filter((m) => m.leadId === lead.id)));
      setThinking(false);
    }
  };

  const retry = async () => {
    if (live) return live.retryAi(lead.id);
    dispatch({ type: "false_alarm", leadId: lead.id, at: now() });
    setThinking(true);
    dispatch(await askAgent({ ...lead, state: "ai_talking" }, messages));
    setThinking(false);
  };

  const sendAsHuman = () => {
    const body = humanText.trim();
    if (!body) return;
    setHumanText("");
    dispatch({ type: "human_reply", leadId: lead.id, body, at: now() });
  };

  const isFounder = lead.leadType === "founder";

  return (
    <section className="flex h-full flex-col rounded-lg border bg-card" aria-label="Conversation">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="font-medium">{lead.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{lead.phone}</div>
        </div>
        <span
          data-testid="conversation-state"
          className={cn(
            "rounded-md border px-2 py-1 text-xs",
            lead.state === "waiting" && "border-alert text-alert",
            lead.state === "human_talking" && "border-success text-success",
          )}
        >
          {stateLabel[lead.state]}
        </span>
      </div>

      {lead.state === "waiting" && (
        <div
          data-testid="takeover-banner"
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-alert/10 px-4 py-3 shadow-[inset_3px_0_0_var(--alert)]"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-alert" />
          <div className="min-w-48 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-alert">Human needed</div>
            <div className="text-sm font-semibold text-foreground">{reasonLabel(lead.activeReason)}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => dispatch({ type: "takeover", leadId: lead.id, at: now() })}>
              Take over
            </Button>
            {lead.activeReason === "ai_unavailable" ? (
              <Button size="sm" variant="outline" onClick={retry} disabled={!liveAi && !live}>
                Retry AI
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => dispatch({ type: "false_alarm", leadId: lead.id, at: now() })}>
                False alarm
              </Button>
            )}
          </div>
        </div>
      )}

      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-auto p-4" data-testid="messages">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.sender === "lead" ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                m.sender === "lead" && "bg-muted",
                m.sender === "ai" && "bg-primary/20",
                m.sender === "human" && "bg-success/20",
                m.sender === "system" && "border border-dashed text-muted-foreground",
              )}
            >
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {m.sender === "lead" ? lead.name.split(" ")[0] : m.sender === "ai" ? "AI agent" : m.sender === "human" ? "Consultant" : "Auto holding message"}
              </div>
              {m.body}
            </div>
          </div>
        ))}
        {thinking && <div className="text-right text-xs text-muted-foreground">AI agent is typing…</div>}
      </div>

      <div className="space-y-2 border-t px-4 py-3">
        {notice && (
          <p data-testid="live-notice" role="alert" className="rounded-md border border-alert bg-alert/10 px-3 py-2 text-xs text-alert">
            {notice}
          </p>
        )}
        {windowClosed && lead.state !== "closed" && (
          <p data-testid="window-notice" className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
            Outside WhatsApp&apos;s 24-hour window: the lead last wrote more than 24 hours ago, so a free-form reply can&apos;t be
            sent. It reopens when they write again. (Template messages are not set up.)
          </p>
        )}
        {lead.state === "ai_talking" && (
          <Button size="sm" variant="outline" onClick={() => dispatch({ type: "takeover", leadId: lead.id, at: now() })}>
            <UserRound className="mr-1 h-4 w-4" /> Take over
          </Button>
        )}
        {lead.state === "human_talking" && (
          <div className="space-y-2">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); sendAsHuman(); }}>
              <Input data-testid="human-input" placeholder={live ? "Reply on WhatsApp as the consultant" : "Reply as the consultant"} value={humanText} onChange={(e) => setHumanText(e.target.value)} disabled={windowClosed} />
              <Button size="sm" type="submit" disabled={windowClosed}>Send</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={isFounder} onClick={() => dispatch({ type: "hand_back", leadId: lead.id, at: now() })}
                title={isFounder ? "Brand founders stay with the partnerships team" : undefined}>
                <Bot className="mr-1 h-4 w-4" /> Hand back to AI
              </Button>
              <Button size="sm" variant="outline" onClick={() => dispatch({ type: "close", leadId: lead.id, outcome: "won", at: now() })}>Close: won</Button>
              <Button size="sm" variant="outline" onClick={() => dispatch({ type: "close", leadId: lead.id, outcome: "lost", at: now() })}>Close: lost</Button>
            </div>
          </div>
        )}
        {live ? (
          <p className="text-[11px] text-muted-foreground">
            Live WhatsApp{live.whatsapp ? "" : " (sending is not configured)"}: the AI and the takeover rules answer real messages on the
            server. Replies you send here go to {lead.phone}.
          </p>
        ) : (<>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); sendAsLead(); }}>
          <Input
            data-testid="lead-input"
            placeholder={`Type as ${lead.name.split(" ")[0]} (the lead) to test the rules`}
            value={leadText}
            maxLength={600}
            onChange={(e) => setLeadText(e.target.value)}
          />
          <Button size="sm" variant="secondary" type="submit">Send</Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          {liveAi ? "Live AI is on: the AI replies to what you type, and the takeover rules check every message." : "Live AI is off: what you type runs through the takeover rules only."}
        </p>
        </>)}
      </div>
    </section>
  );
}
