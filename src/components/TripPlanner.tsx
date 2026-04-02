"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePlanStorage } from "@/hooks/usePlanStorage";
import {
  autoStops, computeConnections, getStartVillage, getDayMileRange,
  approximateMileFromLat, WEATHER_DATA, RAINFALL_ICON,
  type DayStop,
} from "@/lib/plan-engine";
import ElevationProfile from "@/components/plan/ElevationProfile";
import WalkScoreGauge from "@/components/plan/WalkScoreGauge";
import PubLunchCard from "@/components/plan/PubLunchCard";
import CostEstimator from "@/components/plan/CostEstimator";
import GPXExportButton from "@/components/plan/GPXExportButton";
import PrintableDayCards from "@/components/plan/PrintableDayCards";
import CustomisePanel from "@/components/plan/CustomisePanel";

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
  const [highlightDays, setHighlightDays] = useState<number[]>([]);
  const [shareToast, setShareToast] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

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

  // Relative time for "last saved"
  const savedLabel = useMemo(() => {
    if (!lastSaved) return null;
    const diff = Date.now() - new Date(lastSaved).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }, [lastSaved]);

  if (!hydrated) return null;

  const avgMiles = Math.round(102 / plan.days * 10) / 10;
  const paceLabel = avgMiles > 16 ? "Fast" : avgMiles > 12 ? "Steady" : avgMiles > 8 ? "Relaxed" : "Leisurely";

  return (
    <div className="no-print">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-1">
          {[
            { n: 1, label: "Setup", icon: "settings" },
            { n: 2, label: "Your Route", icon: "route" },
            { n: 3, label: "Customise", icon: "tune" },
          ].map(({ n, label, icon }, idx) => (
            <div key={n} className="flex items-center">
              {idx > 0 && <div className={`w-8 h-px mx-1 ${n <= step ? "bg-primary/30" : "bg-outline-variant/20"}`} />}
              <button
                onClick={() => (n <= step || stops.length > 0) ? setStep(n as 1 | 2 | 3) : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                  step === n
                    ? "bg-primary text-white shadow-sm"
                    : n < step
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "bg-surface-container-high text-secondary/40"
                }`}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </div>
          ))}
        </div>
        {savedLabel && (
          <span className="text-[10px] text-secondary/60 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">cloud_done</span>
            {savedLabel}
          </span>
        )}
      </div>

      {/* ═══════ Step 1 — Setup ═══════ */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Direction */}
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">Direction</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "north_to_south" as const, label: "North → South", desc: "Chipping Campden to Bath", sub: "Classic route, downhill finish", icon: "south" },
                { value: "south_to_north" as const, label: "South → North", desc: "Bath to Chipping Campden", sub: "Quieter, ascending finish", icon: "north" },
              ].map(opt => (
                <button key={opt.value} onClick={() => updatePlan({ direction: opt.value })}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    plan.direction === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-outline-variant/15 hover:border-primary/30 hover:shadow-sm"
                  }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`material-symbols-outlined text-xl ${plan.direction === opt.value ? "text-primary" : "text-secondary"}`}>{opt.icon}</span>
                    <span className="font-bold text-primary">{opt.label}</span>
                  </div>
                  <p className="text-xs text-secondary">{opt.desc}</p>
                  <p className="text-[10px] text-secondary/60 mt-1">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Days — visual pace selector */}
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">
              Pace — {plan.days} days
            </label>
            <div className="bg-surface-container-low rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-4">
                {[4, 7, 10, 14].map(d => (
                  <button key={d} onClick={() => updatePlan({ days: d })}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      plan.days === d
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-secondary border border-outline-variant/20 hover:border-primary/30"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
              <input type="range" min={4} max={14} value={plan.days}
                onChange={e => updatePlan({ days: parseInt(e.target.value) })}
                className="w-full accent-primary h-2" />
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-lg font-bold text-primary">{avgMiles} mi/day</p>
                  <p className="text-[10px] text-secondary">{paceLabel} pace</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{plan.days - 1} nights</p>
                  <p className="text-[10px] text-secondary">accommodation needed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Month + preferences row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Month */}
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">Month</label>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((m, i) => {
                  const w = WEATHER_DATA[i];
                  const isBest = i >= 4 && i <= 8;
                  return (
                    <button key={m} onClick={() => updatePlan({ month: i })}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all relative ${
                        plan.month === i
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white text-secondary border border-outline-variant/15 hover:border-primary/30"
                      }`}>
                      {m.slice(0, 3)}
                      {isBest && plan.month !== i && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-secondary mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">{RAINFALL_ICON[weather.rainfall]}</span>
                {MONTHS[plan.month]}: {weather.tempLow}–{weather.tempHigh}°C, {weather.rainfall} rainfall
                {(plan.month >= 10 || plan.month <= 1) && " · Pack a torch"}
              </p>
            </div>

            {/* Preferences */}
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">Preferences</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-outline-variant/15 cursor-pointer hover:border-primary/30 transition-all">
                  <input type="checkbox" checked={plan.dogFriendly} onChange={e => updatePlan({ dogFriendly: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded" />
                  <span className="material-symbols-outlined text-base text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
                  <div>
                    <p className="text-sm font-bold text-primary">Dog-friendly</p>
                    <p className="text-[10px] text-secondary">Only show stays that welcome dogs</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Build route CTA */}
          <button onClick={buildRoute}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:bg-primary-container transition-all flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            Build My Route
          </button>
        </div>
      )}

      {/* ═══════ Step 2 — Your Route ═══════ */}
      {step === 2 && stops.length > 0 && (
        <div className="space-y-5">
          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: plan.days, label: "Days", icon: "calendar_today" },
              { value: "102", label: "Miles", icon: "straighten" },
              { value: avgMiles, label: "Mi/day", icon: "speed" },
              { value: `${weather.tempLow}–${weather.tempHigh}°C`, label: weather.month, icon: RAINFALL_ICON[weather.rainfall] },
            ].map((stat, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl p-3 text-center">
                <span className="material-symbols-outlined text-sm text-secondary mb-1 block">{stat.icon}</span>
                <p className="text-lg font-bold text-primary">{stat.value}</p>
                <p className="text-[10px] text-secondary">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Elevation profile */}
          <ElevationProfile stops={stops} direction={plan.direction} highlightDays={highlightDays} />

          {/* Day cards + sidebar */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Day cards */}
            <div className="flex-1 space-y-3">
              {stops.map((stop, i) => {
                const from = getStartVillage(stops, i, plan.direction);
                const conn = connections[i];
                const [startMile, endMile] = getDayMileRange(stops, i, plan.direction);
                const dayPois = pois.filter(p => {
                  const mile = approximateMileFromLat(p.latitude);
                  return mile >= startMile && mile <= endMile;
                });
                const isExpanded = expandedDay === stop.day;

                return (
                  <div key={stop.day}
                    className={`bg-white rounded-2xl border transition-all ${
                      isExpanded ? "border-primary/20 shadow-md" : "border-outline-variant/10 hover:shadow-sm"
                    }`}
                    onMouseEnter={() => setHighlightDays([stop.day])}
                    onMouseLeave={() => setHighlightDays([])}
                  >
                    {/* Day header — always visible */}
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : stop.day)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white font-bold text-sm shrink-0">
                        {stop.day}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary text-sm truncate">{from} → {stop.village}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-secondary">{stop.miles}mi</span>
                          <span className="text-secondary/30">·</span>
                          <span className="text-[11px] text-secondary">{conn?.elevationGain || 0}ft ↑</span>
                          <span className="text-secondary/30">·</span>
                          <span className="text-[11px] text-secondary">{conn?.walkTime || "—"}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${DIFFICULTY_COLOUR[stop.difficulty]} shrink-0`}>
                        {stop.difficulty}
                      </span>
                      <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </button>

                    {/* Walk score — compact, always visible */}
                    <div className="px-4 pb-3">
                      <WalkScoreGauge score={stop.walkScore} />
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-outline-variant/10 pt-3">
                        {/* Pub lunch stops */}
                        <PubLunchCard
                          pubs={dayPois}
                          dayStartMile={startMile}
                          dayEndMile={endMile}
                          approximateMile={approximateMileFromLat}
                        />

                        {/* Terrain info */}
                        {conn && (
                          <div className="flex items-center gap-2 text-[11px] text-secondary">
                            <span className="material-symbols-outlined text-xs">terrain</span>
                            {conn.terrain}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4 pt-2">
                          <Link href={`/search?village=${encodeURIComponent(stop.village)}`}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">bed</span>
                            Find stays in {stop.village}
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
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar — cost only */}
            <div className="lg:w-72 shrink-0">
              <div className="lg:sticky lg:top-24">
                <CostEstimator days={plan.days} />
              </div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-outline-variant/15">
            <button onClick={() => setStep(3)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-base">tune</span>
              Customise
            </button>
            <button onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("stops", stops.map(s => s.village).join(","));
              url.searchParams.set("days", plan.days.toString());
              url.searchParams.set("dir", plan.direction);
              navigator.clipboard.writeText(url.toString());
              setShareToast(true);
              setTimeout(() => setShareToast(false), 2000);
            }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-secondary border border-outline-variant/15 hover:border-primary/30 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-base">{shareToast ? "check" : "share"}</span>
              {shareToast ? "Copied!" : "Share"}
            </button>
            <button onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-secondary border border-outline-variant/15 hover:border-primary/30 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-base">print</span>
              Print
            </button>
            <button onClick={() => { setStep(1); updatePlan({ stops: [] }); }}
              className="ml-auto text-xs text-secondary hover:text-red-600 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">restart_alt</span>
              Start over
            </button>
          </div>
        </div>
      )}

      {/* ═══════ Step 3 — Customise ═══════ */}
      {step === 3 && stops.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <ElevationProfile stops={stops} direction={plan.direction} highlightDays={highlightDays} />
          <CustomisePanel
            stops={stops}
            direction={plan.direction}
            onUpdateStops={(newStops, days) => updatePlan({ stops: newStops, days })}
            onBack={() => setStep(2)}
            onHighlightDays={setHighlightDays}
          />
        </div>
      )}

      {/* Printable day cards (hidden on screen) */}
      <PrintableDayCards stops={stops} connections={connections} direction={plan.direction} month={plan.month} />
    </div>
  );
}
