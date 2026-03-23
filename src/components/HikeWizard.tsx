"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// Overnight stop villages (N→S), mile markers from Chipping Campden
const VILLAGES_NTS = [
  { name: "Chipping Campden", mile: 0 },
  { name: "Broadway", mile: 6.2 },
  { name: "Winchcombe", mile: 17.6 },
  { name: "Cleeve Hill", mile: 22.8 },
  { name: "Cheltenham", mile: 27.2 },
  { name: "Birdlip", mile: 33.4 },
  { name: "Painswick", mile: 40.6 },
  { name: "Stroud", mile: 46.0 },
  { name: "Dursley", mile: 58.4 },
  { name: "Wotton-under-Edge", mile: 66.6 },
  { name: "Hawkesbury Upton", mile: 71.8 },
  { name: "Old Sodbury", mile: 76.2 },
  { name: "Cold Ashton", mile: 81.4 },
  { name: "Bath", mile: 102.0 },
];

// Segment difficulty labels (N→S pairs)
const DIFFICULTY: Record<string, string> = {
  "Broadway": "moderate",
  "Winchcombe": "strenuous",
  "Cleeve Hill": "strenuous",
  "Cheltenham": "moderate",
  "Birdlip": "moderate",
  "Painswick": "moderate",
  "Stroud": "easy",
  "Dursley": "moderate",
  "Wotton-under-Edge": "moderate",
  "Hawkesbury Upton": "easy",
  "Old Sodbury": "moderate",
  "Cold Ashton": "easy",
  "Bath": "moderate",
  "Chipping Campden": "moderate",
};

const DIFFICULTY_COLOUR: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  moderate: "bg-amber-100 text-amber-800",
  strenuous: "bg-red-100 text-red-800",
};

type Direction = "north_to_south" | "south_to_north";
type Step = 1 | 2 | 3 | 4;

interface DayStop {
  day: number;
  village: string;
  miles: number;
  cumulative: number;
  difficulty: string;
}

