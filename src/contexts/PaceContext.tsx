"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ARCHETYPE_SCALAR,
  PACK_SCALAR,
  type Archetype,
  type Pack,
} from "@/lib/plan-engine";

interface PaceContextValue {
  /** Selected archetype, or null when the user hasn't calibrated yet. */
  archetype: Archetype | null;
  pack: Pack;
  /** True when the user has explicitly picked an archetype. */
  hasCalibrated: boolean;
  /** Effective time multiplier applied to Tobler-predicted hours. Defaults to
   * moderate × day when uncalibrated so the planner has sensible numbers. */
  scalar: number;
  setArchetype: (a: Archetype | null) => void;
  setPack: (p: Pack) => void;
}

const STORAGE_KEY_ARCHETYPE = "cotswold-pace-archetype";
const STORAGE_KEY_PACK = "cotswold-pace-pack";

const PaceContext = createContext<PaceContextValue | null>(null);

const ARCHETYPES = new Set<Archetype>(["gentle", "moderate", "fit", "strong"]);
const PACKS = new Set<Pack>(["day", "overnight", "full"]);

export function PaceProvider({ children }: { children: ReactNode }) {
  const [archetype, setArchetypeState] = useState<Archetype | null>(null);
  const [pack, setPackState] = useState<Pack>("day");

  // Hydrate from localStorage on mount
  useEffect(() => {
    const a = localStorage.getItem(STORAGE_KEY_ARCHETYPE);
    if (a && ARCHETYPES.has(a as Archetype)) setArchetypeState(a as Archetype);
    const p = localStorage.getItem(STORAGE_KEY_PACK);
    if (p && PACKS.has(p as Pack)) setPackState(p as Pack);
  }, []);

  const setArchetype = useCallback((a: Archetype | null) => {
    setArchetypeState(a);
    if (a) localStorage.setItem(STORAGE_KEY_ARCHETYPE, a);
    else localStorage.removeItem(STORAGE_KEY_ARCHETYPE);
  }, []);

  const setPack = useCallback((p: Pack) => {
    setPackState(p);
    localStorage.setItem(STORAGE_KEY_PACK, p);
  }, []);

  const value = useMemo<PaceContextValue>(() => {
    const effective = archetype ?? "moderate";
    return {
      archetype,
      pack,
      hasCalibrated: archetype !== null,
      scalar: ARCHETYPE_SCALAR[effective] * PACK_SCALAR[pack],
      setArchetype,
      setPack,
    };
  }, [archetype, pack, setArchetype, setPack]);

  return <PaceContext value={value}>{children}</PaceContext>;
}

export function usePace(): PaceContextValue {
  const ctx = useContext(PaceContext);
  if (!ctx) throw new Error("usePace must be used within a PaceProvider");
  return ctx;
}
