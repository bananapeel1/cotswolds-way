"use client";

import { useState } from "react";
import Link from "next/link";

interface ItineraryStop {
  day_number: number;
  village: string;
  label: string;
  mile_marker: number;
}

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  total_days: number;
  total_miles: number;
  direction: string;
  image_url: string | null;
  itinerary_stops: ItineraryStop[];
}

interface TrailSegment {
  name: string;
  start_village: string;
  end_village: string;
  distance_miles: number;
  elevation_gain_ft: number;
  difficulty: string;
  day_number: number;
}

const TEMPLATE_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
];

function formatDirection(dir: string) {
  if (dir === "north_to_south") return "North → South";
  if (dir === "south_to_north") return "South → North";
  if (dir === "circular") return "Circular";
  return dir;
}

export default function ItineraryBuilder({
  templates,
  segments,
}: {
  templates: Template[];
  segments: TrailSegment[];
}) {
  const [activeIdx, setActiveIdx] = useState(() => {
    // Default to template with most stops
    let best = 0;
    templates.forEach((t, i) => {
      if ((t.itinerary_stops || []).length > (templates[best].itinerary_stops || []).length) {
        best = i;
      }
    });
    return best;
  });

  const activeTemplate = templates[activeIdx];
  const stops = [...(activeTemplate.itinerary_stops || [])].sort(
    (a, b) => a.mile_marker - b.mile_marker
  );

  // Build connections
  const connections: { distance: string; terrain: string; icon: string }[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const seg = segments.find(
      (s) => s.start_village === stops[i].village || s.end_village === stops[i + 1].village
    );
    if (seg) {
      connections.push({
        distance: `${seg.distance_miles} miles`,
        terrain: seg.difficulty === "strenuous" ? "Steep Escarpment" : seg.difficulty === "easy" ? "Gentle Walk" : "Moderate Ascent",
        icon: seg.difficulty === "strenuous" ? "landscape" : seg.difficulty === "easy" ? "park" : "terrain",
      });
    } else {
      const dist = (stops[i + 1].mile_marker - stops[i].mile_marker).toFixed(1);
      connections.push({ distance: `${dist} miles`, terrain: "Walking", icon: "directions_walk" });
    }
  }

  const totalMiles = activeTemplate.total_miles || 102;
  const lastMile = stops.length > 0 ? stops[stops.length - 1].mile_marker : 0;
  const remaining = (totalMiles - lastMile).toFixed(1);

  // Estimate cost (rough average)
  const estPerNight = 140;
  const nightsNeeded = activeTemplate.total_days - 1;
  const accCost = nightsNeeded * estPerNight;
  const totalEst = accCost;

  return (
    <>
      {/* Template Selection */}
      <section className="mb-20">
        <div className="mb-10">
          <span className="font-label text-tertiary text-xs font-extrabold uppercase tracking-[0.2em] mb-2 block">
            The Curated Rambler
          </span>
          <h1 className="font-headline text-5xl md:text-6xl text-primary font-bold tracking-tight leading-tight max-w-2xl">
            Choose Your <span className="italic font-normal">Pace</span>
          </h1>
          <p className="text-secondary mt-4 max-w-xl text-lg font-body">
            Select a professional template designed by regional experts, then
            customize it to fit your unique journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {templates.map((tpl, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={tpl.id}
                onClick={() => setActiveIdx(idx)}
                className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col cursor-pointer text-left ${
                  isSelected ? "ring-3 ring-tertiary shadow-xl" : ""
                }`}
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    alt={tpl.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={tpl.image_url || TEMPLATE_IMAGES[idx % TEMPLATE_IMAGES.length]}
                  />
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-tertiary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-sm filled">check</span>
                    </div>
                  )}
                </div>
                <div className="p-8 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-headline text-2xl font-bold text-primary">
                      {tpl.name}
                    </h3>
                    <span className="bg-primary-fixed text-on-primary-fixed text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                      {tpl.total_days} Days
                    </span>
                  </div>
                  <p className="text-secondary text-sm leading-relaxed mb-6">
                    {tpl.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-label text-xs font-bold text-secondary uppercase tracking-widest">
                      {tpl.total_miles} Miles · {formatDirection(tpl.direction)}
                    </span>
                    <span className={`font-bold text-sm flex items-center gap-2 ${
                      isSelected ? "text-tertiary" : "text-secondary"
                    }`}>
                      {isSelected ? "Selected" : "Select"}
                      <span className="material-symbols-outlined text-sm">
                        {isSelected ? "check_circle" : "arrow_forward"}
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Timeline Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-headline text-4xl text-primary font-bold mb-2">
                {activeTemplate.name} Route
              </h2>
              <p className="text-secondary font-body">
                {stops.length > 0
                  ? `${stops.length} stops planned across ${activeTemplate.total_days} days`
                  : "No stops have been planned for this template yet. Select a different template above."}
              </p>
            </div>
            <div className="flex items-center gap-6 bg-surface-container-low px-6 py-4 rounded-xl">
              <div className="text-center">
                <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Distance
                </span>
                <span className="font-headline text-2xl font-bold text-tertiary">
                  {activeTemplate.total_miles}{" "}
                  <span className="text-sm font-normal">MI</span>
                </span>
              </div>
              <div className="h-8 w-px bg-outline-variant/30" />
              <div className="text-center">
                <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Days
                </span>
                <span className="font-headline text-2xl font-bold text-primary">
                  {activeTemplate.total_days}
                </span>
              </div>
            </div>
          </div>

          {stops.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">route</span>
              <h3 className="font-headline text-2xl font-bold text-primary mb-2">No Stops Planned</h3>
              <p className="text-secondary max-w-md mx-auto">
                This template doesn&apos;t have stops configured yet. Select the &ldquo;7-Day Classic&rdquo; template above to see a full itinerary.
              </p>
            </div>
          ) : (
            <div className="relative pl-12">
              {/* Vertical line */}
              <div
                className="absolute left-4 top-0 bottom-0 w-[2px]"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, #541600 15%, #541600 85%, transparent)",
                }}
              />

              {stops.map((stop, i) => {
                const isStart = i === 0;
                const isEnd = i === stops.length - 1 && Number(remaining) <= 0;
                const markerStyle = isStart ? "bg-primary" : isEnd ? "bg-tertiary" : "bg-surface-container-highest";
                const markerIcon = isStart ? "tour" : isEnd ? "flag" : "radio_button_checked";
                const borderStyle = isStart ? "border-l-4 border-primary" : isEnd ? "border-l-4 border-tertiary" : "";

                return (
                  <div key={`${stop.village}-${stop.mile_marker}`}>
                    {/* Stop */}
                    <div className="relative mb-12">
                      <div
                        className={`absolute -left-10 top-0 w-8 h-8 rounded-full ${markerStyle} border-4 border-surface flex items-center justify-center`}
                      >
                        <span
                          className={`material-symbols-outlined text-xs filled ${isStart || isEnd ? "text-on-primary" : "text-secondary"}`}
                        >
                          {markerIcon}
                        </span>
                      </div>
                      <div
                        className={`bg-surface-container-low p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow ${borderStyle}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-label text-xs font-bold text-tertiary uppercase tracking-widest block mb-1">
                              Day {stop.day_number} · {stop.label}
                            </span>
                            <h4 className="font-headline text-2xl font-bold text-primary">
                              {stop.village}
                            </h4>
                          </div>
                          <span className="text-secondary font-label text-xs font-bold bg-surface-container-highest px-3 py-1 rounded-full">
                            MILE {stop.mile_marker.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-4">
                          <Link
                            href={`/search?village=${encodeURIComponent(stop.village)}`}
                            className="inline-flex items-center gap-2 text-sm font-bold text-tertiary hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">bed</span>
                            Find stays in {stop.village}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Connection */}
                    {i < connections.length && (
                      <div className="relative py-2 mb-8 flex items-center justify-center">
                        <div className="bg-surface-container-highest px-4 py-2 rounded-full flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary text-sm">
                            {connections[i].icon}
                          </span>
                          <span className="font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                            {connections[i].distance} · {connections[i].terrain}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Remaining Trail / Finish */}
              {Number(remaining) > 0 && (
                <div className="relative py-8 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-tertiary">flag</span>
                  </div>
                  <p className="font-headline text-xl text-secondary italic text-center">
                    {remaining} miles remaining to Bath
                  </p>
                  <p className="text-sm text-secondary/70 mt-1">
                    The trail ends at Bath Abbey
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 sticky top-24">
          <div className="bg-primary p-8 rounded-2xl text-on-primary shadow-xl">
            <h3 className="font-headline text-2xl font-bold mb-6">
              Trek Summary
            </h3>
            <div className="space-y-5 mb-8">
              <div className="flex justify-between items-center">
                <span className="font-label text-xs uppercase tracking-widest opacity-80">
                  Template
                </span>
                <span className="font-headline text-lg font-bold">
                  {activeTemplate.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label text-xs uppercase tracking-widest opacity-80">
                  Est. Accommodation
                </span>
                <span className="font-headline text-lg font-bold">
                  &pound;{accCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label text-xs uppercase tracking-widest opacity-80">
                  Nights Required
                </span>
                <span className="font-headline text-lg font-bold">
                  {nightsNeeded}
                </span>
              </div>
              <div className="pt-5 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary-fixed">
                    directions_walk
                  </span>
                  <div>
                    <span className="block font-bold text-sm">
                      Avg. Per Night
                    </span>
                    <span className="text-[10px] opacity-70">
                      Based on &pound;{estPerNight}/night average
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 p-6 rounded-xl mb-8">
              <div className="flex items-start gap-4 mb-4">
                <span className="material-symbols-outlined text-tertiary-fixed text-sm">
                  info
                </span>
                <p className="text-xs opacity-70 leading-relaxed">
                  Estimated cost based on average nightly rate of &pound;{estPerNight}. Actual prices vary by property and season.
                </p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="font-label text-xs font-bold uppercase tracking-widest">
                  Est. Total
                </span>
                <span className="font-headline text-3xl font-bold">
                  &pound;{totalEst.toLocaleString()}
                </span>
              </div>
            </div>
            <Link
              href="/search"
              className="block w-full bg-tertiary text-white py-4 rounded-xl font-bold uppercase tracking-[0.15em] text-sm hover:bg-tertiary-container transition-all active:scale-95 shadow-lg text-center"
            >
              Browse Accommodations
            </Link>
            <p className="text-center text-[10px] opacity-50 uppercase tracking-widest mt-4">
              or save itinerary for later
            </p>
          </div>

          {/* Trail Intelligence */}
          <div className="mt-8 bg-surface-container-low p-6 rounded-2xl">
            <h4 className="font-headline text-lg font-bold text-primary mb-4">
              Trail Intelligence
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">
                    cloud
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-primary">
                    Best Season
                  </span>
                  <span className="text-[10px] text-secondary">
                    May–September for dry trails
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">
                    altitude
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-primary">
                    Total Ascent
                  </span>
                  <span className="text-[10px] text-secondary">
                    ~4,600m / 15,100ft over {activeTemplate.total_days} days
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">
                    gpp_maybe
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-primary">
                    Trail Status
                  </span>
                  <span className="text-[10px] text-secondary">
                    No active diversions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
