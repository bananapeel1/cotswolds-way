"use client";

import { useState, useCallback, useRef } from "react";
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

/* ─── Static data ────────────────────────────────────────────────────── */

const TEMPLATE_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
];

const ALL_VILLAGES: { village: string; mile_marker: number }[] = [
  { village: "Chipping Campden", mile_marker: 0 },
  { village: "Broadway", mile_marker: 7.5 },
  { village: "Stanton", mile_marker: 10 },
  { village: "Winchcombe", mile_marker: 15.5 },
  { village: "Cleeve Hill", mile_marker: 20 },
  { village: "Cheltenham", mile_marker: 26 },
  { village: "Birdlip", mile_marker: 33 },
  { village: "Cranham", mile_marker: 36 },
  { village: "Painswick", mile_marker: 40 },
  { village: "Stroud", mile_marker: 46 },
  { village: "King's Stanley", mile_marker: 49 },
  { village: "Dursley", mile_marker: 57 },
  { village: "North Nibley", mile_marker: 60 },
  { village: "Wotton-under-Edge", mile_marker: 63 },
  { village: "Old Sodbury", mile_marker: 75 },
  { village: "Tormarton", mile_marker: 80 },
  { village: "Cold Ashton", mile_marker: 88 },
  { village: "Bath", mile_marker: 102 },
];

const ACCOMMODATION_MAP: Record<string, { name: string }[]> = {
  "Chipping Campden": [
    { name: "Holly House B&B" },
    { name: "Noel Arms" },
    { name: "Eight Bells Inn" },
  ],
  Broadway: [{ name: "The Lygon Arms" }, { name: "Broadway Hotel" }],
  Winchcombe: [{ name: "White Hart Inn" }, { name: "Wesley House" }],
  "Cleeve Hill": [
    { name: "Rising Sun Hotel" },
    { name: "Cleeve Hill Hotel" },
  ],
  Painswick: [{ name: "The Painswick" }, { name: "Falcon Inn" }],
  Stroud: [{ name: "The Star Inn" }, { name: "Bear of Rodborough" }],
  Dursley: [{ name: "Forthay B&B" }],
  "Wotton-under-Edge": [
    { name: "The Swan Hotel" },
    { name: "Carlton House" },
  ],
  "Old Sodbury": [{ name: "The Dog Inn" }],
  "Cold Ashton": [{ name: "Whittington Farm" }],
  Bath: [{ name: "YHA Bath" }],
};

/* Monthly weather data for the Cotswolds */
const WEATHER_DATA: {
  month: string;
  tempLow: number;
  tempHigh: number;
  rainfall: "dry" | "moderate" | "wet";
}[] = [
  { month: "Jan", tempLow: 1, tempHigh: 7, rainfall: "wet" },
  { month: "Feb", tempLow: 1, tempHigh: 8, rainfall: "wet" },
  { month: "Mar", tempLow: 3, tempHigh: 10, rainfall: "moderate" },
  { month: "Apr", tempLow: 4, tempHigh: 13, rainfall: "moderate" },
  { month: "May", tempLow: 7, tempHigh: 16, rainfall: "dry" },
  { month: "Jun", tempLow: 10, tempHigh: 19, rainfall: "dry" },
  { month: "Jul", tempLow: 12, tempHigh: 22, rainfall: "dry" },
  { month: "Aug", tempLow: 12, tempHigh: 21, rainfall: "dry" },
  { month: "Sep", tempLow: 9, tempHigh: 18, rainfall: "moderate" },
  { month: "Oct", tempLow: 7, tempHigh: 14, rainfall: "moderate" },
  { month: "Nov", tempLow: 3, tempHigh: 10, rainfall: "wet" },
  { month: "Dec", tempLow: 2, tempHigh: 7, rainfall: "wet" },
];

