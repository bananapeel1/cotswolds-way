"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import propertiesRaw from "@/data/properties.json";
import type { PlannedAccommodation } from "@/lib/plan-engine";

interface Property {
  id: number | string;
  slug: string;
  name: string;
  property_type: string;
  village: string;
  trail_distance_miles: number;
  price_per_night: number | null;
  rating: number | null;
  review_count: number | null;
  is_dog_friendly: boolean;
  image_url: string | null;
}

const PROPERTIES = propertiesRaw as unknown as Property[];

const TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  inn: "Inn",
  pub_inn: "Pub with rooms",
  bnb: "B&B",
  guesthouse: "Guesthouse",
  cottage: "Cottage",
  farmhouse: "Farmhouse",
  boutique: "Boutique",
};

/**
 * Per-day accommodation drawer — inline within a day card so the user can pick
 * a stay without leaving the planner. Filters by the day's end village and
 * optional dog-friendly preference, orders by closest-to-trail then rating.
 */
export default function AccommodationPicker({
  village,
  day,
  selected,
  dogFriendly,
  onSelect,
  onClear,
}: {
  village: string;
  day: number;
  selected?: PlannedAccommodation;
  dogFriendly?: boolean;
  onSelect: (day: number, accommodation: PlannedAccommodation) => void;
  onClear: (day: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    let list = PROPERTIES.filter((p) => p.village === village);
    if (dogFriendly) list = list.filter((p) => p.is_dog_friendly);
    return list
      .sort((a, b) => {
        if (a.trail_distance_miles !== b.trail_distance_miles) {
          return a.trail_distance_miles - b.trail_distance_miles;
        }
        return (b.rating ?? 0) - (a.rating ?? 0);
      })
      .slice(0, 20);
  }, [village, dogFriendly]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-5 pb-4 pl-[88px] flex-wrap">
        <Link
          href={`/property/${selected.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-forest text-white hover:bg-forest-deep transition-colors"
        >
          🛏️ {selected.name}
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone hover:text-forest px-2 py-1 rounded-full transition-colors"
        >
          Change
        </button>
        <button
          onClick={() => onClear(day)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone hover:text-terracotta px-2 py-1 rounded-full transition-colors"
        >
          Clear
        </button>
        {open && (
          <PickerList
            matches={matches}
            village={village}
            day={day}
            selectedSlug={selected.slug}
            onSelect={(p) => {
              onSelect(day, {
                slug: p.slug,
                name: p.name,
                village: p.village,
                propertyType: p.property_type,
                image: p.image_url ?? undefined,
              });
              setOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-5 pb-4 pl-[88px] flex-wrap">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-forest text-white hover:bg-forest-deep transition-colors"
      >
        🛏️ {open ? `Close` : `Find stay in ${village}`}
        {!open && matches.length > 0 && <span className="opacity-70">· {matches.length}</span>}
      </button>
      <Link
        href={`/search?village=${encodeURIComponent(village)}&day=${day}`}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-stone hover:text-forest px-2 py-1 rounded-full border border-cream-dark bg-white transition-colors"
      >
        Full search ↗
      </Link>
      {open && (
        <PickerList
          matches={matches}
          village={village}
          day={day}
          onSelect={(p) => {
            onSelect(day, {
              slug: p.slug,
              name: p.name,
              village: p.village,
              propertyType: p.property_type,
              image: p.image_url ?? undefined,
            });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PickerList({
  matches,
  village,
  selectedSlug,
  onSelect,
}: {
  matches: Property[];
  village: string;
  day: number;
  selectedSlug?: string;
  onSelect: (p: Property) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="w-full mt-2 p-4 rounded-xl bg-cream text-xs text-stone">
        No stays in {village} match your preferences. Try the full search for nearby villages.
      </div>
    );
  }
  return (
    <div className="w-full mt-2 bg-cream rounded-xl p-2 max-h-[320px] overflow-y-auto">
      <ul className="divide-y divide-cream-dark">
        {matches.map((p) => {
          const isSel = p.slug === selectedSlug;
          return (
            <li key={p.slug} className="py-2">
              <div className="flex items-start gap-3 px-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-cream-dark shrink-0">
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-stone mt-0.5 flex-wrap">
                    <span>{TYPE_LABELS[p.property_type] ?? p.property_type}</span>
                    {p.rating !== null && (
                      <span className="inline-flex items-center gap-0.5">
                        ★ <span className="tabular-nums">{p.rating.toFixed(1)}</span>
                        {p.review_count ? <span className="text-stone-light">({p.review_count})</span> : null}
                      </span>
                    )}
                    {p.is_dog_friendly && <span title="Dog friendly">🐕</span>}
                    <span className="text-stone-light">· {p.trail_distance_miles.toFixed(1)} mi from trail</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {p.price_per_night !== null && (
                    <p className="text-[13px] font-bold text-ink tabular-nums">£{p.price_per_night}</p>
                  )}
                  <button
                    onClick={() => onSelect(p)}
                    className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      isSel ? "bg-stone-light text-white cursor-default" : "bg-forest text-white hover:bg-forest-deep"
                    }`}
                    disabled={isSel}
                  >
                    {isSel ? "Selected" : "Pick"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
