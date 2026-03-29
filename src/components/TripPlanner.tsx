"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePlanStorage } from "@/hooks/usePlanStorage";
import {
  autoStops, computeConnections, getStartVillage, getDayMileRange,
  approximateMileFromLat, WEATHER_DATA, RAINFALL_ICON, TEMPLATES,
  type DayStop, type PlanState,
} from "@/lib/plan-engine";
import ElevationProfile from "@/components/plan/ElevationProfile";
import WalkScoreGauge from "@/components/plan/WalkScoreGauge";
import PubLunchCard from "@/components/plan/PubLunchCard";
import CostEstimator from "@/components/plan/CostEstimator";
import WhatIfComparison from "@/components/plan/WhatIfComparison";
import GPXExportButton from "@/components/plan/GPXExportButton";
import PrintableDayCards from "@/components/plan/PrintableDayCards";

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

export default function TripPlanner() {
  const { plan, updatePlan, lastSaved, hydrated } = usePlanStorage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pois, setPois] = useState<POI[]>([]);
  const [highlightDay, setHighlightDay] = useState<number | undefined>();

  // Fetch POIs for pub lunch planner
  useEffect(() => {
    fetch("/api/pois")
      .then(r => r.json())
      .then(data => { if (data.pois) setPois(data.pois); })
      .catch(() => {});
  }, []);

  // If plan has stops from localStorage, go to step 2
  useEffect(() => {
    if (hydrated && plan.stops.length > 0) setStep(2);
  }, [hydrated, plan.stops.length]);

  const stops = plan.stops;
  const connections = useMemo(() => stops.length > 0 ? computeConnections(stops, plan.direction) : [], [stops, plan.direction]);
  const weather = WEATHER_DATA[plan.month];

  const buildRoute = useCallback(() => {
    const newStops = autoStops(plan.days, plan.direction);
    updatePlan({ stops: newStops });
    setStep(2);
  }, [plan.days, plan.direction, updatePlan]);

  const handleSelectDays = useCallback((days: number) => {
    const newStops = autoStops(days, plan.direction);
    updatePlan({ days, stops: newStops });
  }, [plan.direction, updatePlan]);

  // Relative time for "last saved"
  const savedLabel = useMemo(() => {
    if (!lastSaved) return null;
    const diff = Date.now() - new Date(lastSaved).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }, [lastSaved]);

  if (!hydrated) return null;

  return (
    <div className="no-print">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        {[
          { n: 1, label: "Setup" },
          { n: 2, label: "Your Route" },
          { n: 3, label: "Customise" },
        ].map(({ n, label }) => (
          <button key={n} onClick={() => (n <= step || stops.length > 0) ? setStep(n as 1 | 2 | 3) : undefined}
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${
              step === n ? "text-primary" : n < step ? "text-secondary hover:text-primary" : "text-secondary/40"
            }`}>
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              step === n ? "bg-primary text-white" : n < step ? "bg-primary/10 text-primary" : "bg-surface-container-high text-secondary/40"
            }`}>{n}</span>
            {label}
          </button>
        ))}
        {savedLabel && (
          <span className="ml-auto text-[10px] text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">cloud_done</span>
            Saved {savedLabel}
          </span>
        )}
      </div>

      {/* Step 1 — Quick Setup */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Direction */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3">Which direction?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "north_to_south" as const, label: "North → South", desc: "Chipping Campden to Bath", icon: "south" },
                { value: "south_to_north" as const, label: "South → North", desc: "Bath to Chipping Campden", icon: "north" },
              ].map(opt => (
                <button key={opt.value} onClick={() => updatePlan({ direction: opt.value })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    plan.direction === opt.value ? "border-primary bg-primary/5" : "border-outline-variant/20 hover:border-primary/30"
                  }`}>
                  <span className="material-symbols-outlined text-2xl text-primary mb-2">{opt.icon}</span>
                  <p className="font-bold text-primary text-sm">{opt.label}</p>
                  <p className="text-xs text-secondary mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3">How many days?</h3>
            <div className="flex items-center gap-3 mb-3">
              {[7, 10, 14].map(d => (
                <button key={d} onClick={() => updatePlan({ days: d })}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    plan.days === d ? "bg-primary text-white" : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                  }`}>
                  {d} days
                </button>
              ))}
            </div>
            <input type="range" min={5} max={14} value={plan.days}
              onChange={e => updatePlan({ days: parseInt(e.target.value) })}
              className="w-full accent-primary" />
            <p className="text-xs text-secondary mt-1">
              {Math.round(102 / plan.days * 10) / 10} miles per day average
            </p>
          </div>

          {/* Month */}
          <div>
            <h3 className="text-sm font-bold text-primary mb-3">When are you walking?</h3>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m, i) => (
                <button key={m} onClick={() => updatePlan({ month: i })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    plan.month === i ? "bg-primary text-white" : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"
                  }`}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            {plan.month >= 10 || plan.month === 0 && (
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                Winter walking — shorter days, wet trails. Carry a torch and waterproofs.
              </p>
            )}
          </div>

          {/* Dog friendly */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={plan.dogFriendly} onChange={e => updatePlan({ dogFriendly: e.target.checked })}
              className="w-5 h-5 accent-primary" />
            <div>
              <p className="text-sm font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">pets</span> Dog-friendly stays only
              </p>
              <p className="text-xs text-secondary">Filter for accommodations that welcome dogs</p>
            </div>
          </label>

          {/* Build route button */}
          <button onClick={buildRoute}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:bg-primary-container transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">route</span>
            Build My Route
          </button>

          {/* Template shortcuts */}
          <div>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Or start from a template</p>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { updatePlan({ days: t.days }); buildRoute(); }}
                  className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:border-primary/30 text-left transition-all">
                  <p className="text-sm font-bold text-primary">{t.name}</p>
                  <p className="text-[10px] text-secondary">{t.avgMiles} mi/day</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Your Route */}
      {step === 2 && stops.length > 0 && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="flex items-center gap-6 bg-surface-container-low rounded-xl p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{plan.days}</p>
              <p className="text-[10px] text-secondary">days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">102</p>
              <p className="text-[10px] text-secondary">miles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{Math.round(102 / plan.days * 10) / 10}</p>
              <p className="text-[10px] text-secondary">mi/day</p>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="material-symbols-outlined text-sm text-secondary">{RAINFALL_ICON[weather.rainfall]}</span>
              <span className="text-xs text-secondary">{weather.tempLow}–{weather.tempHigh}°C · {weather.month}</span>
            </div>
          </div>

          {/* Elevation profile */}
          <ElevationProfile stops={stops} direction={plan.direction} highlightDay={highlightDay} />

          {/* Two-column: day cards + sidebar */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Day cards */}
            <div className="flex-1 space-y-2">
              {stops.map((stop, i) => {
                const from = getStartVillage(stops, i, plan.direction);
                const conn = connections[i];
                const [startMile, endMile] = getDayMileRange(stops, i, plan.direction);
                const dayPois = pois.filter(p => {
                  const mile = approximateMileFromLat(p.latitude);
                  return mile >= startMile && mile <= endMile;
                });

                return (
                  <div key={stop.day}
                    className="bg-white rounded-xl border border-outline-variant/10 p-4 hover:shadow-sm transition-shadow"
                    onMouseEnter={() => setHighlightDay(stop.day)}
                    onMouseLeave={() => setHighlightDay(undefined)}>
                    {/* Day header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                        {stop.day}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-primary text-sm">{from} → {stop.village}</p>
                        <p className="text-[10px] text-secondary">
                          {stop.miles}mi · {conn?.elevationGain || 0}ft ↑ · {conn?.walkTime || "—"}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${DIFFICULTY_COLOUR[stop.difficulty]}`}>
                        {stop.difficulty}
                      </span>
                    </div>

                    {/* Walk score */}
                    <WalkScoreGauge score={stop.walkScore} />

                    {/* Pub lunch stops */}
                    <PubLunchCard
                      pubs={dayPois}
                      dayStartMile={startMile}
                      dayEndMile={endMile}
                      approximateMile={approximateMileFromLat}
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-outline-variant/10">
                      <Link href={`/search?village=${encodeURIComponent(stop.village)}`}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">bed</span>
                        Find stays
                      </Link>
                      <GPXExportButton
                        dayNumber={stop.day}
                        fromVillage={from}
                        toVillage={stop.village}
                        startMile={startMile}
                        endMile={endMile}
                        pois={dayPois}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sidebar */}
            <div className="lg:w-72 space-y-4">
              <CostEstimator days={plan.days} />
              <WhatIfComparison currentPlan={plan} onSelectDays={handleSelectDays} />
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/20">
            <button onClick={() => setStep(3)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-container transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-base">tune</span>
              Customise Stops
            </button>
            <button onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("stops", stops.map(s => s.village).join(","));
              url.searchParams.set("days", plan.days.toString());
              url.searchParams.set("dir", plan.direction);
              navigator.clipboard.writeText(url.toString());
            }}
              className="px-4 py-3 rounded-xl font-bold text-sm text-secondary border border-outline-variant/20 hover:border-primary/30 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-base">share</span>
              Share
            </button>
            <button onClick={() => window.print()}
              className="px-4 py-3 rounded-xl font-bold text-sm text-secondary border border-outline-variant/20 hover:border-primary/30 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-base">print</span>
              Print
            </button>
            <button onClick={() => { setStep(1); updatePlan({ stops: [] }); }}
              className="ml-auto text-xs text-secondary hover:text-red-600 transition-colors">
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Customise (simplified drag-free version for now) */}
      {step === 3 && stops.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">Customise your stops</h3>
            <button onClick={() => setStep(2)} className="text-xs text-secondary hover:text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to route
            </button>
          </div>

          <p className="text-xs text-secondary">Remove stops to shorten days or adjust your route. Changes are saved automatically.</p>

          <div className="space-y-1">
            {/* Start */}
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 rounded-lg">
              <span className="material-symbols-outlined text-primary">tour</span>
              <span className="text-sm font-bold text-primary">
                {plan.direction === "north_to_south" ? "Chipping Campden" : "Bath"}
              </span>
              <span className="text-[10px] text-secondary ml-auto">Start</span>
            </div>

            {stops.map((stop, i) => {
              const from = getStartVillage(stops, i, plan.direction);
              return (
                <div key={stop.day} className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-outline-variant/10">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {stop.day}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-primary">{stop.village}</p>
                    <p className="text-[10px] text-secondary">{stop.miles}mi from {from}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${DIFFICULTY_COLOUR[stop.difficulty]}`}>
                    {stop.walkScore}/10
                  </span>
                  {stops.length > 1 && (
                    <button onClick={() => {
                      const newStops = stops.filter((_, j) => j !== i);
                      // Renumber days
                      const renumbered: DayStop[] = newStops.map((s, j) => ({
                        ...s,
                        day: j + 1,
                        miles: j === 0
                          ? s.cumulative
                          : Math.round((s.cumulative - newStops[j - 1].cumulative) * 10) / 10,
                      }));
                      updatePlan({ stops: renumbered, days: renumbered.length });
                    }}
                      className="text-secondary hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => setStep(2)}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-container transition-colors">
            View Updated Route
          </button>
        </div>
      )}

      {/* Printable day cards (hidden on screen) */}
      <PrintableDayCards stops={stops} connections={connections} direction={plan.direction} month={plan.month} />
    </div>
  );
}
