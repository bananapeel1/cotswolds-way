"use client";

import { useCallback, useMemo, useState } from "react";
import {
  insertStopAtVillage,
  insertRestDay,
  removeStopWithWarning,
  type PlanState,
} from "@/lib/plan-engine";
import type { ReplanMutation } from "@/lib/ai/schemas/trip-brief";
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/queries";
import { trackEvent } from "@/lib/track";

const properties = propertiesData as Property[];

interface PendingMutation {
  mutation: ReplanMutation;
  summary: string;
}

export default function ReplanChatPanel({
  plan,
  onUpdatePlan,
}: {
  plan: PlanState;
  onUpdatePlan: (next: Partial<PlanState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingMutation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  const lockedDays = useMemo(
    () => plan.stops.filter((s) => s.accommodation).map((s) => s.day),
    [plan.stops],
  );

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setLastApplied(null);
    setPending(null);
    try {
      const res = await fetch("/api/ai/replan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planState: plan, message: text, lockedDays }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `replan failed: ${res.status}`);
      }
      const data = await res.json();
      setPending({ mutation: data.mutation, summary: data.summary });
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, [input, loading, plan, lockedDays]);

  const applyMutation = useCallback(() => {
    if (!pending) return;
    const m = pending.mutation;
    trackEvent("plan_modified", { kind: "replan", mutation: m.type });
    try {
      switch (m.type) {
        case "shorten-day": {
          const next = insertStopAtVillage(plan.stops, m.newOvernight, plan.direction);
          onUpdatePlan({ stops: next, days: next.length });
          setLastApplied(`Inserted ${m.newOvernight} as a new overnight.`);
          break;
        }
        case "lengthen-day": {
          const idx = plan.stops.findIndex(
            (s) => s.village.toLowerCase() === m.removeOvernight.toLowerCase(),
          );
          if (idx < 0) {
            setError(`${m.removeOvernight} isn't currently in the plan.`);
            return;
          }
          if (lockedDays.includes(plan.stops[idx].day)) {
            setError(`${m.removeOvernight} is locked (has a stay). Remove the stay first.`);
            return;
          }
          const result = removeStopWithWarning(plan.stops, idx, plan.direction);
          onUpdatePlan({ stops: result.stops, days: result.stops.length });
          setLastApplied(
            `Removed ${m.removeOvernight}` +
              (result.warning ? ` — note: day ${result.warning.day} is now ${result.warning.miles}mi, walkScore ${result.warning.walkScore}.` : "."),
          );
          break;
        }
        case "insert-rest-day": {
          const idx = plan.stops.findIndex(
            (s) => s.village.toLowerCase() === m.village.toLowerCase(),
          );
          if (idx < 0) {
            setError(`${m.village} isn't currently in the plan.`);
            return;
          }
          const next = insertRestDay(plan.stops, idx);
          onUpdatePlan({ stops: next, days: next.length });
          setLastApplied(`Added a rest day after ${m.village}.`);
          break;
        }
        case "swap-accommodation": {
          const property = properties.find((p) => p.slug === m.newPropertySlug);
          if (!property) {
            setError(`Property ${m.newPropertySlug} no longer exists.`);
            return;
          }
          const nextStops = plan.stops.map((s) =>
            s.day === m.day
              ? {
                  ...s,
                  accommodation: {
                    slug: property.slug,
                    name: property.name,
                    village: property.village,
                    propertyType: property.property_type,
                    image: property.image_url ?? undefined,
                  },
                }
              : s,
          );
          onUpdatePlan({ stops: nextStops });
          setLastApplied(`Swapped day ${m.day} stay to ${property.name}.`);
          break;
        }
        case "change-start-date": {
          const month = new Date(m.startDate).getUTCMonth();
          onUpdatePlan({ startDate: m.startDate, month });
          setLastApplied(`Start date set to ${m.startDate}.`);
          break;
        }
        case "change-direction": {
          const flipped: PlanState["direction"] =
            plan.direction === "north_to_south" ? "south_to_north" : "north_to_south";
          onUpdatePlan({ direction: flipped });
          setLastApplied(`Flipped direction to ${flipped}. Re-run autoStops to rebuild the day sequence.`);
          break;
        }
        case "clarify":
        case "decline":
          // No-op; these are surfaced visually, not applied.
          break;
      }
      setPending(null);
      setInput("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [pending, plan, lockedDays, onUpdatePlan]);

  const discard = useCallback(() => {
    setPending(null);
    setLastApplied(null);
    setError(null);
  }, []);

  return (
    <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(30,63,43,0.06)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-[18px] text-sm font-semibold text-ink hover:bg-cream transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-tertiary">auto_awesome</span>
          Ask the planner to adjust
        </span>
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-stone transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-5 space-y-3 animate-slide-up-fade">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="e.g. shorten day 3, add a rest day after Painswick…"
              className="flex-1 rounded-xl border border-cream-dark/70 bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-stone-light focus:outline-none focus:border-forest-light"
            />
            <button
              onClick={submit}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-forest text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-forest-deep transition-colors"
            >
              {loading ? "…" : "Ask"}
            </button>
          </div>

          {lockedDays.length > 0 && (
            <div className="text-[11px] text-stone-light">
              Locked days (have a stay): {lockedDays.join(", ")}. Remove the stay to change one.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-terracotta/30 bg-terracotta/5 text-terracotta px-3 py-2 text-[12px]">
              {error}
            </div>
          )}

          {lastApplied && (
            <div className="rounded-lg border border-forest-light/30 bg-forest-light/5 text-forest-deep px-3 py-2 text-[12px]">
              ✓ {lastApplied}
            </div>
          )}

          {pending && <MutationCard pending={pending} onApply={applyMutation} onDiscard={discard} />}
        </div>
      )}
    </div>
  );
}

function MutationCard({
  pending,
  onApply,
  onDiscard,
}: {
  pending: PendingMutation;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const isInformational = pending.mutation.type === "clarify" || pending.mutation.type === "decline";

  return (
    <div className="rounded-xl border border-tertiary/25 bg-tertiary/4 p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-tertiary mb-1">
        {isInformational ? (pending.mutation.type === "clarify" ? "Need more info" : "Can't do that") : "Proposed change"}
      </div>
      <div className="text-[13px] text-ink mb-3">{pending.summary}</div>
      {!isInformational && (
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="px-3.5 py-1.5 rounded-lg bg-forest text-white text-[12px] font-semibold hover:bg-forest-deep transition-colors"
          >
            Apply
          </button>
          <button
            onClick={onDiscard}
            className="px-3.5 py-1.5 rounded-lg border border-cream-dark text-stone text-[12px] font-semibold hover:bg-cream transition-colors"
          >
            Discard
          </button>
        </div>
      )}
      {isInformational && (
        <button
          onClick={onDiscard}
          className="px-3.5 py-1.5 rounded-lg border border-cream-dark text-stone text-[12px] font-semibold hover:bg-cream transition-colors"
        >
          Got it
        </button>
      )}
    </div>
  );
}
