"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { aiHumanSplit, counters } from "@/lib/metrics";
import { useDesk } from "@/lib/store";
import type { Channel } from "@/lib/types";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "meta_ads", label: "Meta Ads" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "voice", label: "Voice" },
  { id: "email", label: "Email" },
];

export function TopBar() {
  const { state, dispatch } = useDesk();
  const split = aiHumanSplit(state.actions);
  const count = counters(state.leads, state.messages);
  const [liveAi, setLiveAi] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => setLiveAi(Boolean(h.liveAi)))
      .catch(() => setLiveAi(false));
  }, []);

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3">
      <h1 className="text-base font-semibold tracking-tight">Franchise sales desk</h1>

      <div className="flex flex-wrap items-center gap-4" aria-label="Agent switchboard">
        {CHANNELS.map((c) => {
          const on = !state.pausedChannels.includes(c.id);
          return (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Switch
                checked={on}
                onCheckedChange={() => dispatch({ type: "toggle_channel", channel: c.id })}
                aria-label={`${c.label} agent`}
              />
              <span className={on ? "" : "text-muted-foreground line-through"}>{c.label}</span>
            </label>
          );
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-4 font-mono text-xs">
        <span>
          {count.leads} leads · {count.messages} messages · {count.conversations} open
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span data-testid="ai-human-badge" className="rounded-md border px-2 py-1">
              AI: {split.aiPct}% | Human: {split.humanPct}%
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Counted from the action log: {split.ai} AI actions and {split.human} human actions. System events
            (alerts, held leads) count as neither.
          </TooltipContent>
        </Tooltip>
        {liveAi === false && (
          <span data-testid="live-ai-off" className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
            Live AI off
          </span>
        )}
        {liveAi && <span className="rounded-md bg-success/15 px-2 py-1 text-success">Live AI on</span>}
      </div>
    </header>
  );
}
