"use client";

import { useMemo } from "react";
import { isOpenOn } from "@/lib/opening-hours";

interface POI {
  id: number;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number;
  tags?: Record<string, string>;
}

/**
 * Compact amenity strip for a single day: counts of pubs/food, water, toilets
 * and viewpoints inside the day's mile window, plus a warning when any nearby
 * pub is closed on the planned travel date.
 */
export default function DayAmenities({
  pois,
  travelDate,
}: {
  pois: POI[];
  travelDate?: Date | null;
}) {
  const summary = useMemo(() => {
    const food = pois.filter((p) => ["pub", "cafe", "restaurant"].includes(p.type));
    const water = pois.filter((p) => p.type === "drinking_water");
    const toilets = pois.filter((p) => p.type === "toilets");
    const views = pois.filter((p) => p.type === "viewpoint");

    let closedFood: POI[] = [];
    if (travelDate) {
      closedFood = food.filter((p) => {
        const oh = p.tags?.opening_hours;
        return oh && isOpenOn(oh, travelDate) === "closed";
      });
    }

    return { food, water, toilets, views, closedFood };
  }, [pois, travelDate]);

  const groups: { key: string; icon: string; label: string; count: number; warn?: boolean }[] = [
    { key: "food", icon: "🍺", label: "pub/food", count: summary.food.length },
    { key: "water", icon: "💧", label: "water", count: summary.water.length },
    { key: "toilets", icon: "🚻", label: "WC", count: summary.toilets.length },
    { key: "views", icon: "🔭", label: "views", count: summary.views.length },
  ];

  const hasAny = groups.some((g) => g.count > 0);
  if (!hasAny && summary.closedFood.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-5 pb-3 pl-[88px] flex-wrap text-[11px]">
      {groups
        .filter((g) => g.count > 0)
        .map((g) => (
          <span key={g.key} className="inline-flex items-center gap-1 text-stone">
            <span>{g.icon}</span>
            <span className="font-semibold tabular-nums text-ink-light">{g.count}</span>
            <span className="text-stone-light">{g.label}</span>
          </span>
        ))}
      {summary.closedFood.length > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta font-semibold"
          title={summary.closedFood.map((p) => p.name).join(", ")}
        >
          <span className="material-symbols-outlined text-xs">warning</span>
          {summary.closedFood.length} closed today
        </span>
      )}
    </div>
  );
}
