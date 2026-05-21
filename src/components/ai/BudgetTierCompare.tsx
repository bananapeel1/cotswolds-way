"use client";

import { useMemo } from "react";
import {
  estimateCosts,
  selectAccommodation,
  type DayStop,
  type PlannedAccommodation,
  type PlanState,
} from "@/lib/plan-engine";
import type { BudgetTier, TripBrief } from "@/lib/ai/schemas/trip-brief";
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/queries";
import { trackEvent } from "@/lib/track";

const properties = propertiesData as Property[];

const TIERS: { id: BudgetTier; label: string; sub: string; tagline: string }[] = [
  { id: "shoestring", label: "Shoestring", sub: "Hostels & basic B&Bs", tagline: "Bare bones, big walk." },
  { id: "comfort", label: "Comfort", sub: "Mid-range B&Bs & inns", tagline: "What most walkers pick." },
  { id: "treat-yourself", label: "Treat yourself", sub: "Boutique inns & hotels", tagline: "Make it the story." },
];

interface Variant {
  tier: BudgetTier;
  accommodationsByDay: Map<number, PlannedAccommodation | null>;
  relaxedCount: number;
  unservedCount: number;
  cost: ReturnType<typeof estimateCosts>;
  typeMix: string;
}

function defaultBriefFor(plan: PlanState): TripBrief {
  return {
    days: plan.days,
    direction: plan.direction,
    startDate: plan.startDate,
    fitness: "moderate",
    propertyVibes: [],
    diningPreference: "any",
    dogFriendly: plan.dogFriendly,
    accessible: false,
    mustVisit: [],
    avoidVillages: [],
    ambiguities: [],
  };
}

function buildVariant(plan: PlanState, tier: BudgetTier, brief: TripBrief): Variant {
  const accommodationsByDay = new Map<number, PlannedAccommodation | null>();
  let relaxedCount = 0;
  let unservedCount = 0;
  const types: Record<string, number> = {};

  const walkingNights = plan.stops.filter((s) => !s.restDay && !s.transfer).length;

  for (const stop of plan.stops) {
    if (stop.restDay || stop.transfer) {
      accommodationsByDay.set(stop.day, stop.accommodation ?? null);
      continue;
    }
    const result = selectAccommodation(stop.village, brief, tier, properties);
    if (result.property) {
      const a: PlannedAccommodation = {
        slug: result.property.slug,
        name: result.property.name,
        village: result.property.village,
        propertyType: result.property.property_type,
        image: result.property.image_url ?? undefined,
      };
      accommodationsByDay.set(stop.day, a);
      types[a.propertyType] = (types[a.propertyType] || 0) + 1;
      if (result.relaxedToTier) relaxedCount++;
    } else {
      accommodationsByDay.set(stop.day, null);
      unservedCount++;
    }
  }

  const typeMix =
    Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${n} ${t}${n > 1 ? "s" : ""}`)
      .join(" + ") || "no matches";

  return {
    tier,
    accommodationsByDay,
    relaxedCount,
    unservedCount,
    cost: estimateCosts(Math.max(0, walkingNights - 1), tier),
    typeMix,
  };
}

export default function BudgetTierCompare({
  plan,
  onApplyTier,
}: {
  plan: PlanState;
  onApplyTier: (accommodationsByDay: Map<number, PlannedAccommodation | null>, tier: BudgetTier) => void;
}) {
  const brief = useMemo(() => defaultBriefFor(plan), [plan]);
  const variants = useMemo(
    () => TIERS.map((t) => buildVariant(plan, t.id, brief)),
    [plan, brief],
  );

  return (
    <div className="bg-white rounded-[20px] p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <span className="material-symbols-outlined text-base">compare_arrows</span>
          Budget tiers
        </h3>
        <span className="text-[10px] text-stone-light uppercase tracking-wider">indicative · prices coming</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {variants.map((v) => {
          const meta = TIERS.find((t) => t.id === v.tier)!;
          return (
            <div
              key={v.tier}
              className="rounded-xl border border-cream-dark/60 hover:border-forest-light transition-colors p-3 flex flex-col"
            >
              <div className="mb-2">
                <div className="text-[13px] font-semibold text-ink">{meta.label}</div>
                <div className="text-[11px] text-stone">{meta.sub}</div>
              </div>
              <div className="my-1 flex items-baseline gap-1">
                <span className="text-[22px] font-bold text-forest-deep tabular-nums">£{v.cost.total.toLocaleString()}</span>
                <span className="text-[11px] text-stone-light">total · £{v.cost.perNight}/nt</span>
              </div>
              <div className="text-[12px] text-stone mb-2">{v.typeMix}</div>
              {(v.relaxedCount > 0 || v.unservedCount > 0) && (
                <div className="text-[11px] text-amber-warm mb-2">
                  {v.relaxedCount > 0 && `${v.relaxedCount} night${v.relaxedCount === 1 ? "" : "s"} relaxed to nearby tier`}
                  {v.relaxedCount > 0 && v.unservedCount > 0 && ", "}
                  {v.unservedCount > 0 && `${v.unservedCount} village${v.unservedCount === 1 ? "" : "s"} unserved`}
                </div>
              )}
              <div className="text-[11px] italic text-stone mb-3">&ldquo;{meta.tagline}&rdquo;</div>
              <button
                onClick={() => {
                  trackEvent("tier_applied", {
                    tier: v.tier,
                    relaxed_count: v.relaxedCount,
                    unserved_count: v.unservedCount,
                    total_cost: v.cost.total,
                  });
                  onApplyTier(v.accommodationsByDay, v.tier);
                }}
                className="mt-auto py-2 px-3 rounded-lg bg-forest text-white text-[12px] font-semibold hover:bg-forest-deep transition-colors"
              >
                Apply tier
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
