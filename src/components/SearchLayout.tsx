"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import TrailMap from "@/components/TrailMap";
import type { MapProperty } from "@/components/TrailMap";

interface AccommodationCard {
  slug: string;
  name: string;
  rating: number | null;
  propertyType: string;
  typeLabel: string;
  typeIcon: string;
  distance: string;
  distanceIcon: string;
  badge: string | null;
  badgeColor: string;
  urgency: string;
  urgencyColor: string;
  amenities: { icon: string; label: string; active: boolean }[];
  image: string;
  isDogFriendly?: boolean;
  dayOnTrail?: number | null;
  trailStage?: number;
  village?: string;
  description?: string;
  hasLiveAvailability?: boolean;
}

type PropertyTypeFilter = null | "hotel" | "inn" | "bnb" | "campsite" | "glamping" | "hostel";

const TYPE_OPTIONS: { value: PropertyTypeFilter; label: string }[] = [
  { value: null, label: "All" },
  { value: "hotel", label: "Hotels" },
  { value: "inn", label: "Inns" },
  { value: "bnb", label: "B&Bs" },
  { value: "campsite", label: "Campsites" },
  { value: "glamping", label: "Glamping" },
  { value: "hostel", label: "Hostels" },
];

const STAGE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Full trail" },
  { value: 1, label: "Stage 1: Chipping Campden → Stanton" },
  { value: 2, label: "Stage 2: Stanton → Cleeve Hill" },
  { value: 3, label: "Stage 3: Cleeve Hill → Birdlip" },
  { value: 4, label: "Stage 4: Birdlip → Painswick" },
  { value: 5, label: "Stage 5: Painswick → King's Stanley" },
  { value: 6, label: "Stage 6: King's Stanley → Wotton" },
  { value: 7, label: "Stage 7: Wotton → Tormarton" },
  { value: 8, label: "Stage 8: Tormarton → Bath" },
];

// Stage village names for day labels
const STAGE_VILLAGES: Record<number, string> = {
  1: "Chipping Campden", 2: "Stanton", 3: "Cleeve Hill", 4: "Birdlip",
  5: "Painswick", 6: "King's Stanley", 7: "Wotton", 8: "Bath",
};

interface PlanEntry {
  slug: string;
  night: number; // assigned night number
}

