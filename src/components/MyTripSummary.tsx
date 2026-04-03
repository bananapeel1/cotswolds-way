"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { usePlanStorage } from "@/hooks/usePlanStorage";
import {
  computeConnections, getStartVillage, getDayMileRange,
  approximateMileFromLat, WEATHER_DATA, RAINFALL_ICON,
  encodePlanToURL,
} from "@/lib/plan-engine";
import { useUnits } from "@/contexts/UnitContext";

interface POI {
  id: number; type: string; name: string;
  latitude: number; longitude: number;
  distanceFromTrail: number; tags: Record<string, string>;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DIFFICULTY_COLOUR: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  moderate: "bg-amber-100 text-amber-800",
  strenuous: "bg-red-100 text-red-800",
};
const POI_ICONS: Record<string, string> = {
  pub: "sports_bar", cafe: "coffee", restaurant: "restaurant",
  water: "water_drop", toilets: "wc", bus_stop: "directions_bus",
  train: "train", shop: "shopping_bag", viewpoint: "visibility",
};

export default function MyTripSummary() {
  const { plan, hydrated } = usePlanStorage();
  const [pois, setPois] = useState<POI[]>([]);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    fetch("/api/pois")
      .then(r => r.json())
      .then(data => { if (data.pois) setPois(data.pois); })
      .catch(() => {});
  }, []);

  const stops = plan.stops;
  const connections = useMemo(() => stops.length > 0 ? computeConnections(stops, plan.direction) : [], [stops, plan.direction]);
  const weather = WEATHER_DATA[plan.month];
  const totalNights = stops.filter(s => !s.restDay).length - 1;
  const bookedNights = stops.filter(s => s.accommodation && !s.restDay).length;

  const { formatDistance, formatElevation, formatTempRange, trailTotal, trailTotalShort } = useUnits();

  if (!hydrated) return null;

  if (stops.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-secondary/20 mb-4 block">hiking</span>
        <h1 className="font-headline text-2xl font-bold text-primary mb-3">No trip planned yet</h1>
        <p className="text-sm text-secondary mb-6">Create your Cotswold Way walking plan to see your complete trip summary here.</p>
        <Link href="/plan" className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
          <span className="material-symbols-outlined text-base">arrow_forward</span>
          Plan My Walk
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 print:max-w-none print:px-4 print:py-2">
      {/* Trip header */}
      <div className="mb-8 print:mb-4 bg-topo">
        <h1 className="text-3xl font-medium text-primary mb-2 print:text-2xl italic" style={{ fontFamily: "var(--font-serif)" }}>My Cotswold Way</h1>
        <p className="text-sm text-secondary mb-4">
          {plan.days} days · {trailTotal} · {MONTHS[plan.month]} · {formatTempRange(weather.tempLow, weather.tempHigh)}
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { value: plan.days, label: "Days", icon: "calendar_today" },
            { value: trailTotalShort, label: "Total", icon: "straighten" },
            { value: `${bookedNights}/${totalNights}`, label: "Nights booked", icon: "bed" },
            { value: formatTempRange(weather.tempLow, weather.tempHigh), label: MONTHS[plan.month].slice(0, 3), icon: RAINFALL_ICON[weather.rainfall] },
          ].map((stat, i) => (
            <div key={i} className="bg-white shadow-card rounded-2xl p-4 text-center print:bg-gray-50 print:border print:border-gray-200">
              <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-2 print:hidden">
                <span className="material-symbols-outlined text-sm text-accent">{stat.icon}</span>
              </div>
              <p className="text-lg font-bold text-primary">{stat.value}</p>
              <p className="text-[10px] text-secondary">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={() => {
            const url = new URL(window.location.origin + "/my-trip");
            const params = encodePlanToURL(plan);
            params.forEach((v, k) => url.searchParams.set(k, v));
            navigator.clipboard.writeText(url.toString());
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
          }}
            className="px-4 py-2 rounded-xl font-bold text-sm text-secondary border border-outline-variant/15 hover:border-primary/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-base">{shareToast ? "check" : "share"}</span>
            {shareToast ? "Copied!" : "Share trip"}
          </button>
          <button onClick={() => window.print()}
            className="px-4 py-2 rounded-xl font-bold text-sm text-secondary border border-outline-variant/15 hover:border-primary/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-base">print</span>
            Print
          </button>
          <Link href="/plan"
            className="px-4 py-2 rounded-xl font-bold text-sm text-primary border border-primary/20 hover:bg-primary/5 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-base">edit</span>
            Edit plan
          </Link>
        </div>
      </div>

      {/* Day cards */}
      <div className="space-y-4">
        {stops.map((stop, i) => {
          const from = getStartVillage(stops, i, plan.direction);
          const conn = connections[i];
          const [startMile, endMile] = getDayMileRange(stops, i, plan.direction);

          // Find top lunch pub for this day
          const dayFoodPois = pois
            .filter(p => ["pub", "cafe", "restaurant"].includes(p.type) && p.distanceFromTrail <= 500)
            .filter(p => {
              const mile = approximateMileFromLat(p.latitude);
              return mile >= startMile && mile <= endMile;
            })
            .sort((a, b) => a.distanceFromTrail - b.distanceFromTrail);
          const topLunch = dayFoodPois[0] || null;

          return (
            <div key={stop.day} className="bg-white rounded-2xl border border-outline-variant/5 shadow-card card-hover-lift p-5 print:border-gray-200 print:shadow-none print:break-inside-avoid">
              {/* Day header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl btn-primary-gradient text-white font-bold text-sm shrink-0 shadow-ambient">
                  {stop.day}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-headline font-bold text-primary text-base">{from} → {stop.village}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-secondary">{formatDistance(stop.miles)}</span>
                    {conn && (
                      <>
                        <span className="text-secondary/30">·</span>
                        <span className="text-[11px] text-secondary">{formatElevation(conn.elevationGain)} ↑</span>
                        <span className="text-secondary/30">·</span>
                        <span className="text-[11px] text-secondary">{conn.walkTime}</span>
                      </>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${DIFFICULTY_COLOUR[stop.difficulty]}`}>
                      {stop.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content grid */}
              <div className="space-y-2.5">
                {/* Accommodation */}
                {stop.accommodation ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                    {stop.accommodation.image && (
                      <img src={stop.accommodation.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 print:hidden" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bed</span>
                        <span className="text-[9px] font-bold text-primary uppercase">Stay</span>
                      </div>
                      <p className="text-sm font-bold text-primary truncate">{stop.accommodation.name}</p>
                      <p className="text-[10px] text-secondary capitalize">{stop.accommodation.propertyType} · {stop.accommodation.village}</p>
                    </div>
                  </div>
                ) : i < stops.length - 1 && !stop.restDay ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-outline-variant/30 print:hidden">
                    <span className="material-symbols-outlined text-base text-secondary">bed</span>
                    <span className="text-xs text-secondary">Accommodation not yet booked</span>
                    <Link href={`/search?village=${encodeURIComponent(stop.village)}&day=${stop.day}`}
                      className="text-xs font-bold text-primary ml-auto">Find stay</Link>
                  </div>
                ) : null}

                {/* Lunch suggestion */}
                {topLunch && (
                  <div className="flex items-center gap-2 text-[11px] text-secondary">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {POI_ICONS[topLunch.type] || "restaurant"}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-secondary">Lunch</span>
                    <span className="text-primary font-medium">{topLunch.name}</span>
                    <span className="text-[9px]">{topLunch.distanceFromTrail}m off trail</span>
                  </div>
                )}

                {/* Saved POIs */}
                {stop.savedPois && stop.savedPois.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-secondary uppercase">Saved stops</p>
                    {stop.savedPois.map(poi => (
                      <div key={poi.id} className="flex items-center gap-2 text-[11px]">
                        <span className="material-symbols-outlined text-xs text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {POI_ICONS[poi.type] || "location_on"}
                        </span>
                        <span className="text-primary">{poi.name}</span>
                        <span className="text-[9px] text-secondary capitalize">{poi.type.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Terrain + notes */}
                {conn && (
                  <div className="flex items-center gap-2 text-[10px] text-secondary">
                    <span className="material-symbols-outlined text-xs">terrain</span>
                    {conn.terrain}
                  </div>
                )}
                {stop.note && (
                  <div className="flex items-center gap-2 text-[10px] text-secondary italic">
                    <span className="material-symbols-outlined text-xs">note</span>
                    {stop.note}
                  </div>
                )}

                {/* Cumulative progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-outline-variant/15 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/30 rounded-full" style={{ width: `${(stop.cumulative / 102) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-secondary font-bold">{formatDistance(stop.cumulative)} / {trailTotalShort}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-secondary print:mt-4">
        <p>Generated by <Link href="/" className="font-bold text-primary hover:underline print:no-underline">The Cotswold Way</Link></p>
      </div>
    </main>
  );
}