const RAINFALL_ICON: Record<string, string> = {
  dry: "wb_sunny",
  moderate: "cloud",
  wet: "rainy",
};
const RAINFALL_LABEL: Record<string, string> = {
  dry: "Dry",
  moderate: "Moderate",
  wet: "Wet",
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatDirection(dir: string) {
  if (dir === "north_to_south") return "North \u2192 South";
  if (dir === "south_to_north") return "South \u2192 North";
  if (dir === "circular") return "Circular";
  return dir;
}

function getDifficulty(
  distanceMiles: number,
  elevationFt: number
): "easy" | "moderate" | "strenuous" {
  if (distanceMiles > 16 || elevationFt > 2000) return "strenuous";
  if (distanceMiles > 10 || elevationFt > 1000) return "moderate";
  return "easy";
}

function difficultyColor(d: "easy" | "moderate" | "strenuous") {
  if (d === "easy") return "bg-green-500";
  if (d === "moderate") return "bg-amber-500";
  return "bg-red-500";
}

function difficultyTextColor(d: "easy" | "moderate" | "strenuous") {
  if (d === "easy") return "text-green-700";
  if (d === "moderate") return "text-amber-700";
  return "text-red-700";
}

function difficultyBgLight(d: "easy" | "moderate" | "strenuous") {
  if (d === "easy") return "bg-green-50";
  if (d === "moderate") return "bg-amber-50";
  return "bg-red-50";
}

function estimateWalkingTime(distanceMiles: number, elevationFt: number) {
  const baseHours = distanceMiles / 2.5;
  const elevMeters = elevationFt * 0.3048;
  const elevMinutes = elevMeters / 10;
  const totalMinutes = baseHours * 60 + elevMinutes;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function renumberStops(stops: ItineraryStop[]): ItineraryStop[] {
  return stops.map((s, i) => ({
    ...s,
    day_number: i + 1,
    label: i === 0 ? "Start" : i === stops.length - 1 ? "Finish" : `Stage ${i}`,
  }));
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function ItineraryBuilder({
  templates,
  segments,
}: {
  templates: Template[];
  segments: TrailSegment[];
}) {
  const [activeIdx, setActiveIdx] = useState(() => {
    let best = 0;
    templates.forEach((t, i) => {
      if (
        (t.itinerary_stops || []).length >
        (templates[best].itinerary_stops || []).length
      ) {
        best = i;
      }
    });
    return best;
  });

  const activeTemplate = templates[activeIdx];

  /* Mutable stops (allow editing) */
  const [customStops, setCustomStops] = useState<ItineraryStop[] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth();
  });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* Drag state */
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* Resolve stops */
  const rawStops =
    customStops ??
    [...(activeTemplate.itinerary_stops || [])].sort(
      (a, b) => a.mile_marker - b.mile_marker
    );
  const stops = rawStops;

  /* When switching templates, reset custom stops */
  const handleSelectTemplate = useCallback(
    (idx: number) => {
      setActiveIdx(idx);
      setCustomStops(null);
      setShowAddMenu(false);
    },
    []
  );

  /* Ensure we use custom stops for edits */
  const ensureCustom = useCallback((): ItineraryStop[] => {
    if (customStops) return customStops;
    const sorted = [...(activeTemplate.itinerary_stops || [])].sort(
      (a, b) => a.mile_marker - b.mile_marker
    );
    setCustomStops(sorted);
    return sorted;
  }, [customStops, activeTemplate.itinerary_stops]);

  /* ── Add stop ── */
  const addStop = useCallback(
    (village: string) => {
      const info = ALL_VILLAGES.find((v) => v.village === village);
      if (!info) return;
      const current = ensureCustom();
      if (current.some((s) => s.village === village)) return;
      const newStop: ItineraryStop = {
        day_number: 0,
        village: info.village,
        label: "",
        mile_marker: info.mile_marker,
      };
      const updated = [...current, newStop].sort(
        (a, b) => a.mile_marker - b.mile_marker
      );
      setCustomStops(renumberStops(updated));
      setShowAddMenu(false);
    },
    [ensureCustom]
  );

  /* ── Remove stop ── */
  const removeStop = useCallback(
    (idx: number) => {
      const current = ensureCustom();
      const updated = current.filter((_, i) => i !== idx);
      setCustomStops(renumberStops(updated));
    },
    [ensureCustom]
  );

  /* ── Drag handlers ── */
  const onDragStart = useCallback(
    (idx: number) => {
      ensureCustom();
      dragIdx.current = idx;
    },
    [ensureCustom]
  );

  const onDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const onDrop = useCallback(
    (idx: number) => {
      const from = dragIdx.current;
      if (from === null || from === idx) {
        dragIdx.current = null;
        setDragOverIdx(null);
        return;
      }
      const current = ensureCustom();
      const updated = [...current];
      const [moved] = updated.splice(from, 1);
      updated.splice(idx, 0, moved);
      setCustomStops(renumberStops(updated));
      dragIdx.current = null;
      setDragOverIdx(null);
    },
    [ensureCustom]
  );

  const onDragEnd = useCallback(() => {
    dragIdx.current = null;
    setDragOverIdx(null);
  }, []);

  /* ── Build connections ── */
  interface Connection {
    distance: number;
    elevation: number;
    difficulty: "easy" | "moderate" | "strenuous";
    walkTime: string;
    terrain: string;
    icon: string;
  }

  const connections: Connection[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const seg = segments.find(
      (s) =>
        s.start_village === stops[i].village &&
        s.end_village === stops[i + 1].village
    );
    const dist = seg
      ? seg.distance_miles
      : Math.abs(stops[i + 1].mile_marker - stops[i].mile_marker);
    const elev = seg ? seg.elevation_gain_ft : Math.round(dist * 80);
    const diff = seg
      ? (seg.difficulty as "easy" | "moderate" | "strenuous")
      : getDifficulty(dist, elev);
    connections.push({
      distance: Math.round(dist * 10) / 10,
      elevation: elev,
      difficulty: diff,
      walkTime: estimateWalkingTime(dist, elev),
      terrain:
        diff === "strenuous"
          ? "Steep Escarpment"
          : diff === "easy"
          ? "Gentle Walk"
          : "Moderate Ascent",
      icon:
        diff === "strenuous"
          ? "landscape"
          : diff === "easy"
          ? "park"
          : "terrain",
    });
  }

  /* ── Summary calculations ── */
  const totalMiles =
    stops.length >= 2
      ? Math.round(
          Math.abs(
            stops[stops.length - 1].mile_marker - stops[0].mile_marker
          ) * 10
        ) / 10
      : activeTemplate.total_miles || 102;

  const totalDays = stops.length;
  const lastMile = stops.length > 0 ? stops[stops.length - 1].mile_marker : 0;
  const remaining = Math.max(0, 102 - lastMile);

  const estPerNight = 140;
  const nightsNeeded = Math.max(0, stops.length - 1);
  const accCost = nightsNeeded * estPerNight;

  /* ── Share ── */
  const shareItinerary = useCallback(() => {
    const encoded = stops.map((s) => s.village).join(",");
    const url = `${window.location.origin}${window.location.pathname}?stops=${encodeURIComponent(encoded)}`;
    navigator.clipboard.writeText(url).then(() => {
      setToast("Link copied!");
      setTimeout(() => setToast(null), 2500);
    });
  }, [stops]);

  /* ── Print ── */
  const printItinerary = useCallback(() => {
    window.print();
  }, []);

  /* ── Available villages for add menu ── */
  const usedVillages = new Set(stops.map((s) => s.village));
  const availableVillages = ALL_VILLAGES.filter(
    (v) => !usedVillages.has(v.village)
  );

  /* ── Weather for selected month ── */
  const weather = WEATHER_DATA[selectedMonth];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, footer, aside, .no-print, button { display: none !important; }
          .print-friendly { break-inside: avoid; }
          .print-friendly * { color: #000 !important; background: #fff !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-primary text-on-primary px-6 py-3 rounded-xl shadow-2xl font-body font-bold text-sm flex items-center gap-2 animate-fade-in no-print">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {toast}
        </div>
      )}

      {/* Template Selection */}
      <section className="mb-20 print-friendly">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 no-print">
          {templates.map((tpl, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(idx)}
                className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col cursor-pointer text-left ${
                  isSelected ? "ring-3 ring-tertiary shadow-xl" : ""
                }`}
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    alt={tpl.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={
                      tpl.image_url ||
                      TEMPLATE_IMAGES[idx % TEMPLATE_IMAGES.length]
                    }
                  />
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-tertiary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-sm filled">
                        check
                      </span>
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
                      {tpl.total_miles} Miles &middot;{" "}
                      {formatDirection(tpl.direction)}
                    </span>
                    <span
                      className={`font-bold text-sm flex items-center gap-2 ${
                        isSelected ? "text-tertiary" : "text-secondary"
                      }`}
                    >
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start print-friendly">
        <div className="lg:col-span-8">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="font-headline text-4xl text-primary font-bold mb-2">
                {activeTemplate.name} Route
              </h2>
              <p className="text-secondary font-body">
                {stops.length > 0
                  ? `${stops.length} stops planned across ${totalDays} days`
                  : "No stops have been planned for this template yet. Select a different template above."}
              </p>
            </div>
            <div className="flex items-center gap-6 bg-surface-container-low px-6 py-4 rounded-xl">
              <div className="text-center">
                <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Distance
                </span>
                <span className="font-headline text-2xl font-bold text-tertiary">
                  {totalMiles}{" "}
                  <span className="text-sm font-normal">MI</span>
                </span>
              </div>
              <div className="h-8 w-px bg-outline-variant/30" />
              <div className="text-center">
                <span className="block font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Days
                </span>
                <span className="font-headline text-2xl font-bold text-primary">
                  {totalDays}
                </span>
              </div>
            </div>
          </div>

          {/* Weather overlay + action buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 no-print">
            {/* Month selector */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-lg">
                calendar_month
              </span>
              <div className="flex gap-1 flex-wrap">
                {WEATHER_DATA.map((w, i) => (
                  <button
                    key={w.month}
                    onClick={() => setSelectedMonth(i)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-label transition-all ${
                      i === selectedMonth
                        ? "bg-tertiary text-white shadow-md"
                        : "bg-surface-container-low text-secondary hover:bg-surface-container-highest"
                    }`}
                  >
                    {w.month}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={shareItinerary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low text-secondary hover:bg-surface-container-highest transition-colors text-xs font-bold font-label uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                Share
              </button>
              <button
                onClick={printItinerary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-low text-secondary hover:bg-surface-container-highest transition-colors text-xs font-bold font-label uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Print
              </button>
            </div>
          </div>

          {/* Weather banner */}
          <div className="bg-surface-container-low rounded-xl p-4 mb-10 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">
                {RAINFALL_ICON[weather.rainfall]}
              </span>
              <span className="font-label text-xs font-bold text-primary uppercase tracking-wider">
                {WEATHER_DATA[selectedMonth].month} Weather
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">
                thermostat
              </span>
              <span className="text-sm font-body text-secondary">
                {weather.tempLow}&deg;C &ndash; {weather.tempHigh}&deg;C
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">
                water_drop
              </span>
              <span className="text-sm font-body text-secondary">
                {RAINFALL_LABEL[weather.rainfall]} rainfall
              </span>
            </div>
          </div>

          {stops.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">
                route
              </span>
              <h3 className="font-headline text-2xl font-bold text-primary mb-2">
                No Stops Planned
              </h3>
              <p className="text-secondary max-w-md mx-auto">
                This template doesn&apos;t have stops configured yet. Select the
                &ldquo;7-Day Classic&rdquo; template above to see a full
                itinerary.
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
                const isEnd = i === stops.length - 1 && remaining <= 0;
                const markerStyle = isStart
                  ? "bg-primary"
                  : isEnd
                  ? "bg-tertiary"
                  : "bg-surface-container-highest";
                const markerIcon = isStart
                  ? "tour"
                  : isEnd
                  ? "flag"
                  : "radio_button_checked";
                const borderStyle = isStart
                  ? "border-l-4 border-primary"
                  : isEnd
                  ? "border-l-4 border-tertiary"
                  : "";

                /* Difficulty for this day segment */
                const conn = i < connections.length ? connections[i] : null;
                const dayDiff = conn?.difficulty ?? "easy";

                /* Accommodation suggestions */
                const accomm = ACCOMMODATION_MAP[stop.village] ?? [];

                const isDragOver = dragOverIdx === i;

                return (
                  <div key={`${stop.village}-${i}`}>
                    {/* Drop indicator */}
                    {isDragOver && (
                      <div className="h-1 bg-tertiary rounded-full mx-4 mb-2 transition-all" />
                    )}

                    {/* Stop card */}
                    <div
                      className="relative mb-6 print-friendly"
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDrop={() => onDrop(i)}
                      onDragEnd={onDragEnd}
                    >
                      {/* Timeline marker */}
                      <div
                        className={`absolute -left-10 top-0 w-8 h-8 rounded-full ${markerStyle} border-4 border-surface flex items-center justify-center`}
                      >
                        <span
                          className={`material-symbols-outlined text-xs filled ${
                            isStart || isEnd
                              ? "text-on-primary"
                              : "text-secondary"
                          }`}
                        >
                          {markerIcon}
                        </span>
                      </div>

                      <div
                        className={`bg-surface-container-low p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow ${borderStyle}`}
                      >
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Drag handle */}
                            <span className="material-symbols-outlined text-secondary/40 hover:text-secondary cursor-grab active:cursor-grabbing mt-1 no-print select-none">
                              drag_indicator
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-label text-xs font-bold text-tertiary uppercase tracking-widest">
                                  Day {stop.day_number} &middot; {stop.label}
                                </span>
                                {/* Difficulty badge */}
                                {conn && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${difficultyBgLight(dayDiff)} ${difficultyTextColor(dayDiff)}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${difficultyColor(dayDiff)}`}
                                    />
                                    {dayDiff}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-headline text-2xl font-bold text-primary">
                                {stop.village}
                              </h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-secondary font-label text-xs font-bold bg-surface-container-highest px-3 py-1 rounded-full">
                              MILE {stop.mile_marker.toFixed(1)}
                            </span>
                            {/* Remove button */}
                            {stops.length > 1 && (
                              <button
                                onClick={() => removeStop(i)}
                                className="w-7 h-7 rounded-full bg-surface-container-highest hover:bg-red-100 text-secondary hover:text-red-600 flex items-center justify-center transition-colors no-print"
                                title="Remove stop"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  close
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Weather row */}
                        <div className="flex items-center gap-4 mt-2 mb-3">
                          <div className="flex items-center gap-1.5 text-secondary">
                            <span className="material-symbols-outlined text-sm">
                              {RAINFALL_ICON[weather.rainfall]}
                            </span>
                            <span className="text-xs font-body">
                              {weather.tempLow}&ndash;{weather.tempHigh}&deg;C
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-secondary">
                            <span className="material-symbols-outlined text-sm">
                              water_drop
                            </span>
                            <span className="text-xs font-body">
                              {RAINFALL_LABEL[weather.rainfall]}
                            </span>
                          </div>
                        </div>

                        {/* Accommodation suggestions */}
                        {accomm.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-outline-variant/10">
                            <span className="font-label text-[10px] font-bold text-secondary uppercase tracking-widest block mb-2">
                              Suggested Stays
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {accomm.slice(0, 2).map((a) => (
                                <Link
                                  key={a.name}
                                  href={`/search?village=${encodeURIComponent(stop.village)}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-tertiary hover:text-primary transition-colors bg-surface-container-highest px-3 py-1.5 rounded-lg"
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    bed
                                  </span>
                                  {a.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Find stays link */}
                        <div className="mt-3">
                          <Link
                            href={`/search?village=${encodeURIComponent(stop.village)}`}
                            className="inline-flex items-center gap-2 text-sm font-bold text-tertiary hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">
                              search
                            </span>
                            All stays in {stop.village}
                            <span className="material-symbols-outlined text-sm">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Connection card */}
                    {i < connections.length && (
                      <div className="relative py-1 mb-6 flex items-center justify-center">
                        <div
                          className={`${difficultyBgLight(connections[i].difficulty)} px-5 py-3 rounded-xl flex flex-wrap items-center gap-x-4 gap-y-1 shadow-sm`}
                        >
                          <span className="material-symbols-outlined text-secondary text-sm">
                            {connections[i].icon}
                          </span>
                          <span className="font-label text-xs font-bold text-primary">
                            {connections[i].distance} mi
                          </span>
                          <span className="text-secondary/40">&middot;</span>
                          <span className="font-label text-xs text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">
                              altitude
                            </span>
                            {connections[i].elevation} ft
                          </span>
                          <span className="text-secondary/40">&middot;</span>
                          <span className="font-label text-xs text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">
                              schedule
                            </span>
                            {connections[i].walkTime}
                          </span>
                          <span className="text-secondary/40">&middot;</span>
                          <span
                            className={`inline-flex items-center gap-1 font-label text-xs font-bold ${difficultyTextColor(connections[i].difficulty)}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${difficultyColor(connections[i].difficulty)}`}
                            />
                            {connections[i].difficulty}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add stop button */}
              <div className="relative mb-8 no-print">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <button
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container-highest text-secondary hover:text-primary transition-all font-label text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md"
                    >
                      <span className="material-symbols-outlined text-sm">
                        add_circle
                      </span>
                      Add Stop
                    </button>

                    {/* Dropdown */}
                    {showAddMenu && availableVillages.length > 0 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto py-2">
                        {availableVillages.map((v) => (
                          <button
                            key={v.village}
                            onClick={() => addStop(v.village)}
                            className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low transition-colors flex items-center justify-between"
                          >
                            <span className="font-body text-sm text-primary">
                              {v.village}
                            </span>
                            <span className="font-label text-[10px] text-secondary">
                              Mile {v.mile_marker}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showAddMenu && availableVillages.length === 0 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl z-30 p-4 text-center">
                        <span className="text-sm text-secondary font-body">
                          All villages added
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Remaining Trail / Finish */}
              {remaining > 0 && (
                <div className="relative py-8 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-tertiary">
                      flag
                    </span>
                  </div>
                  <p className="font-headline text-xl text-secondary italic text-center">
                    {remaining.toFixed(1)} miles remaining to Bath
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
                  Total Distance
                </span>
                <span className="font-headline text-lg font-bold">
                  {totalMiles} mi
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label text-xs uppercase tracking-widest opacity-80">
                  Stops
                </span>
                <span className="font-headline text-lg font-bold">
                  {stops.length}
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
                  Estimated cost based on average nightly rate of &pound;
                  {estPerNight}. Actual prices vary by property and season.
                </p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="font-label text-xs font-bold uppercase tracking-widest">
                  Est. Total
                </span>
                <span className="font-headline text-3xl font-bold">
                  &pound;{accCost.toLocaleString()}
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
                    May&ndash;September for dry trails
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
                    ~4,600m / 15,100ft over {totalDays} days
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

      {/* Click-away handler for add menu */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowAddMenu(false)}
        />
      )}
    </>
  );
}
