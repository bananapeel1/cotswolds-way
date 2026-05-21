"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePlanStorage } from "@/hooks/usePlanStorage";
import {
  autoStops, computeConnections, countListingsByVillage, getStartVillage, getDayMileRange,
  approximateMileFromLat, WEATHER_DATA, RAINFALL_ICON,
  encodePlanToURL, planFromWishlist, TRAIL_TOTAL_MILES,
  TRAIL_TOTAL_ASCENT_M, TRAIL_TOTAL_DESCENT_M,
  type DayStop,
} from "@/lib/plan-engine";
import propertiesData from "@/data/properties.json";
import { useWishlistStorage } from "@/hooks/useWishlistStorage";
import { useForecast } from "@/hooks/useForecast";
import { describeWmo, formatLocalTime } from "@/lib/weather";
import ElevationProfile from "@/components/plan/ElevationProfile";
import MiniElevation from "@/components/plan/MiniElevation";
import CostEstimator from "@/components/plan/CostEstimator";
import GPXExportButton from "@/components/plan/GPXExportButton";
import PrintableDayCards from "@/components/plan/PrintableDayCards";
import CustomisePanel from "@/components/plan/CustomisePanel";
import PlanMap from "@/components/plan/PlanMap";
import TripPrep from "@/components/plan/TripPrep";
import DayAmenities from "@/components/plan/DayAmenities";
import AccommodationPicker from "@/components/plan/AccommodationPicker";
import PlansLibrary from "@/components/plan/PlansLibrary";
import PlanWarnings from "@/components/plan/PlanWarnings";
import BudgetTierCompare from "@/components/ai/BudgetTierCompare";
import ReplanChatPanel from "@/components/ai/ReplanChatPanel";
import WalkingStylePicker from "@/components/plan/WalkingStylePicker";
import { usePace } from "@/contexts/PaceContext";
import { ARCHETYPE_SCALAR, PACK_SCALAR } from "@/lib/plan-engine";
import { useUnits } from "@/contexts/UnitContext";

interface POI {
  id: number; type: string; name: string;
  latitude: number; longitude: number;
  distanceFromTrail: number; tags: Record<string, string>;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BEST_MONTHS = new Set([3, 4, 5, 6, 7, 8]); // Apr–Sep
const MONTH_DOTS: Record<number, number> = { 3: 2, 4: 2, 5: 3, 6: 3, 7: 2, 8: 2, 9: 1 };

const DIFF_STYLE: Record<string, string> = {
  easy: "bg-forest/8 text-forest-light",
  moderate: "bg-amber-warm/10 text-amber-warm",
  strenuous: "bg-terracotta/10 text-terracotta",
};

export default function TripPlanner() {
  const { plan, updatePlan, setAccommodation, removePoi, lastSaved, hydrated } = usePlanStorage();
  const { items: wishlistItems, clearWishlist } = useWishlistStorage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pois, setPois] = useState<POI[]>([]);
  const [highlightDays, setHighlightDays] = useState<number[]>([]);
  const [shareToast, setShareToast] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const { formatDistance, formatElevation, formatElevationM, formatTemp, formatTempRange, trailTotal, distanceUnit } = useUnits();
  const { archetype: globalArchetype, pack } = usePace();
  // UI-only preference toggles (no data model backing yet)
  const [accessibleStops, setAccessibleStops] = useState(false);
  const [diningNearby, setDiningNearby] = useState(false);

  // Fetch POIs for pub lunch planner
  useEffect(() => {
    fetch("/api/pois")
      .then(r => r.json())
      .then(data => { if (data.pois) setPois(data.pois); })
      .catch(() => {});
  }, []);

  // If plan has stops from localStorage, go to step 2 (once on mount only)
  const didAutoNav = useRef(false);
  useEffect(() => {
    if (hydrated && !didAutoNav.current && plan.stops.length > 0) {
      setStep(2);
      didAutoNav.current = true;
    }
  }, [hydrated, plan.stops.length]);

  const stops = plan.stops;
  // Per-plan override (set by the AI handoff) wins over the global preference.
  const effectiveArchetype = plan.paceOverride ?? globalArchetype ?? "steady";
  const paceScalar = ARCHETYPE_SCALAR[effectiveArchetype] * PACK_SCALAR[pack];
  const connections = useMemo(
    () => stops.length > 0 ? computeConnections(stops, plan.direction, paceScalar) : [],
    [stops, plan.direction, paceScalar],
  );
  const weather = WEATHER_DATA[plan.month];

