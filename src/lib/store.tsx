"use client";

// The one place the UI reads and writes data. Today it is in-memory and resets on refresh;
// swapping in Supabase means changing this file only (the reducer in desk.ts stays).
import { createContext, useContext, useReducer, type ReactNode } from "react";
import { deskReducer, initialState, type DeskEvent, type DeskState } from "@/lib/desk";

export type { DeskEvent, DeskState };

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
