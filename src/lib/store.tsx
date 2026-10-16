"use client";

// The one place the UI reads and writes data. Today it is in-memory and resets on refresh;
// swapping in Supabase means changing this file only.
import { createContext, useContext, useReducer, type ReactNode } from "react";
import { SEED_ACTIONS, SEED_LEADS, SEED_MESSAGES } from "@/lib/data/seed";
import type { Action, Channel, Lead, Message } from "@/lib/types";

export interface DeskState {
  leads: Lead[];
  messages: Message[];
  actions: Action[];
  selectedLeadId: string;
  pausedChannels: Channel[];
}

export type DeskEvent =
  | { type: "select_lead"; leadId: string }
  | { type: "toggle_channel"; channel: Channel }
  | { type: "reset" };

export const initialState = (): DeskState => ({
  leads: SEED_LEADS,
  messages: SEED_MESSAGES,
  actions: SEED_ACTIONS,
  selectedLeadId: SEED_LEADS[0].id,
  pausedChannels: [],
});

export function deskReducer(state: DeskState, event: DeskEvent): DeskState {
  switch (event.type) {
    case "select_lead":
      return { ...state, selectedLeadId: event.leadId };
    case "toggle_channel": {
      const paused = state.pausedChannels.includes(event.channel);
      return {
        ...state,
        pausedChannels: paused
          ? state.pausedChannels.filter((c) => c !== event.channel)
          : [...state.pausedChannels, event.channel],
      };
    }
    case "reset":
      return initialState();
  }
}

const DeskContext = createContext<{ state: DeskState; dispatch: (e: DeskEvent) => void } | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(deskReducer, undefined, initialState);
  return <DeskContext.Provider value={{ state, dispatch }}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("useDesk must be used inside DeskProvider");
  return ctx;
}
