"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCENARIOS } from "@/lib/data/scenarios";
import { useDesk } from "@/lib/store";

const STEP_MS = 1400;
export const SLA_DEMO_MS = 20000; // production setting would be ~15 minutes in business hours

export function ScenarioBar() {
  const { state, dispatch } = useDesk();
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const play = () => {
    clear();
    const sc = SCENARIOS.find((s) => s.id === scenarioId)!;
    dispatch({ type: "reset" });
    dispatch({ type: "select_lead", leadId: sc.leadId });
    sc.steps.forEach((step, i) => {
      timers.current.push(
        setTimeout(() => {
          const at = new Date().toISOString();
          // Pause is checked when the message would arrive, not when it was scheduled.
          const lead = stateRef.current.leads.find((l) => l.id === sc.leadId)!;
          if (step.kind === "lead") {
            if (stateRef.current.pausedChannels.includes(lead.channel)) dispatch({ type: "lead_held", leadId: lead.id, channel: lead.channel, at });
            else dispatch({ type: "lead_message", leadId: sc.leadId, body: step.body, at });
          } else {
            dispatch({ type: "ai_reply", leadId: sc.leadId, body: step.body, at, keenness: step.keenness, qualification: step.qualification, unknown: step.unknown });
          }
        }, (i + 1) * STEP_MS),
      );
    });
  };

  // Demo SLA: a chat left waiting gets one holding message and a manager alert.
  const waitingKey = state.leads.filter((l) => l.state === "waiting").map((l) => l.id).join(",");
  useEffect(() => {
    if (!waitingKey) return;
    const t = setTimeout(() => {
      waitingKey.split(",").forEach((id) => dispatch({ type: "sla_expire", leadId: id, at: new Date().toISOString() }));
    }, SLA_DEMO_MS);
    return () => clearTimeout(t);
  }, [waitingKey, dispatch]);

  useEffect(() => clear, []);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm">
      <span className="text-muted-foreground">Demo scenario:</span>
      <select
        aria-label="Demo scenario"
        className="h-8 rounded-md border bg-card px-2 text-sm"
        value={scenarioId}
        onChange={(e) => setScenarioId(e.target.value)}
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={play} data-testid="play-scenario">
        <Play className="mr-1 h-4 w-4" /> Play
      </Button>
      <Button size="sm" variant="outline" onClick={() => { clear(); dispatch({ type: "reset" }); }}>
        <RotateCcw className="mr-1 h-4 w-4" /> Reset
      </Button>
      <span className="text-xs text-muted-foreground">
        Takeovers come from the rules engine, not the script. Waiting chats get a holding message after {SLA_DEMO_MS / 1000}s (demo SLA).
        {state.heldLeads > 0 && ` ${state.heldLeads} message(s) held on paused channels.`}
      </span>
    </div>
  );
}
