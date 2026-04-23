"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanState } from "@/lib/plan-engine";

/**
 * Client-side library of named plan snapshots. Lets a walker keep multiple
 * "what-if" itineraries (e.g. 7-day fast vs 10-day relaxed) on the same device
 * and switch between them. The active plan still lives in `cotswold-plan`
 * (managed by `usePlanStorage`); this hook manages a separate library store.
 *
 * When we add Supabase Auth in the future, the same API can swap its storage
 * backend without changing callers.
 */

const STORAGE_KEY = "cotswold-plan-library";
const VERSION = 1;

export interface PlanSnapshot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  plan: PlanState;
}

interface LibraryStore {
  version: typeof VERSION;
  snapshots: PlanSnapshot[];
}

function loadStore(): LibraryStore {
  if (typeof window === "undefined") return { version: VERSION, snapshots: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: VERSION, snapshots: [] };
    const parsed: LibraryStore = JSON.parse(raw);
    if (parsed.version !== VERSION || !Array.isArray(parsed.snapshots)) {
      return { version: VERSION, snapshots: [] };
    }
    return parsed;
  } catch {
    return { version: VERSION, snapshots: [] };
  }
}

function persistStore(store: LibraryStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private-mode errors
  }
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function usePlansLibrary() {
  const [snapshots, setSnapshots] = useState<PlanSnapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const store = loadStore();
    setSnapshots(store.snapshots);
    setHydrated(true);
  }, []);

  const save = useCallback((name: string, plan: PlanState): PlanSnapshot => {
    const now = new Date().toISOString();
    const snap: PlanSnapshot = { id: newId(), name, createdAt: now, updatedAt: now, plan };
    setSnapshots((prev) => {
      const next = [snap, ...prev];
      persistStore({ version: VERSION, snapshots: next });
      return next;
    });
    return snap;
  }, []);

  const update = useCallback((id: string, patch: Partial<Pick<PlanSnapshot, "name" | "plan">>) => {
    setSnapshots((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? { ...s, ...patch, updatedAt: new Date().toISOString() }
          : s
      );
      persistStore({ version: VERSION, snapshots: next });
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSnapshots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistStore({ version: VERSION, snapshots: next });
      return next;
    });
  }, []);

  const duplicate = useCallback((id: string, newName?: string): PlanSnapshot | null => {
    const src = snapshots.find((s) => s.id === id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy: PlanSnapshot = {
      id: newId(),
      name: newName ?? `${src.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      plan: JSON.parse(JSON.stringify(src.plan)),
    };
    setSnapshots((prev) => {
      const next = [copy, ...prev];
      persistStore({ version: VERSION, snapshots: next });
      return next;
    });
    return copy;
  }, [snapshots]);

  return { snapshots, hydrated, save, update, remove, duplicate };
}
