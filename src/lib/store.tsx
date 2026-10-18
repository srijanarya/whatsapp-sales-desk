"use client";

// The one place the UI reads and writes data. Two sources, same shape:
// - DeskProvider: the public demo. In-memory, synthetic, resets on refresh.
// - LiveDeskProvider: real WhatsApp. State comes from the server's event log (polled);
//   consultant actions are POSTed and the server sends any resulting message to WhatsApp.
import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import { deskReducer, initialState, liveInitialState, type DeskEvent, type DeskState } from "@/lib/desk";

export type { DeskEvent, DeskState };

export interface LiveInfo {
  whatsapp: boolean;
  error: string | null; // last failed action or load, shown on the chat
  retryAi: (leadId: string) => void;
}

const DeskContext = createContext<{ state: DeskState; dispatch: (e: DeskEvent) => void; live?: LiveInfo } | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(deskReducer, undefined, initialState);
  return <DeskContext.Provider value={{ state, dispatch }}>{children}</DeskContext.Provider>;
}

const POLL_MS = 3000;

export function LiveDeskProvider({ children }: { children: ReactNode }) {
  const [server, setServer] = useState<DeskState>(liveInitialState);
  const [selected, setSelected] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [error, setError] = useState<string | null>(null); // last consultant action that failed
  const [loadError, setLoadError] = useState<string | null>(null); // clears on the next good poll

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setServer(data.state);
      setWhatsapp(data.whatsapp);
      setLoadError(null);
    } catch (err) {
      setLoadError(`Could not load the live desk: ${(err as Error).message}`);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const post = useCallback(async (body: object) => {
    setError(null);
    try {
      const res = await fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`);
      if (data.state) setServer(data.state);
    } catch {
      setError("Network error: the action was not saved.");
    }
  }, []);

  const dispatch = useCallback(
    (e: DeskEvent) => {
      if (e.type === "select_lead") return setSelected(e.leadId); // selection is per viewer, not shared
      const body: Record<string, unknown> = { ...e };
      delete body.at; // the server stamps its own time
      post(body);
    },
    [post],
  );

  const state = { ...server, selectedLeadId: selected || server.leads[0]?.id || "" };
  const live: LiveInfo = { whatsapp, error: error ?? loadError, retryAi: (leadId) => post({ type: "retry_ai", leadId }) };
  return <DeskContext.Provider value={{ state, dispatch, live }}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk must be used inside DeskProvider");
  return ctx;
}
