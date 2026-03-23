"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

// Elevation profile data (mile, elevation in metres)
const ELEVATION_POINTS: [number, number][] = [
  [0, 170], [2, 240], [4, 285], [6, 65], [8, 120], [10, 185],
  [12, 95], [14, 78], [16, 62], [18, 52], [20, 180], [22.8, 330],
  [24, 260], [26, 100], [27, 80], [29, 150], [31, 220], [33, 265],
  [35, 200], [37, 175], [39, 140], [40.5, 188], [42, 120], [44, 88],
  [46, 68], [48, 140], [50, 175], [52, 145], [54, 80], [56, 52],
  [58, 28], [60, 85], [62, 160], [64, 178], [66, 68], [68, 96],
  [70, 152], [72, 185], [74, 124], [76, 122], [78, 160], [80, 195],
  [82, 212], [84, 190], [86, 220], [88, 165], [90, 130], [92, 175],
  [94, 210], [96, 220], [98, 165], [100, 90], [102, 40],
];

const POPULAR_STAGES = [
  { from: "Chipping Campden", to: "Broadway", miles: 6.2, bookings: 94, difficulty: "moderate" },
  { from: "Winchcombe", to: "Cleeve Hill", miles: 5.2, bookings: 87, difficulty: "strenuous" },
  { from: "Painswick", to: "Stroud", miles: 5.4, bookings: 76, difficulty: "easy" },
  { from: "Broadway", to: "Winchcombe", miles: 11.4, bookings: 71, difficulty: "strenuous" },
  { from: "Old Sodbury", to: "Bath", miles: 25.8, bookings: 68, difficulty: "moderate" },
  { from: "Dursley", to: "Wotton-under-Edge", miles: 8.2, bookings: 62, difficulty: "moderate" },
];

const TEMPLATES = [
  {
    id: "7-day",
    name: "7-Day Classic",
    subtitle: "The definitive experience",
    days: 7,
    avgMiles: 14.6,
    colour: "bg-tertiary",
    textColour: "text-white",
    stops: [
      { day: 1, from: "Chipping Campden", to: "Winchcombe", miles: 17.6, difficulty: "strenuous" },
      { day: 2, from: "Winchcombe", to: "Birdlip", miles: 16.8, difficulty: "strenuous" },
      { day: 3, from: "Birdlip", to: "Stroud", miles: 13.8, difficulty: "moderate" },
      { day: 4, from: "Stroud", to: "Dursley", miles: 12.4, difficulty: "moderate" },
      { day: 5, from: "Dursley", to: "Hawkesbury Upton", miles: 13.4, difficulty: "moderate" },
      { day: 6, from: "Hawkesbury Upton", to: "Cold Ashton", miles: 13.0, difficulty: "easy" },
      { day: 7, from: "Cold Ashton", to: "Bath", miles: 15.0, difficulty: "moderate" },
    ],
  },
  {
    id: "10-day",
    name: "10-Day Standard",
    subtitle: "Time to enjoy the villages",
    days: 10,
    avgMiles: 10.2,
    colour: "bg-primary",
    textColour: "text-white",
    stops: [
      { day: 1, from: "Chipping Campden", to: "Broadway", miles: 6.2, difficulty: "moderate" },
      { day: 2, from: "Broadway", to: "Winchcombe", miles: 11.4, difficulty: "strenuous" },
      { day: 3, from: "Winchcombe", to: "Cheltenham", miles: 12.2, difficulty: "strenuous" },
      { day: 4, from: "Cheltenham", to: "Painswick", miles: 14.8, difficulty: "moderate" },
      { day: 5, from: "Painswick", to: "Stroud", miles: 5.4, difficulty: "easy" },
      { day: 6, from: "Stroud", to: "Dursley", miles: 12.4, difficulty: "moderate" },
      { day: 7, from: "Dursley", to: "Wotton-under-Edge", miles: 8.2, difficulty: "moderate" },
      { day: 8, from: "Wotton-under-Edge", to: "Old Sodbury", miles: 9.8, difficulty: "moderate" },
      { day: 9, from: "Old Sodbury", to: "Cold Ashton", miles: 5.2, difficulty: "easy" },
      { day: 10, from: "Cold Ashton", to: "Bath", miles: 10.8, difficulty: "moderate" },
    ],
  },
  {
    id: "14-day",
    name: "14-Day Explorer",
    subtitle: "Every pub, every view",
    days: 14,
    avgMiles: 7.3,
    colour: "bg-secondary",
    textColour: "text-white",
    stops: [
      { day: 1, from: "Chipping Campden", to: "Broadway", miles: 6.2, difficulty: "moderate" },
      { day: 2, from: "Broadway", to: "Winchcombe", miles: 11.4, difficulty: "strenuous" },
      { day: 3, from: "Winchcombe", to: "Cleeve Hill", miles: 5.2, difficulty: "strenuous" },
      { day: 4, from: "Cleeve Hill", to: "Cheltenham", miles: 7.0, difficulty: "moderate" },
      { day: 5, from: "Cheltenham", to: "Birdlip", miles: 6.2, difficulty: "moderate" },
      { day: 6, from: "Birdlip", to: "Painswick", miles: 7.2, difficulty: "moderate" },
      { day: 7, from: "Painswick", to: "Stroud", miles: 5.4, difficulty: "easy" },
      { day: 8, from: "Stroud", to: "Selsley Common", miles: 4.8, difficulty: "moderate" },
      { day: 9, from: "Selsley Common", to: "Dursley", miles: 7.6, difficulty: "moderate" },
      { day: 10, from: "Dursley", to: "Wotton-under-Edge", miles: 8.2, difficulty: "moderate" },
      { day: 11, from: "Wotton-under-Edge", to: "Hawkesbury Upton", miles: 5.2, difficulty: "easy" },
      { day: 12, from: "Hawkesbury Upton", to: "Old Sodbury", miles: 4.6, difficulty: "easy" },
      { day: 13, from: "Old Sodbury", to: "Cold Ashton", miles: 5.2, difficulty: "easy" },
      { day: 14, from: "Cold Ashton", to: "Bath", miles: 10.8, difficulty: "moderate" },
    ],
  },
];