function autoStops(days: number, direction: Direction): DayStop[] {
  const villages =
    direction === "north_to_south"
      ? VILLAGES_NTS
      : [...VILLAGES_NTS]
          .reverse()
          .map((v, i, arr) => ({ ...v, mile: arr[0].mile === 102 ? 102 - (VILLAGES_NTS[VILLAGES_NTS.length - 1 - i].mile) : v.mile }))
          .map((v, i) => ({ name: VILLAGES_NTS[VILLAGES_NTS.length - 1 - i].name, mile: 102 - VILLAGES_NTS[VILLAGES_NTS.length - 1 - i].mile }));

  const totalMiles = 102.0;
  const targetPerDay = totalMiles / days;
  const stops: DayStop[] = [];
  const used = new Set<string>();
  let lastMile = 0;

  const start = direction === "north_to_south" ? VILLAGES_NTS[0] : VILLAGES_NTS[VILLAGES_NTS.length - 1];
  const end = direction === "north_to_south" ? VILLAGES_NTS[VILLAGES_NTS.length - 1] : VILLAGES_NTS[0];
  used.add(start.name);

  // Build ordered list for S→N
  const orderedVillages =
    direction === "north_to_south"
      ? VILLAGES_NTS
      : [...VILLAGES_NTS].reverse();

  for (let day = 1; day < days; day++) {
    const targetMile = day * targetPerDay;
    let best = orderedVillages[1];
    let bestDist = Infinity;
    for (const v of orderedVillages) {
      if (used.has(v.name) || v.name === end.name) continue;
      // Map each village's real mile to a "progress" mile
      const progressMile =
        direction === "north_to_south"
          ? v.mile
          : 102 - v.mile;
      const dist = Math.abs(progressMile - targetMile);
      if (dist < bestDist && progressMile > lastMile && progressMile < totalMiles) {
        bestDist = dist;
        best = v;
      }
    }
    const progressMile =
      direction === "north_to_south" ? best.mile : 102 - best.mile;
    const dayMiles = Math.round((progressMile - lastMile) * 10) / 10;
    stops.push({
      day,
      village: best.name,
      miles: dayMiles,
      cumulative: Math.round(progressMile * 10) / 10,
      difficulty: DIFFICULTY[best.name] || "moderate",
    });
    used.add(best.name);
    lastMile = progressMile;
  }

  // Final day
  const finalMiles = Math.round((totalMiles - lastMile) * 10) / 10;
  stops.push({
    day: days,
    village: end.name,
    miles: finalMiles,
    cumulative: totalMiles,
    difficulty: DIFFICULTY[end.name] || "moderate",
  });

  return stops;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HikeWizard() {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<Direction>("north_to_south");
  const [days, setDays] = useState(7);
  const [month, setMonth] = useState(4); // May (0-indexed)
  const [dogFriendly, setDogFriendly] = useState(false);
  const [accessibility, setAccessibility] = useState(false);

  const stops = useMemo(() => autoStops(days, direction), [days, direction]);
  const avgMiles = (102 / days).toFixed(1);
  const startVillage = direction === "north_to_south" ? "Chipping Campden" : "Bath";
  const endVillage = direction === "north_to_south" ? "Bath" : "Chipping Campden";

  return (
    <div className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(23,49,36,0.12)] border border-outline-variant/10 overflow-hidden">
      {/* Progress bar */}
      <div className="flex border-b border-outline-variant/10">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 py-3 text-center text-[10px] font-bold uppercase tracking-widest transition-all ${
              s === step
                ? "bg-primary text-white"
                : s < step
                ? "bg-primary/10 text-primary"
                : "text-secondary"
            }`}
          >
            {s === 1 && "Direction"}
            {s === 2 && "Pace"}
            {s === 3 && "Preferences"}
            {s === 4 && "Your Route"}
          </div>
        ))}
      </div>

      <div className="p-8 sm:p-12">
        {/* Step 1 — Direction */}
        {step === 1 && (
          <div>
            <h2 className="font-headline text-3xl font-bold text-primary mb-2">Which way will you walk?</h2>
            <p className="text-secondary mb-8">Most walkers go north to south, finishing in the Roman splendour of Bath.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {(["north_to_south", "south_to_north"] as Direction[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    direction === d
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/20 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-tertiary text-2xl">
                      {d === "north_to_south" ? "south" : "north"}
                    </span>
                    <span className="font-headline text-lg font-bold text-primary">
                      {d === "north_to_south" ? "North → South" : "South → North"}
                    </span>
                    {direction === d && (
                      <span className="material-symbols-outlined filled text-primary ml-auto">check_circle</span>
                    )}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {d === "north_to_south"
                      ? "Chipping Campden → Bath. Classic direction with a dramatic finish into the city."
                      : "Bath → Chipping Campden. Quieter early miles, finishing in the honey-stone market town."}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="bg-tertiary text-white px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-tertiary-container transition-all inline-flex items-center gap-2"
              >
                Next <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Pace / Days */}
        {step === 2 && (
          <div>
            <h2 className="font-headline text-3xl font-bold text-primary mb-2">How many days do you have?</h2>
            <p className="text-secondary mb-8">102 miles total. Drag to set your pace.</p>

            <div className="bg-surface-container-low rounded-2xl p-6 mb-8">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="font-headline text-5xl font-bold text-primary">{days}</span>
                  <span className="text-secondary ml-2 font-medium">days</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-2xl text-primary">{avgMiles}</span>
                  <span className="text-secondary text-sm ml-1">miles/day avg</span>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={14}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-secondary mt-1">
                <span>5 days (fast)</span>
                <span>14 days (leisurely)</span>
              </div>
            </div>

            {/* Pace cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: "7-Day Classic", d: 7, desc: "~14.5 mi/day" },
                { label: "10-Day Standard", d: 10, desc: "~10.2 mi/day" },
                { label: "14-Day Explorer", d: 14, desc: "~7.3 mi/day" },
              ].map(({ label, d, desc }) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    days === d
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/20 hover:border-primary/30"
                  }`}
                >
                  <div className="font-bold text-primary text-sm">{label}</div>
                  <div className="text-secondary text-xs mt-1">{desc}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-secondary font-bold text-sm uppercase tracking-widest hover:text-primary transition-colors inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-tertiary text-white px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-tertiary-container transition-all inline-flex items-center gap-2"
              >
                Next <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Preferences */}
        {step === 3 && (
          <div>
            <h2 className="font-headline text-3xl font-bold text-primary mb-2">Any special requirements?</h2>
            <p className="text-secondary mb-8">We&apos;ll factor these into your route and accommodation suggestions.</p>

            <div className="space-y-4 mb-8">
              {/* Month */}
              <div className="bg-surface-container-low rounded-xl p-5">
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary mb-3">
                  When are you planning to walk?
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MONTHS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setMonth(i)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        month === i
                          ? "bg-primary text-white"
                          : "bg-white text-secondary hover:text-primary border border-outline-variant/20"
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {(month >= 11 || month <= 1) && (
                  <p className="text-amber-700 text-xs mt-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Winter walking — shorter daylight hours and some accommodation may be closed.
                  </p>
                )}
              </div>

              {/* Dog-friendly */}
              <button
                onClick={() => setDogFriendly(!dogFriendly)}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                  dogFriendly ? "border-primary bg-primary/5" : "border-outline-variant/20"
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-secondary">pets</span>
                <div className="flex-1">
                  <div className="font-bold text-primary">Travelling with a dog</div>
                  <div className="text-xs text-secondary">Show only dog-friendly accommodation</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${dogFriendly ? "bg-primary border-primary" : "border-outline-variant"}`}>
                  {dogFriendly && <span className="material-symbols-outlined text-white text-xs">check</span>}
                </div>
              </button>

              {/* Accessibility */}
              <button
                onClick={() => setAccessibility(!accessibility)}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all ${
                  accessibility ? "border-primary bg-primary/5" : "border-outline-variant/20"
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-secondary">accessible</span>
                <div className="flex-1">
                  <div className="font-bold text-primary">Accessibility needs</div>
                  <div className="text-xs text-secondary">Prefer flatter sections and accessible rooms</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${accessibility ? "bg-primary border-primary" : "border-outline-variant"}`}>
                  {accessibility && <span className="material-symbols-outlined text-white text-xs">check</span>}
                </div>
              </button>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-secondary font-bold text-sm uppercase tracking-widest hover:text-primary transition-colors inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="bg-tertiary text-white px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-tertiary-container transition-all inline-flex items-center gap-2"
              >
                Build My Route <span className="material-symbols-outlined text-base">route</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Results */}
        {step === 4 && (
          <div>
            <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
              <div>
                <h2 className="font-headline text-3xl font-bold text-primary mb-1">Your {days}-Day Route</h2>
                <p className="text-secondary">
                  {startVillage} → {endVillage} · {MONTHS[month]} · {avgMiles} miles/day avg
                  {dogFriendly && " · 🐾 Dog-friendly"}
                  {accessibility && " · ♿ Accessible"}
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">edit</span> Edit
              </button>
            </div>

            {/* Day-by-day stops */}
            <div className="space-y-2 mb-8">
              {/* Start */}
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">flag</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-primary text-sm">{startVillage}</div>
                  <div className="text-xs text-secondary">Start · Mile 0</div>
                </div>
              </div>

              {stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors">
                  <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{stop.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-primary text-sm">{stop.village}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${DIFFICULTY_COLOUR[stop.difficulty]}`}>
                        {stop.difficulty}
                      </span>
                    </div>
                    <div className="text-xs text-secondary">Day {stop.day} · {stop.miles} miles · {stop.cumulative} mi total</div>
                  </div>
                  <Link
                    href={`/search?village=${encodeURIComponent(stop.village)}${dogFriendly ? "&dog=true" : ""}`}
                    className="flex-shrink-0 text-xs font-bold text-tertiary hover:underline"
                  >
                    Find stays
                  </Link>
                </div>
              ))}
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div className="bg-surface-container-low rounded-xl p-4">
                <div className="font-bold text-2xl text-primary">{days}</div>
                <div className="text-xs text-secondary uppercase tracking-wider">Days</div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <div className="font-bold text-2xl text-primary">102</div>
                <div className="text-xs text-secondary uppercase tracking-wider">Miles</div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4">
                <div className="font-bold text-2xl text-primary">{avgMiles}</div>
                <div className="text-xs text-secondary uppercase tracking-wider">Avg/Day</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/search${dogFriendly ? "?dog=true" : ""}`}
                className="flex-1 text-center bg-tertiary text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-tertiary-container transition-all"
              >
                Find Accommodation
              </Link>
              <Link
                href="/itinerary"
                className="flex-1 text-center bg-surface-container-low text-primary py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-surface-container transition-all border border-outline-variant/20"
              >
                Customise in Builder
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
