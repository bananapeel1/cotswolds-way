"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PlanState, PlannedAccommodation } from "@/lib/plan-engine";

const STORAGE_KEY = "cotswold-plan";
const DEBOUNCE_MS = 500;

interface StoredPlan {
  version: 1;
  plan: PlanState;
  savedAt: string;
}

const DEFAULT_PLAN: PlanState = {
  direction: "north_to_south",
  days: 7,
  month: 4, // May
  dogFriendly: false,
  stops: [],
};

export function usePlanStorage() {
  const [plan, setPlan] = useState<PlanState>(DEFAULT_PLAN);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredPlan = JSON.parse(raw);
        if (stored.version === 1 && stored.plan) {
          setPlan(stored.plan);
          setLastSaved(stored.savedAt);
        }
      }
    } catch {
      // Ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    if (!hydrated) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const now = new Date().toISOString();
        const stored: StoredPlan = { version: 1, plan, savedAt: now };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        setLastSaved(now);
      } catch {
        // Ignore storage errors
      }
    }, DEBOUNCE_MS);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [plan, hydrated]);

  const updatePlan = useCallback((updates: Partial<PlanState>) => {
    setPlan(prev => ({ ...prev, ...updates }));
  }, []);

  const clearPlan = useCallback(() => {
    setPlan(DEFAULT_PLAN);
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
  }, []);

  const setAccommodation = useCallback((day: number, accommodation: PlannedAccommodation | null) => {
    setPlan(prev => ({
      ...prev,
      stops: prev.stops.map(s =>
        s.day === day ? { ...s, accommodation: accommodation ?? undefined } : s
      ),
    }));
  }, []);

  return { plan, updatePlan, clearPlan, setAccommodation, lastSaved, hydrated };
}
