"use client";

import { useState, useMemo } from "react";
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

export default function SearchLayout({
  accommodations,
  mapProperties,
}: {
  accommodations: AccommodationCard[];
  mapProperties: MapProperty[];
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Filters
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>(null);
  const [dogFriendly, setDogFriendly] = useState(false);
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [stageOpen, setStageOpen] = useState(false);

  // Plan
  const [planSlugs, setPlanSlugs] = useState<string[]>([]);
  const [planOpen, setPlanOpen] = useState(true);

  const togglePlan = (slug: string) => {
    setPlanSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
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
    () => accommodations.filter((a) => planSlugs.includes(a.slug)).sort((a, b) => (a.trailStage || 0) - (b.trailStage || 0)),
    [accommodations, planSlugs]
  );

  const selectedProperty = selectedSlug ? filtered.find((a) => a.slug === selectedSlug) || null : null;
  const selectedMapProp = selectedSlug ? filteredMapProperties.find((p) => p.slug === selectedSlug) || null : null;

  return (
    <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-65px)]">
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

      {/* Left panel — collapsible on desktop */}
      <section
        className={`bg-surface flex flex-col overflow-hidden border-r border-outline-variant/20 transition-all duration-300 ${
          panelCollapsed ? "lg:w-0 lg:min-w-0 lg:overflow-hidden" : "lg:w-[420px] lg:min-w-[420px]"
        } ${mobileView === "map" ? "hidden lg:flex" : "flex"} w-full`}
      >
        {/* My Plan — sticky top */}
        {planSlugs.length > 0 && !panelCollapsed && (
          <div className="bg-primary/5 border-b border-primary/10 shrink-0">
            <button onClick={() => setPlanOpen(!planOpen)}
              className="w-full flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">checklist</span>
                <span className="text-sm font-bold text-primary">My Plan</span>
                <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{planSlugs.length}</span>
              </div>
              <span className={`material-symbols-outlined text-sm text-primary transition-transform ${planOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
            </button>
            {planOpen && (
              <div className="px-5 pb-4 space-y-2">
                {planItems.map((item, i) => (
                  <div key={item.slug} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-grow">
                      <p className="text-sm font-bold text-primary truncate">{item.name}</p>
                      <p className="text-[10px] text-secondary">{item.village} · Stage {item.trailStage}</p>
                    </div>
                    <button onClick={() => togglePlan(item.slug)} className="text-secondary hover:text-red-500 shrink-0">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                <button onClick={() => setPlanSlugs([])} className="text-xs text-secondary hover:text-primary transition-colors">Clear plan</button>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {!panelCollapsed && (
          <div className="bg-surface px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-xl font-bold text-primary">Explore</h2>
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
        )}

        {/* Cards list */}
        {!panelCollapsed && (
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
                const inPlan = planSlugs.includes(acc.slug);
                return (
                  <div key={acc.slug}
                    className={`bg-white rounded-xl overflow-hidden border transition-all ${
                      selectedSlug === acc.slug ? "border-primary shadow-md" : inPlan ? "border-primary/30" : "border-outline-variant/10 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex h-[110px]">
                      {/* Image */}
                      <Link href={`/property/${acc.slug}`} className="w-28 shrink-0 overflow-hidden">
                        <img className="w-full h-full object-cover" alt={acc.name} src={acc.image} />
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
                            {inPlan ? "Planned" : "Plan"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setPanelCollapsed(!panelCollapsed)}
        className="hidden lg:flex items-center justify-center w-6 bg-surface-container-high hover:bg-surface-container-highest border-r border-outline-variant/20 transition-colors shrink-0"
        aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}
      >
        <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${panelCollapsed ? "" : "rotate-180"}`}>
          chevron_left
        </span>
      </button>

      {/* Map */}
      <section
        className={`flex-grow relative ${mobileView === "list" ? "hidden lg:block" : "block"}`}
        style={mobileView === "map" ? { height: "calc(100vh - 65px - 49px)" } : undefined}
      >
        <TrailMap
          properties={filteredMapProperties}
          activeSlug={selectedSlug || undefined}
          onMarkerClick={(slug) => setSelectedSlug((prev) => (prev === slug ? null : slug))}
        />

        {/* Centered property popup */}
        {selectedProperty && selectedMapProp && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] overflow-hidden max-w-sm w-full pointer-events-auto">
              <div className="relative">
                <img src={selectedProperty.image} alt={selectedProperty.name} className="w-full h-40 object-cover" />
                <button onClick={() => setSelectedSlug(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-white">
                  <span className="material-symbols-outlined text-sm text-secondary">close</span>
                </button>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-white/90 backdrop-blur text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">{selectedProperty.typeLabel}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-headline text-lg font-bold text-primary mb-1">{selectedProperty.name}</h3>
                <p className="text-xs text-secondary flex items-center gap-1 mb-3">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {selectedMapProp.village} · Stage {selectedProperty.trailStage}
                </p>
                {selectedProperty.description && (
                  <p className="text-xs text-secondary/80 line-clamp-3 mb-4">{selectedProperty.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <Link href={`/property/${selectedProperty.slug}`}
                    className="flex-grow bg-primary text-white py-2.5 rounded-full text-sm font-bold text-center hover:bg-primary-container transition-colors">
                    View Details
                  </Link>
                  <button onClick={() => togglePlan(selectedProperty.slug)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      planSlugs.includes(selectedProperty.slug) ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/30 text-secondary hover:border-primary hover:text-primary"
                    }`}>
                    <span className="material-symbols-outlined text-lg">
                      {planSlugs.includes(selectedProperty.slug) ? "check" : "add"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