  // Live forecast for the trip dates (if within the 16-day window). Falls back
  // to monthly climatology (WEATHER_DATA) when outside the window.
  const forecast = useForecast(plan.startDate, stops.length || plan.days);

  // Day that the map should fly to. `focusTick` increments on every click so
  // clicking the same day twice re-fires the fitBounds effect.
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  // Stable callback so PlanMap's effect doesn't re-run every parent render.
  const handleMapHover = useCallback((day: number | null) => {
    setHighlightDays(day ? [day] : []);
  }, []);

  const handleDayClick = useCallback((day: number) => {
    setFocusedDay(day);
    setFocusTick((t) => t + 1);
    setHighlightDays([day]);
  }, []);

  const buildRoute = useCallback(() => {
    const listings = countListingsByVillage(propertiesData as Array<{ village: string }>);
    const newStops = autoStops(plan.days, plan.direction, listings);
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

  const avgMiles = Math.round((TRAIL_TOTAL_MILES / plan.days) * 10) / 10;
  const paceLabel = avgMiles > 16 ? "Fast" : avgMiles > 12 ? "Steady" : avgMiles > 8 ? "Relaxed" : "Leisurely";

  function goToStep(n: 1 | 2 | 3) {
    if (n > 1 && stops.length === 0 && n !== 1) return;
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="no-print">
      {/* ═══ STICKY STEPPER ═══ */}
      <div className="sticky top-[65px] z-40 -mx-6 px-6 bg-white/95 backdrop-blur-xl border-b border-forest/8">
        <div className="max-w-[680px] mx-auto flex items-center h-[60px]">
          {[
            { n: 1 as const, label: "Setup" },
            { n: 2 as const, label: "Your Route" },
            { n: 3 as const, label: "Customise" },
          ].map(({ n, label }, idx) => (
            <div key={n} className="contents">
              {idx > 0 && (
                <div className="w-10 h-px mx-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-cream-dark" />
                  <div
                    className="absolute inset-y-0 left-0 bg-forest-light transition-all duration-600 ease-out"
                    style={{ width: step >= n ? "100%" : "0%" }}
                  />
                </div>
              )}
              <button
                onClick={() => (n <= step || stops.length > 0) ? goToStep(n) : undefined}
                className="flex-1 flex items-center gap-2.5 py-3 transition-all"
              >
                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-400 ${
                  step === n
                    ? "bg-forest text-white shadow-[0_2px_8px_rgba(45,90,61,0.25)]"
                    : n < step
                      ? "bg-forest-light text-white"
                      : "border-[1.5px] border-cream-dark text-stone-light"
                }`}>
                  {n < step ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  ) : n}
                </div>
                <span className={`text-[13px] font-medium transition-colors hidden sm:inline ${
                  step === n ? "text-forest-deep font-semibold" : n < step ? "text-forest" : "text-stone-light"
                }`}>
                  {label}
                </span>
              </button>
            </div>
          ))}

          {savedLabel && (
            <span className="ml-auto text-[10px] text-stone-light flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-xs">cloud_done</span>
              {savedLabel}
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         STEP 1 — SETUP
      ═══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="animate-step-in space-y-9 pt-4">

          {/* AI entry point */}
          <Link
            href="/plan/ai"
            className="group flex items-center gap-3 rounded-[20px] border border-tertiary/25 bg-gradient-to-br from-tertiary/4 to-transparent px-5 py-4 hover:border-tertiary/50 transition-colors"
          >
            <span className="material-symbols-outlined text-tertiary text-xl">auto_awesome</span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-ink leading-tight">
                Describe your walk instead
              </div>
              <div className="text-[12px] text-stone leading-tight mt-0.5">
                Tell our AI what you want in a sentence. It picks the stops and stays for you.
              </div>
            </div>
            <span className="text-tertiary text-sm group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          {/* Direction */}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-3.5">
              Direction <span className="flex-1 h-px bg-cream-dark" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: "north_to_south" as const, label: "North → South", desc: "Chipping Campden to Bath", tag: "Classic route · Downhill finish", arrow: "↓" },
                { value: "south_to_north" as const, label: "South → North", desc: "Bath to Chipping Campden", tag: "Quieter · Ascending finish", arrow: "↑" },
              ].map(opt => {
                const selected = plan.direction === opt.value;
                return (
                  <button key={opt.value} onClick={() => updatePlan({ direction: opt.value })}
                    className={`relative p-6 rounded-[20px] border-2 text-left transition-all duration-350 overflow-hidden hover:-translate-y-0.5 ${
                      selected
                        ? "border-forest bg-gradient-to-br from-white to-forest/3 shadow-[0_0_0_3px_rgba(45,90,61,0.08),0_4px_16px_rgba(45,90,61,0.08)]"
                        : "border-transparent bg-white hover:border-cream-dark hover:shadow-[0_4px_16px_rgba(45,90,61,0.08)]"
                    }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base mb-3.5 transition-all ${
                      selected ? "bg-forest text-white" : "bg-cream text-forest"
                    }`}>
                      {opt.arrow}
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>{opt.label}</h3>
                    <p className="text-[13px] text-stone">{opt.desc}</p>
                    <span className="inline-block mt-2.5 text-[11px] font-medium text-forest-light bg-forest/6 px-2.5 py-0.5 rounded-full tracking-wide">
                      {opt.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pace */}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-3.5">
              Pace <span className="flex-1 h-px bg-cream-dark" />
            </div>
            <div className="bg-white rounded-[20px] p-7 shadow-[0_1px_3px_rgba(30,63,43,0.06)]">
              <div className="flex gap-2 mb-5">
                {[4, 7, 10, 14].map(d => (
                  <button key={d} onClick={() => updatePlan({ days: d })}
                    className={`flex-1 text-center py-3 px-2 rounded-xl border-[1.5px] transition-all duration-300 ${
                      plan.days === d
                        ? "border-forest bg-forest"
                        : "border-cream-dark bg-transparent hover:border-stone-light hover:-translate-y-px"
                    }`}>
                    <span className={`text-[22px] font-bold block leading-tight tabular-nums ${
                      plan.days === d ? "text-white" : "text-ink-light"
                    }`}>{d}</span>
                    <span className={`text-[11px] uppercase tracking-wider ${
                      plan.days === d ? "text-white/70" : "text-stone"
                    }`}>days</span>
                  </button>
                ))}
              </div>
              <div className="py-2">
                <input type="range" min={3} max={14} value={plan.days}
                  onChange={e => updatePlan({ days: parseInt(e.target.value) })}
                  className="w-full pace-slider" />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-cream">
                <div className="text-center">
                  <div className="text-xl font-medium text-forest-deep tabular-nums">{formatDistance(avgMiles).split(" ")[0]}</div>
                  <div className="text-[11px] text-stone uppercase tracking-wider mt-0.5">{distanceUnit} / day</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-medium text-forest-deep">{paceLabel}</div>
                  <div className="text-[11px] text-stone uppercase tracking-wider mt-0.5">pace</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-medium text-forest-deep tabular-nums">{plan.days - 1}</div>
                  <div className="text-[11px] text-stone uppercase tracking-wider mt-0.5">nights</div>
                </div>
              </div>
            </div>
          </div>

          {/* Walking style — personalises the "leave by" times */}
          <WalkingStylePicker />

          {/* Month + Preferences row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start date */}
            <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(30,63,43,0.06)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-3">
                Start date
              </div>
              <input
                type="date"
                value={plan.startDate ?? ""}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    updatePlan({ startDate: undefined });
                    return;
                  }
                  const m = new Date(v + "T00:00:00Z").getUTCMonth();
                  updatePlan({ startDate: v, month: m });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-cream-dark bg-white text-ink text-[15px] font-medium focus:outline-none focus:border-forest transition-colors"
              />
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {MONTH_SHORT.map((m, i) => (
                  <button key={m} onClick={() => updatePlan({ month: i, startDate: undefined })}
                    title={`Climate averages for ${MONTHS[i]}`}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all relative ${
                      plan.month === i && !plan.startDate
                        ? "bg-forest text-white font-semibold shadow-[0_2px_8px_rgba(45,90,61,0.2)]"
                        : "text-ink-light hover:bg-cream"
                    }`}>
                    {m}
                    {MONTH_DOTS[i] && (
                      <div className="flex gap-[2px] justify-center mt-0.5">
                        {Array.from({ length: MONTH_DOTS[i] }).map((_, j) => (
                          <span key={j} className={`w-0.5 h-0.5 rounded-full ${
                            plan.month === i && !plan.startDate ? "bg-white/70" : "bg-forest-light/50"
                          }`} />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-3.5 pt-3 border-t border-cream text-[13px] text-stone flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">{RAINFALL_ICON[weather.rainfall]}</span>
                {plan.startDate
                  ? `Walk ${plan.startDate} → live forecast`
                  : `${MONTHS[plan.month]} averages: ${formatTempRange(weather.tempLow, weather.tempHigh)}, ${weather.rainfall} rainfall`}
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(30,63,43,0.06)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone mb-3">
                Preferences
              </div>
              {[
                { label: "Dog-friendly", desc: "Only show dog-welcome stays", icon: "🐕", on: plan.dogFriendly, toggle: () => updatePlan({ dogFriendly: !plan.dogFriendly }) },
                { label: "Accessible stops", desc: "Prioritise accessible lodgings", icon: "♿", on: accessibleStops, toggle: () => setAccessibleStops(!accessibleStops) },
                { label: "Dining nearby", desc: "Stops with restaurants", icon: "🍽️", on: diningNearby, toggle: () => setDiningNearby(!diningNearby) },
              ].map((pref, i) => (
                <button key={pref.label} onClick={pref.toggle}
                  className={`flex items-center gap-3 w-full py-3.5 ${i < 2 ? "border-b border-cream" : ""} text-left`}>
                  <div className="toggle-track" data-on={pref.on ? "true" : "false"} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{pref.icon} {pref.label}</p>
                    <p className="text-xs text-stone">{pref.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wishlist banner */}
          {wishlistItems.length > 0 && (
            <div className="bg-terracotta/5 border border-terracotta/20 rounded-[20px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-base text-terracotta" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <p className="text-sm font-bold text-ink">Build around your saved stays</p>
              </div>
              <p className="text-xs text-stone mb-3">
                You saved {wishlistItems.length} {wishlistItems.length === 1 ? "property" : "properties"} — {wishlistItems.map(i => i.village).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
              </p>
              <button
                onClick={() => {
                  const newStops = planFromWishlist(wishlistItems, plan.direction);
                  updatePlan({ stops: newStops, days: newStops.length });
                  clearWishlist();
                  setStep(2);
                }}
                className="bg-terracotta text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Build from wishlist
              </button>
            </div>
          )}

          {/* Build route CTA */}
          <button onClick={buildRoute}
            className="w-full flex items-center justify-center gap-2.5 py-[18px] px-8 bg-forest text-white rounded-[20px] text-base font-semibold transition-all duration-350 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(45,90,61,0.3)] relative overflow-hidden group mt-2">
            Build My Route
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-1">
              <path d="M5 12h12m0 0l-4-4m4 4l-4 4"/>
            </svg>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         STEP 2 — YOUR ROUTE
      ═══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && stops.length > 0 && (() => {
        const totalNights = stops.filter(s => !s.restDay).length - 1;
        const bookedNights = stops.filter(s => s.accommodation && !s.restDay).length;
        // Total climb of the plan = sum of each leg's ascent. For full
        // end-to-end plans this equals the trail-wide total (~3,845 m).
        const totalAscentM = connections.reduce((sum, c) => sum + (c?.elevationGain ?? 0) / 3.28084, 0);
        return (
        <div className="animate-step-in space-y-8 pt-4">
          {/* Route header */}
          <div className="text-center mb-2">
            <h2 className="text-[32px] font-medium text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              {plan.days}-Day Walk
            </h2>
            <div className="flex items-center justify-center gap-4 text-[13px] text-stone mt-1.5 flex-wrap">
              <span>{trailTotal}</span>
              <span>·</span>
              <span>{MONTHS[plan.month]}</span>
              <span>·</span>
              <span>{paceLabel} pace</span>
            </div>
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium bg-forest/6 text-forest">
                🥾 {formatDistance(avgMiles)}/day
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium bg-secondary/8 text-secondary"
                title={`Total climb across the plan (whole trail = ${Math.round(TRAIL_TOTAL_ASCENT_M)} m up, ${Math.round(TRAIL_TOTAL_DESCENT_M)} m down)`}
              >
                ⛰️ {formatElevationM(Math.round(totalAscentM))} climb
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium ${
                bookedNights === totalNights && totalNights > 0 ? "bg-forest/6 text-forest" : "bg-terracotta/8 text-terracotta"
              }`}>
                🛏️ {bookedNights}/{totalNights} nights booked
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium bg-amber-warm/8 text-brass-dark">
                ☀️ {formatTempRange(weather.tempLow, weather.tempHigh)}
              </span>
            </div>
          </div>

          {/* Plan warnings — long days, back-to-backs, missing bookings */}
          <PlanWarnings stops={stops} onHighlightDays={setHighlightDays} />

          {/* Interactive route map */}
          <div className="bg-white rounded-[20px] p-2 shadow-[0_1px_3px_rgba(30,63,43,0.06)]">
            <PlanMap
              stops={stops}
              direction={plan.direction}
              pois={pois}
              highlightDays={highlightDays}
              focusDay={focusedDay}
              focusTick={focusTick}
              onHoverDay={handleMapHover}
            />
          </div>

          {/* Elevation card */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(30,63,43,0.06)]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone flex items-center gap-1.5">
                ⛰️ Elevation Profile
              </h4>
              <span className="text-xs text-stone-light">Highest: Cleeve Common {formatElevationM(307)}</span>
            </div>
            <ElevationProfile stops={stops} direction={plan.direction} highlightDays={highlightDays} />
          </div>

          {/* Per-plan pace override — affects leave-by times below */}
          <div className="bg-white rounded-[20px] px-4 py-3 shadow-[0_1px_3px_rgba(30,63,43,0.06)] flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone">Pace for this trip</span>
            <div className="inline-flex rounded-full bg-cream/70 p-0.5">
              {(["casual", "steady", "strong", "athletic"] as const).map((a) => {
                const isSelected = effectiveArchetype === a;
                const labels: Record<typeof a, string> = {
                  casual: "Casual",
                  steady: "Steady",
                  strong: "Strong",
                  athletic: "Athletic",
                };
                return (
                  <button
                    key={a}
                    onClick={() => updatePlan({ paceOverride: a })}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                      isSelected
                        ? "bg-white text-forest-deep shadow-[0_1px_3px_rgba(45,90,61,0.12)]"
                        : "text-stone hover:text-forest"
                    }`}
                  >
                    {labels[a]}
                  </button>
                );
              })}
            </div>
            {plan.paceOverride ? (
              <button
                onClick={() => updatePlan({ paceOverride: undefined })}
                className="text-[11px] text-tertiary hover:text-terracotta underline-offset-2 hover:underline"
                title={`Revert to your default (${globalArchetype ?? "steady"})`}
              >
                trip override · revert
              </button>
            ) : (
              <span className="text-[11px] text-stone-light">your default</span>
            )}
          </div>

          {/* Day cards */}
          <div className="flex flex-col gap-3">
            {stops.map((stop, i) => {
              const from = getStartVillage(stops, i, plan.direction);
              const conn = connections[i];
              const [startMile, endMile] = getDayMileRange(stops, i, plan.direction);
              const dayPois = pois.filter(p => {
                const mile = approximateMileFromLat(p.latitude, p.longitude);
                return mile >= startMile && mile <= endMile;
              });
              const isLastDay = i === stops.length - 1;
              const topLunch = dayPois
                .filter(p => ["pub", "cafe", "restaurant"].includes(p.type) && p.distanceFromTrail <= 500)
                .sort((a, b) => a.distanceFromTrail - b.distanceFromTrail)[0] || null;

              const diffLabel = stop.walkScore >= 7 ? "Tough" : stop.walkScore >= 4 ? "Moderate" : "Easy";
              const diffClass = stop.walkScore >= 7 ? "bg-terracotta/10 text-terracotta" : stop.walkScore >= 4 ? "bg-amber-warm/10 text-brass-dark" : "bg-forest/8 text-forest-light";

              const fc = forecast.forecast[i];
              const weatherDesc = fc ? describeWmo(fc.weatherCode) : null;
              const dayDate = plan.startDate
                ? new Date(new Date(plan.startDate + "T00:00:00Z").getTime() + i * 86400000)
                : null;

              // "Leave by" time = sunset − walking hours − 1 hr buffer (breaks
              // + arrival contingency). If the buffer puts the start before
              // sunrise, surface as a "tight daylight" warning.
              const walkHours = conn?.walkTime?.match(/(\d+)h\s*(\d+)?/);
              const walkMinutes = walkHours ? parseInt(walkHours[1]) * 60 + (parseInt(walkHours[2] ?? "0")) : 0;
              const leaveBy = (() => {
                if (!fc || !walkMinutes) return null;
                const sunset = new Date(fc.sunsetIso);
                const sunrise = new Date(fc.sunriseIso);
                const buffer = 60; // minutes
                const latest = new Date(sunset.getTime() - (walkMinutes + buffer) * 60000);
                const tight = latest < sunrise;
                return {
                  latest,
                  tight,
                  label: `${latest.getHours().toString().padStart(2, "0")}:${latest.getMinutes().toString().padStart(2, "0")}`,
                };
              })();

              return (
                <div key={stop.day}
                  className="bg-white rounded-[20px] border-[1.5px] border-transparent shadow-[0_1px_3px_rgba(30,63,43,0.06)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(30,63,43,0.08)] hover:-translate-y-px hover:border-forest/8 overflow-hidden"
                  onMouseEnter={() => setHighlightDays([stop.day])}
                  onMouseLeave={() => setHighlightDays([])}
                >
                  {/* Main row — click anywhere here to focus the map on this day */}
                  <div
                    className="grid grid-cols-[52px_1fr_auto] items-center gap-4 px-5 py-[18px] cursor-pointer"
                    onClick={() => handleDayClick(stop.day)}
                    title="Show this day on the map"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-medium transition-all ${
                      stop.accommodation
                        ? "bg-forest text-white"
                        : "bg-cream text-forest group-hover:bg-forest group-hover:text-white"
                    }`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {stop.day}
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>
                        {from} → {stop.village}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-stone flex-wrap">
                        {dayDate && (
                          <span className="font-medium text-forest">
                            {dayDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        )}
                        <span>{formatDistance(stop.miles)}</span>
                        <span>{formatElevation(conn?.elevationGain || 0)} ↑</span>
                        <span>{conn?.walkTime || "—"}</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] tracking-wide ${diffClass}`}>
                          {diffLabel}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block opacity-70">
                      <MiniElevation startMile={startMile} endMile={endMile} />
                    </div>
                  </div>

                  {/* Per-day amenities + closed-pub warning */}
                  <DayAmenities pois={dayPois} travelDate={dayDate} />

                  {/* Forecast + daylight strip (only when a live forecast is available) */}
                  {fc && weatherDesc && (
                    <div className="flex items-center gap-3 px-5 pb-2 pl-[88px] text-xs text-stone flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">{weatherDesc.icon}</span>
                        {weatherDesc.label}
                      </span>
                      <span className="font-medium text-ink-light">{formatTemp(fc.tempMinC)}–{formatTemp(fc.tempMaxC)}</span>
                      {fc.precipProbPct > 20 && (
                        <span className={fc.precipProbPct > 60 ? "text-terracotta font-semibold" : "text-brass-dark"}>
                          {fc.precipProbPct}% rain
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">wb_twilight</span>
                        {formatLocalTime(fc.sunriseIso)}–{formatLocalTime(fc.sunsetIso)}
                        <span className="text-stone-light">({fc.daylightHours}h)</span>
                      </span>
                      {leaveBy && (
                        <span
                          className={leaveBy.tight ? "inline-flex items-center gap-1 text-terracotta font-semibold" : "inline-flex items-center gap-1"}
                          title={leaveBy.tight ? "Walking time + 1h buffer doesn't fit in daylight — consider splitting this day or starting at first light" : "Latest sensible start to reach the next stop ~1h before sunset"}
                        >
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          leave by {leaveBy.label}
                          {leaveBy.tight && <span className="ml-0.5">⚠</span>}
                        </span>
                      )}
                      {fc.windMaxKmh > 40 && (
                        <span className="text-terracotta font-semibold">
                          {Math.round(fc.windMaxKmh)} km/h wind
                        </span>
                      )}
                    </div>
                  )}

                  {/* Accommodation picker (or lunch badge if last day) */}
                  {(!isLastDay && !stop.restDay) ? (
                    <AccommodationPicker
                      village={stop.village}
                      day={stop.day}
                      selected={stop.accommodation}
                      dogFriendly={plan.dogFriendly}
                      onSelect={setAccommodation}
                      onClear={(d) => setAccommodation(d, null)}
                    />
                  ) : null}
                  {topLunch && (
                    <div className="px-5 pb-4 pl-[88px]">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-cream-dark text-ink-light bg-cream">
                        🍴 {topLunch.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trip prep: transport, baggage, pack list */}
          <TripPrep stops={stops} direction={plan.direction} startDate={plan.startDate} month={plan.month} />

          {/* Saved snapshots — what-if variations, compare plans */}
          <PlansLibrary
            currentPlan={plan}
            onLoad={(loaded) => {
              updatePlan(loaded);
              goToStep(2);
            }}
          />

          {/* AI replan panel */}
          <ReplanChatPanel plan={plan} onUpdatePlan={updatePlan} />

          {/* Budget accordion */}
          <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(30,63,43,0.06)] overflow-hidden">
            <button onClick={() => setBudgetOpen(!budgetOpen)}
              className="w-full flex items-center justify-between px-6 py-[18px] text-sm font-semibold text-ink hover:bg-cream transition-colors">
              <span>💰 Estimated Budget</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
                className={`text-stone transition-transform ${budgetOpen ? "rotate-180" : ""}`}>
                <polyline points="4 6 8 10 12 6"/>
              </svg>
            </button>
            {budgetOpen && (
              <div className="px-6 pb-5 animate-slide-up-fade space-y-4">
                <CostEstimator days={plan.days} />
                <BudgetTierCompare
                  plan={plan}
                  onApplyTier={(byDay) => {
                    byDay.forEach((accom, day) => setAccommodation(day, accom));
                  }}
                />
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center gap-2.5 mt-7 flex-wrap">
            <button onClick={() => goToStep(3)}
              className="flex-1 flex items-center justify-center gap-2.5 py-[18px] px-8 bg-forest text-white rounded-[20px] text-base font-semibold transition-all duration-350 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(45,90,61,0.3)] group">
              Customise Route
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2.56a2.12 2.12 0 0 1 3 3L7 13.72l-4 1 1-4Z"/>
              </svg>
            </button>
            <button onClick={() => {
              const url = new URL(window.location.origin + "/my-trip");
              const params = encodePlanToURL(plan);
              params.forEach((v, k) => url.searchParams.set(k, v));
              navigator.clipboard.writeText(url.toString());
              setShareToast(true);
              setTimeout(() => setShareToast(false), 2000);
            }}
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-[13px] font-semibold border-[1.5px] border-cream-dark bg-white text-ink-light hover:border-stone-light hover:shadow-[0_1px_3px_rgba(30,63,43,0.06)] transition-all">
              {shareToast ? "✓ Copied!" : "Share"}
            </button>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-[13px] font-semibold border-[1.5px] border-cream-dark bg-white text-ink-light hover:border-stone-light hover:shadow-[0_1px_3px_rgba(30,63,43,0.06)] transition-all">
              🖨️ Print
            </button>
            <Link href="/my-trip"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-[13px] font-semibold border-[1.5px] border-forest text-forest hover:bg-forest/4 transition-all">
              📋 My Trip
            </Link>
          </div>
          <div className="text-center">
            <button onClick={() => { goToStep(1); updatePlan({ stops: [] }); }}
              className="text-xs text-stone hover:text-terracotta transition-colors inline-flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-xs">restart_alt</span> Start over
            </button>
          </div>
        </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
         STEP 3 — CUSTOMISE
      ═══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && stops.length > 0 && (
        <div className="animate-step-in space-y-5 pt-4">
          {/* Elevation mini */}
          <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(30,63,43,0.06)]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone flex items-center gap-1.5">
                ⛰️ Elevation Profile
              </h4>
              <span className="text-xs text-stone-light">Highest: Cleeve Common {formatElevationM(307)}</span>
            </div>
            <ElevationProfile stops={stops} direction={plan.direction} highlightDays={highlightDays} />
          </div>

          <CustomisePanel
            stops={stops}
            direction={plan.direction}
            onUpdateStops={(newStops, days) => updatePlan({ stops: newStops, days })}
            onBack={() => goToStep(2)}
            onHighlightDays={setHighlightDays}
          />
        </div>
      )}

      {/* Printable day cards (hidden on screen) */}
      <PrintableDayCards stops={stops} connections={connections} direction={plan.direction} month={plan.month} startDate={plan.startDate} />
    </div>
  );
}