const DIFFICULTY_COLOUR: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  moderate: "bg-amber-100 text-amber-800",
  strenuous: "bg-red-100 text-red-800",
};

interface TooltipState {
  x: number;
  y: number;
  mile: number;
  elev: number;
  visible: boolean;
}

// SVG elevation profile with hover tooltip
function ElevationProfile({ highlightDay, stops }: {
  highlightDay?: number;
  stops: { day: number; from: string; to: string; miles: number }[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, mile: 0, elev: 0, visible: false });

  const W = 800;
  const H = 140;
  const pad = { left: 8, right: 8, top: 12, bottom: 24 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxElev = 340;

  const toX = (mile: number) => pad.left + (mile / 102) * innerW;
  const toY = (elev: number) => pad.top + innerH - (elev / maxElev) * innerH;

  const fillPath =
    ELEVATION_POINTS.map(([m, e], i) =>
      `${i === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(e).toFixed(1)}`
    ).join(" ") +
    ` L${toX(102).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${toX(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  const linePath = ELEVATION_POINTS.map(([m, e], i) =>
    `${i === 0 ? "M" : "L"}${toX(m).toFixed(1)},${toY(e).toFixed(1)}`
  ).join(" ");

  // Accumulate day boundaries
  let cumMile = 0;
  const dayBoundaries: { day: number; mile: number }[] = [];
  for (const stop of stops) {
    cumMile += stop.miles;
    dayBoundaries.push({ day: stop.day, mile: Math.min(cumMile, 102) });
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const mile = Math.max(0, Math.min(102, ((svgX - pad.left) / innerW) * 102));

    // Find nearest elevation point
    let nearest = ELEVATION_POINTS[0];
    let minDist = Infinity;
    for (const pt of ELEVATION_POINTS) {
      const d = Math.abs(pt[0] - mile);
      if (d < minDist) { minDist = d; nearest = pt; }
    }

    const px = toX(nearest[0]);
    const py = toY(nearest[1]);
    setTooltip({ x: px, y: py, mile: nearest[0], elev: nearest[1], visible: true });
  }, [innerW]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  // Tooltip box position (flip if too far right)
  const tipBoxX = tooltip.x > W * 0.7 ? tooltip.x - 90 : tooltip.x + 10;
  const tipBoxY = Math.max(pad.top, tooltip.y - 36);

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        style={{ height: 140 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="elevGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#173124" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#173124" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Day boundary lines */}
        {dayBoundaries.slice(0, -1).map(({ day, mile }) => (
          <line key={day}
            x1={toX(mile)} y1={pad.top} x2={toX(mile)} y2={pad.top + innerH}
            stroke="#173124" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3,3"
          />
        ))}

        {/* Highlight band */}
        {highlightDay && (() => {
          const prev = highlightDay === 1 ? 0 : dayBoundaries[highlightDay - 2]?.mile ?? 0;
          const curr = dayBoundaries[highlightDay - 1]?.mile ?? 102;
          return (
            <rect x={toX(prev)} y={pad.top} width={toX(curr) - toX(prev)} height={innerH}
              fill="#541600" fillOpacity="0.08" rx="2" />
          );
        })()}

        {/* Fill */}
        <path d={fillPath} fill="url(#elevGrad2)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#173124" strokeWidth="2" strokeLinejoin="round" />

        {/* Highest point pin */}
        <circle cx={toX(22.8)} cy={toY(330)} r="4" fill="#541600" />
        <line x1={toX(22.8)} y1={toY(330)} x2={toX(22.8)} y2={toY(330) - 14} stroke="#541600" strokeWidth="1" />
        {/* Use foreignObject so we get proper font rendering */}

        {/* Mile axis labels — explicit font-family to avoid Newsreader rendering as icons */}
        {[0, 25, 51, 76, 102].map((m) => (
          <text key={m} x={toX(m)} y={H - 6} textAnchor="middle"
            style={{ fontSize: 10, fontFamily: "system-ui, -apple-system, sans-serif", fill: "#665d4e" }}>
            {m}mi
          </text>
        ))}

        {/* Highest point label */}
        <text x={toX(22.8)} y={toY(330) - 18} textAnchor="middle"
          style={{ fontSize: 10, fontFamily: "system-ui, -apple-system, sans-serif", fill: "#541600", fontWeight: 700 }}>
          Cleeve Hill 330m
        </text>

        {/* Hover crosshair */}
        {tooltip.visible && (
          <>
            <line x1={tooltip.x} y1={pad.top} x2={tooltip.x} y2={pad.top + innerH}
              stroke="#541600" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3,2" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#541600" stroke="white" strokeWidth="2" />

            {/* Tooltip box */}
            <rect x={tipBoxX} y={tipBoxY} width="82" height="30" rx="4"
              fill="#173124" opacity="0.92" />
            <text x={tipBoxX + 8} y={tipBoxY + 12}
              style={{ fontSize: 10, fontFamily: "system-ui, -apple-system, sans-serif", fill: "white", fontWeight: 700 }}>
              {tooltip.elev}m elevation
            </text>
            <text x={tipBoxX + 8} y={tipBoxY + 24}
              style={{ fontSize: 9, fontFamily: "system-ui, -apple-system, sans-serif", fill: "rgba(255,255,255,0.7)" }}>
              Mile {tooltip.mile.toFixed(1)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function ItineraryTemplates() {
  const [selected, setSelected] = useState(TEMPLATES[1]); // Default: 10-day
  const [direction, setDirection] = useState<"north_to_south" | "south_to_north">("north_to_south");
  const [hoveredDay, setHoveredDay] = useState<number | undefined>(undefined);

  const displayStops =
    direction === "north_to_south"
      ? selected.stops
      : [...selected.stops]
          .reverse()
          .map((s, i) => ({ ...s, day: i + 1, from: s.to, to: s.from }));

  return (
    <div className="space-y-16">
      {/* Template cards */}
      <div>
        <div className="text-center mb-10">
          <span className="text-tertiary font-bold uppercase tracking-[0.3em] text-xs mb-3 block">Itinerary Templates</span>
          <h2 className="font-headline text-4xl md:text-5xl text-primary font-bold mb-4">Choose Your Pace</h2>
          <p className="text-secondary max-w-xl mx-auto">Pre-built day-by-day plans based on thousands of walkers&apos; routes. Customise any template in the builder below.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`rounded-2xl p-8 text-left transition-all border-2 ${
                selected.id === t.id
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-outline-variant/20 hover:border-primary/40"
              } bg-white`}
            >
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${t.colour} ${t.textColour}`}>
                {t.days} Days
              </div>
              <h3 className="font-headline text-xl font-bold text-primary mb-1">{t.name}</h3>
              <p className="text-xs text-secondary mb-4">{t.subtitle}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Avg/day</span>
                <span className="font-bold text-primary">{t.avgMiles} miles</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-secondary">Total</span>
                <span className="font-bold text-primary">102 miles</span>
              </div>
              {selected.id === t.id && (
                <div className="mt-4 flex items-center gap-1 text-primary text-xs font-bold">
                  <span className="material-symbols-outlined filled text-sm">check_circle</span>
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Direction toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-surface-container-low rounded-xl p-1 inline-flex gap-1">
            <button
              onClick={() => setDirection("north_to_south")}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                direction === "north_to_south" ? "bg-white text-primary shadow-sm" : "text-secondary"
              }`}
            >
              N → S  Campden → Bath
            </button>
            <button
              onClick={() => setDirection("south_to_north")}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                direction === "south_to_north" ? "bg-white text-primary shadow-sm" : "text-secondary"
              }`}
            >
              S → N  Bath → Campden
            </button>
          </div>
        </div>
      </div>

      {/* Elevation profile + day table */}
      <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-headline text-2xl font-bold text-primary">{selected.name} — Elevation Profile</h3>
            <span className="text-xs text-secondary">Hover a day to highlight</span>
          </div>
          <p className="text-xs text-secondary mb-4">Highest point: Cleeve Hill 330m · Total ascent ~4,600m</p>
          <div className="bg-surface-container-low/50 rounded-xl p-4">
            <ElevationProfile highlightDay={hoveredDay} stops={displayStops} />
          </div>
        </div>

        {/* Day-by-day table */}
        <div className="divide-y divide-outline-variant/10">
          {displayStops.map((stop) => (
            <div
              key={stop.day}
              className={`flex items-center gap-4 px-6 py-4 transition-colors cursor-default ${
                hoveredDay === stop.day ? "bg-tertiary/5" : "hover:bg-surface-container-low/40"
              }`}
              onMouseEnter={() => setHoveredDay(stop.day)}
              onMouseLeave={() => setHoveredDay(undefined)}
            >
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0 font-bold text-sm text-primary">
                {stop.day}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-primary text-sm">{stop.from}</span>
                  <span className="material-symbols-outlined text-secondary text-sm">arrow_forward</span>
                  <span className="font-bold text-primary text-sm">{stop.to}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full hidden sm:block ${DIFFICULTY_COLOUR[stop.difficulty]}`}>
                  {stop.difficulty}
                </span>
                <span className="font-bold text-primary text-sm whitespace-nowrap">{stop.miles} mi</span>
                <Link
                  href={`/search?village=${encodeURIComponent(stop.to)}`}
                  className="text-xs text-tertiary font-bold hover:underline hidden md:block"
                >
                  Stays
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-surface-container-low/30 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/plan`}
            className="flex-1 text-center bg-tertiary text-white py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-tertiary-container transition-all"
          >
            Customise in Wizard
          </Link>
          <Link
            href="/search"
            className="flex-1 text-center border border-outline-variant/30 text-primary py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-surface-container-low transition-all"
          >
            Browse Accommodation
          </Link>
        </div>
      </div>

      {/* Popular Stages */}
      <div>
        <div className="mb-8">
          <span className="text-tertiary font-bold uppercase tracking-[0.3em] text-xs mb-3 block">Most Booked</span>
          <h2 className="font-headline text-3xl font-bold text-primary">Popular Stages</h2>
          <p className="text-secondary mt-2 text-sm">Sections where walkers most frequently stay overnight, based on bookings.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_STAGES.map((stage, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${DIFFICULTY_COLOUR[stage.difficulty]}`}>
                  {stage.difficulty}
                </span>
                <div className="flex items-center gap-1 text-xs text-secondary">
                  <span className="material-symbols-outlined text-sm text-tertiary">hotel</span>
                  <span className="font-bold text-primary">{stage.bookings}%</span>
                  <span>booked</span>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-primary text-sm">{stage.from}</span>
                  <span className="material-symbols-outlined text-secondary text-sm">arrow_forward</span>
                  <span className="font-bold text-primary text-sm">{stage.to}</span>
                </div>
                <span className="text-xs text-secondary">{stage.miles} miles</span>
              </div>
              {/* Booking bar */}
              <div className="w-full bg-surface-container-high rounded-full h-1.5">
                <div
                  className="bg-tertiary h-1.5 rounded-full"
                  style={{ width: `${stage.bookings}%` }}
                />
              </div>
              <div className="mt-4">
                <Link
                  href={`/search?village=${encodeURIComponent(stage.to)}`}
                  className="text-xs text-tertiary font-bold hover:underline"
                >
                  Find stays in {stage.to} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