export default function SearchLayout({
  accommodations,
  mapProperties,
}: {
  accommodations: AccommodationCard[];
  mapProperties: MapProperty[];
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [panelWidth, setPanelWidth] = useState(420);
  const isDragging = useRef(false);
  const handleMouseDown = useCallback(() => { isDragging.current = true; }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) setPanelWidth(Math.max(300, Math.min(600, e.clientX))); };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // Filters
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>(null);
  const [dogFriendly, setDogFriendly] = useState(false);
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Plan with day assignment
  const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
  const [planOpen, setPlanOpen] = useState(true);

  const planSlugs = useMemo(() => planEntries.map(e => e.slug), [planEntries]);

  const togglePlan = (slug: string) => {
    setPlanEntries((prev) => {
      if (prev.find(e => e.slug === slug)) {
        // Remove and renumber
        const removed = prev.filter(e => e.slug !== slug);
        return removed.map((e, i) => ({ ...e, night: i + 1 }));
      }
      // Add: assign next night number
      const acc = accommodations.find(a => a.slug === slug);
      const newEntry: PlanEntry = { slug, night: prev.length + 1 };
      const newList = [...prev, newEntry];
      // Sort by trail stage and renumber
      return newList
        .sort((a, b) => {
          const accA = accommodations.find(x => x.slug === a.slug);
          const accB = accommodations.find(x => x.slug === b.slug);
          return (accA?.trailStage || 0) - (accB?.trailStage || 0);
        })
        .map((e, i) => ({ ...e, night: i + 1 }));
    });
  };

  const reassignNight = (slug: string, newNight: number) => {
    setPlanEntries((prev) => {
      const entry = prev.find(e => e.slug === slug);
      if (!entry) return prev;
      // Swap: find who has the target night, swap them
      const other = prev.find(e => e.night === newNight && e.slug !== slug);
      return prev.map(e => {
        if (e.slug === slug) return { ...e, night: newNight };
        if (other && e.slug === other.slug) return { ...e, night: entry.night };
        return e;
      });
    });
  };

  const activeFilterCount = [propertyType !== null, dogFriendly, stageFilter !== null].filter(Boolean).length;
  const clearFilters = () => { setPropertyType(null); setDogFriendly(false); setStageFilter(null); };

  const filtered = useMemo(() => {
    return accommodations.filter((acc) => {
      if (propertyType && acc.propertyType !== propertyType) return false;
      if (dogFriendly && !acc.isDogFriendly) return false;
      if (stageFilter && acc.trailStage !== stageFilter) return false;
      return true;
    });
  }, [accommodations, propertyType, dogFriendly, stageFilter]);

  const filteredSlugs = useMemo(() => new Set(filtered.map((a) => a.slug)), [filtered]);
  const filteredMapProperties = useMemo(() => mapProperties.filter((p) => filteredSlugs.has(p.slug)), [mapProperties, filteredSlugs]);

  const planItems = useMemo(
    () => planEntries
      .sort((a, b) => a.night - b.night)
      .map(e => ({ ...e, acc: accommodations.find(a => a.slug === e.slug)! }))
      .filter(e => e.acc),
    [accommodations, planEntries]
  );

  return (
    <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">
      {/* Mobile toggle */}
      <div className="lg:hidden flex bg-surface border-b border-outline-variant/20">
        <button onClick={() => setMobileView("list")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${mobileView === "list" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}>
          <span className="material-symbols-outlined text-lg">list</span> List
        </button>
        <button onClick={() => setMobileView("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${mobileView === "map" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}>
          <span className="material-symbols-outlined text-lg">map</span> Map
        </button>
      </div>

      {/* Left panel */}
      <section
        className={`bg-surface flex flex-col overflow-hidden ${mobileView === "map" ? "hidden lg:flex" : "flex"} w-full lg:w-auto shrink-0`}
        style={{ width: isDesktop ? `${panelWidth}px` : undefined }}
      >
        {/* My Plan — sticky top */}
        {planEntries.length > 0 && (
          <div className="bg-primary/5 border-b border-primary/10 shrink-0">
            <button onClick={() => setPlanOpen(!planOpen)}
              className="w-full flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">checklist</span>
                <span className="text-sm font-bold text-primary">My Plan</span>
                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{planEntries.length}</span>
              </div>
              <span className={`material-symbols-outlined text-sm text-primary transition-transform ${planOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
            </button>
            {planOpen && (
              <div className="px-5 pb-4 space-y-2">
                {planItems.map((item) => (
                  <div key={item.slug} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                    {/* Night selector */}
                    <select
                      value={item.night}
                      onChange={(e) => reassignNight(item.slug, parseInt(e.target.value))}
                      className="w-14 text-center bg-primary text-white text-[10px] font-bold rounded-full py-1 appearance-none cursor-pointer"
                    >
                      {planEntries.map((_, i) => (
                        <option key={i + 1} value={i + 1}>N{i + 1}</option>
                      ))}
                    </select>
                    <div className="min-w-0 flex-grow">
                      <p className="text-sm font-bold text-primary truncate">{item.acc.name}</p>
                      <p className="text-[10px] text-secondary">
                        {item.acc.village} · Stage {item.acc.trailStage}
                      </p>
                    </div>
                    <button onClick={() => togglePlan(item.slug)} className="text-secondary hover:text-red-500 shrink-0">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                <button onClick={() => setPlanEntries([])} className="text-xs text-secondary hover:text-primary transition-colors">Clear plan</button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-surface px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bed</span>Stays
            </h2>
            <span className="text-xs font-label text-secondary">{filtered.length} stays</span>
          </div>

          {/* Stage selector */}
          <div className="relative mb-3">
            <button onClick={() => setStageOpen(!stageOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 text-sm text-primary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary">route</span>
                <span className="truncate">{stageFilter ? STAGE_OPTIONS.find((o) => o.value === stageFilter)?.label : "Full trail"}</span>
              </div>
              <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${stageOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
            </button>
            {stageOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-outline-variant/20 py-1 z-30 max-h-72 overflow-y-auto">
                {STAGE_OPTIONS.map((opt) => (
                  <button key={opt.label} onClick={() => { setStageFilter(opt.value); setStageOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high transition-colors ${stageFilter === opt.value ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type pills + dog filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            {TYPE_OPTIONS.map((opt) => (
              <button key={opt.label} onClick={() => setPropertyType(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${propertyType === opt.value ? "bg-primary text-white" : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"}`}>
                {opt.label}
              </button>
            ))}
            <button onClick={() => setDogFriendly(!dogFriendly)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${dogFriendly ? "bg-primary text-white" : "bg-surface-container-high text-secondary hover:bg-surface-container-highest"}`}>
              <span className="material-symbols-outlined text-xs">pets</span> Dogs
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-secondary hover:text-primary transition-colors mt-1">
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Cards list */}
        <div className="px-4 pb-8 space-y-3 overflow-y-auto no-scrollbar flex-grow pt-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-secondary/20 mb-3">search_off</span>
              <p className="text-sm font-bold text-primary mb-1">No matches</p>
              <p className="text-xs text-secondary mb-4">Try adjusting your filters</p>
              <button onClick={clearFilters} className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold">Clear Filters</button>
            </div>
          ) : (
            filtered.map((acc) => {
              const planEntry = planEntries.find(e => e.slug === acc.slug);
              const inPlan = !!planEntry;
              return (
                <div key={acc.slug}
                  className={`bg-white rounded-xl overflow-hidden border transition-all ${
                    selectedSlug === acc.slug ? "border-primary shadow-md" : inPlan ? "border-primary/30" : "border-outline-variant/10 hover:shadow-sm"
                  }`}
                >
                  <div className="flex min-h-[120px]">
                    {/* Image */}
                    <Link href={`/property/${acc.slug}`} className="w-28 shrink-0 overflow-hidden relative">
                      <img className="w-full h-full object-cover" alt={acc.name} src={acc.image} />
                      {inPlan && (
                        <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          Night {planEntry!.night}
                        </span>
                      )}
                    </Link>
                    {/* Info */}
                    <div className="flex-grow p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <Link href={`/property/${acc.slug}`}>
                          <h4 className="font-headline text-sm font-bold text-primary truncate leading-tight">{acc.name}</h4>
                        </Link>
                        <p className="text-[11px] text-secondary mt-0.5 flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-[11px]">location_on</span>
                          {acc.village}{acc.trailStage ? ` · Stage ${acc.trailStage}` : ""}
                        </p>
                        {acc.description && (
                          <p className="text-[10px] text-secondary/70 line-clamp-2 mt-1 leading-relaxed">{acc.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-bold text-secondary uppercase">{acc.typeLabel}</span>
                        <button
                          onClick={(e) => { e.preventDefault(); togglePlan(acc.slug); }}
                          className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${inPlan ? "text-primary" : "text-secondary hover:text-primary"}`}
                        >
                          <span className="material-symbols-outlined text-sm">{inPlan ? "check_circle" : "add_circle_outline"}</span>
                          {inPlan ? `Night ${planEntry!.night}` : "Plan"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Draggable resizer — desktop only */}
      <div
        onMouseDown={handleMouseDown}
        className="hidden lg:flex items-center justify-center w-2 bg-outline-variant/10 hover:bg-primary/20 cursor-col-resize transition-colors shrink-0 group"
      >
        <div className="w-1 h-8 rounded-full bg-outline-variant/40 group-hover:bg-primary/40 transition-colors" />
      </div>

      {/* Map */}
      <section
        className={`flex-1 min-h-0 min-w-0 relative ${mobileView === "list" ? "hidden lg:block" : "block"}`}
        style={mobileView === "map" ? { height: "calc(100vh - 65px - 49px)" } : undefined}
      >
        <TrailMap
          properties={filteredMapProperties}
          activeSlug={selectedSlug || undefined}
          onMarkerClick={(slug) => setSelectedSlug((prev) => (prev === slug ? null : slug))}
          planSlugs={planSlugs}
        />
      </section>
    </main>
  );
}
