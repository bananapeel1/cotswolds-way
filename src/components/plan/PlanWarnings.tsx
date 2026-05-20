"use client";

import { useMemo, useState } from "react";
import type { DayStop } from "@/lib/plan-engine";

interface Warning {
  id: string;
  severity: "info" | "warn" | "critical";
  icon: string;
  title: string;
  detail: string;
  days: number[];
}

/**
 * Proactive validation banner that calls out shape problems most walkers don't
 * spot until they're on the trail and exhausted:
 *
 *   - Long days (≥17 mi or walkScore ≥8) — offer to split
 *   - Two consecutive hard days — offer a rest day
 *   - Strenuous first day with no acclimatisation
 *   - No accommodation booked yet on any non-final non-rest day
 *
 * Warnings are dismissable for the session (sessionStorage) so customisers
 * who deliberately want a tough day aren't nagged repeatedly.
 */
export default function PlanWarnings({
  stops,
  onHighlightDays,
}: {
  stops: DayStop[];
  onHighlightDays?: (days: number[]) => void;
}) {
  const SESSION_KEY = "cotswold-plan-warnings-dismissed";
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }

  const warnings = useMemo<Warning[]>(() => {
    const out: Warning[] = [];

    // Long single days
    stops.forEach((s, i) => {
      if (s.restDay || s.transfer) return;
      if (s.miles >= 17 || s.walkScore >= 8) {
        out.push({
          id: `long-day-${s.day}`,
          severity: s.walkScore >= 9 ? "critical" : "warn",
          icon: "warning",
          title: `Day ${s.day} is a long one`,
          detail: `${s.miles} mi · walk-score ${s.walkScore}/10. Customise to split into two days with a rest stop in between.`,
          days: [s.day],
        });
      }
    });

    // Back-to-back hard days
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1];
      const b = stops[i];
      if (a.restDay || b.restDay || a.transfer || b.transfer) continue;
      if (a.walkScore >= 7 && b.walkScore >= 7) {
        out.push({
          id: `b2b-${a.day}-${b.day}`,
          severity: "warn",
          icon: "trending_up",
          title: `Days ${a.day} and ${b.day} are both tough`,
          detail: `${a.miles}+${b.miles} mi back-to-back. Consider inserting a rest day in ${a.village} to recover.`,
          days: [a.day, b.day],
        });
      }
    }

    // Strenuous opener
    const firstWalking = stops.find((s) => !s.restDay && !s.transfer);
    if (firstWalking && firstWalking.walkScore >= 7) {
      out.push({
        id: `tough-opener`,
        severity: "info",
        title: `Day 1 is strenuous`,
        icon: "directions_walk",
        detail: `${firstWalking.miles} mi · walk-score ${firstWalking.walkScore}/10. Travel-day fatigue + a hard first day is the most common cause of trip injuries — consider a gentler start.`,
        days: [firstWalking.day],
      });
    }

    // No accommodation booked on any non-last walking day
    const nightCount = stops.filter((s) => !s.restDay).length - 1;
    const bookedCount = stops.filter((s) => s.accommodation && !s.restDay).length;
    if (nightCount > 0 && bookedCount === 0) {
      out.push({
        id: `no-accom`,
        severity: "info",
        title: `No stays booked yet`,
        icon: "bed",
        detail: `Pick accommodation for each night to lock in your route — open the picker on any day card.`,
        days: [],
      });
    }

    return out;
  }, [stops]);

  const visible = warnings.filter((w) => !dismissed.has(w.id));
  if (visible.length === 0) return null;

  const palette: Record<Warning["severity"], string> = {
    info: "bg-forest/5 border-forest/15 text-forest-deep",
    warn: "bg-amber-warm/8 border-amber-warm/25 text-brass-dark",
    critical: "bg-terracotta/8 border-terracotta/25 text-terracotta",
  };

  return (
    <div className="space-y-2">
      {visible.map((w) => (
        <div
          key={w.id}
          className={`flex items-start gap-3 p-3.5 rounded-2xl border ${palette[w.severity]}`}
          onMouseEnter={() => onHighlightDays?.(w.days)}
          onMouseLeave={() => onHighlightDays?.([])}
        >
          <span className="material-symbols-outlined text-base mt-0.5 shrink-0">{w.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{w.title}</p>
            <p className="text-xs opacity-80 mt-0.5">{w.detail}</p>
          </div>
          <button
            onClick={() => dismiss(w.id)}
            title="Dismiss for this session"
            className="text-xs opacity-50 hover:opacity-100 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
