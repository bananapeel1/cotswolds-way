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

type PropertyTypeFilter =
  | null
  | "hotel"
  | "inn"
  | "bnb"
  | "campsite"
  | "glamping"
  | "hostel";

const PROPERTY_TYPE_OPTIONS: { value: PropertyTypeFilter; label: string }[] = [
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
  { value: 1, label: "Stage 1: Chipping Campden to Stanton (16.5 km)" },
  { value: 2, label: "Stage 2: Stanton to Cleeve Hill (22.4 km)" },
  { value: 3, label: "Stage 3: Cleeve Hill to Birdlip (25.2 km)" },
  { value: 4, label: "Stage 4: Birdlip to Painswick (11.2 km)" },
  { value: 5, label: "Stage 5: Painswick to King's Stanley (15.4 km)" },
  { value: 6, label: "Stage 6: King's Stanley to Wotton-under-Edge (19.9 km)" },
  { value: 7, label: "Stage 7: Wotton-under-Edge to Tormarton (23.4 km)" },
  { value: 8, label: "Stage 8: Tormarton to Bath (26.9 km)" },
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

  // Filter state
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>(null);
  const [dogFriendly, setDogFriendly] = useState(false);
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [stageOpen, setStageOpen] = useState(false);

  // Plan state
  const [planSlugs, setPlanSlugs] = useState<string[]>([]);
  const [planOpen, setPlanOpen] = useState(true);

  const togglePlan = (slug: string) => {
    setPlanSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Count active filters
  const activeFilterCount = [
    propertyType !== null,
    dogFriendly,
    stageFilter !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPropertyType(null);
    setDogFriendly(false);
    setStageFilter(null);
  };

  // Filter accommodations
  const filtered = useMemo(() => {
    return accommodations.filter((acc) => {
      if (propertyType && acc.propertyType !== propertyType) return false;
      if (dogFriendly && !acc.isDogFriendly) return false;
      if (stageFilter && acc.trailStage !== stageFilter) return false;
      return true;
    });
  }, [accommodations, propertyType, dogFriendly, stageFilter]);

  // Filter map properties to match
  const filteredSlugs = useMemo(
    () => new Set(filtered.map((a) => a.slug)),
    [filtered]
  );
  const filteredMapProperties = useMemo(
    () => mapProperties.filter((p) => filteredSlugs.has(p.slug)),
    [mapProperties, filteredSlugs]
  );

  // Plan items in trail order
  const planItems = useMemo(
    () => accommodations.filter((a) => planSlugs.includes(a.slug)).sort((a, b) => (a.trailStage || 0) - (b.trailStage || 0)),
    [accommodations, planSlugs]
  );

  const selectedProperty = selectedSlug
    ? filtered.find((a) => a.slug === selectedSlug) || null
    : null;
  const selectedMapProp = selectedSlug
    ? filteredMapProperties.find((p) => p.slug === selectedSlug) || null
    : null;

  return (
    <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-65px)]">
      {/* Mobile view toggle */}
      <div className="md:hidden flex bg-surface border-b border-outline-variant/20">
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
            mobileView === "list"
              ? "text-primary border-b-2 border-primary"
              : "text-secondary"
          }`}
        >
          <span className="material-symbols-outlined text-lg">list</span>
          List
        </button>
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
            mobileView === "map"
              ? "text-primary border-b-2 border-primary"
              : "text-secondary"
          }`}
        >
          <span className="material-symbols-outlined text-lg">map</span>
          Map
        </button>
      </div>

      {/* Left: Scrollable List */}
      <section
        className={`w-full md:w-1/2 flex flex-col bg-surface overflow-hidden border-r border-outline-variant/20 ${
          mobileView === "map" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Filter Bar */}
        <div className="bg-surface px-4 sm:px-8 pt-6 sm:pt-8 pb-4 z-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-primary">
              Accommodations
            </h2>
            <span className="text-sm font-label text-secondary">
              {filtered.length} found
            </span>
          </div>

          {/* Stage selector */}
          <div className="relative mb-4">
            <button
              onClick={() => setStageOpen(!stageOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 text-sm font-body text-primary"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-secondary">route</span>
                {stageFilter
                  ? STAGE_OPTIONS.find((o) => o.value === stageFilter)?.label
                  : "Full trail"}
              </div>
              <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${stageOpen ? "rotate-180" : ""}`}>
                keyboard_arrow_down
              </span>
            </button>
            {stageOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 py-1 z-30 max-h-80 overflow-y-auto">
                {STAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setStageFilter(opt.value);
                      setStageOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-body hover:bg-surface-container-high transition-colors ${
                      stageFilter === opt.value
                        ? "text-primary font-bold bg-primary-fixed/30"
                        : "text-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Type Pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setPropertyType(opt.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  propertyType === opt.value
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-secondary-container/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Second row: Dog-friendly, Clear */}
          <div className="flex gap-2 items-center overflow-x-auto pb-3 no-scrollbar">
            <button
              onClick={() => setDogFriendly(!dogFriendly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                dogFriendly
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-secondary-container/50"
              }`}
            >
              <span className="material-symbols-outlined text-sm">pets</span>
              Dog-friendly
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap text-tertiary hover:bg-tertiary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {/* My Plan Panel */}
        {planSlugs.length > 0 && (
          <div className="mx-4 sm:mx-8 mb-4 bg-primary-fixed/20 rounded-xl border border-primary/10 overflow-hidden">
            <button
              onClick={() => setPlanOpen(!planOpen)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">checklist</span>
                <span className="text-sm font-bold text-primary">My Plan ({planSlugs.length})</span>
              </div>
              <span className={`material-symbols-outlined text-sm text-primary transition-transform ${planOpen ? "rotate-180" : ""}`}>
                keyboard_arrow_down
              </span>
            </button>
            {planOpen && (
              <div className="px-4 pb-3 space-y-2">
                {planItems.map((item) => (
                  <div key={item.slug} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-primary font-bold text-xs shrink-0">S{item.trailStage}</span>
                      <span className="text-primary truncate">{item.name}</span>
                    </div>
                    <button
                      onClick={() => togglePlan(item.slug)}
                      className="text-secondary hover:text-red-500 transition-colors shrink-0 ml-2"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPlanSlugs([])}
                  className="text-xs text-secondary hover:text-primary transition-colors mt-1"
                >
                  Clear plan
                </button>
              </div>
            )}
          </div>
        )}

        <div className="h-px mx-4 sm:mx-8 bg-outline-variant/20" />

        {/* Accommodation Cards */}
        <div className="px-4 sm:px-8 pb-12 space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar flex-grow pt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-secondary/30 mb-4">
                search_off
              </span>
              <h3 className="font-headline text-xl font-bold text-primary mb-2">
                No properties match your filters
              </h3>
              <p className="font-body text-sm text-secondary max-w-sm mb-6">
                Try adjusting your filters or clearing them to see all available
                accommodation along the Cotswold Way.
              </p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-label text-xs font-bold hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                Clear All Filters
              </button>
            </div>
          ) : (
            filtered.map((acc) => (
              <div
                key={acc.slug}
                className={`bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group border ${
                  selectedSlug === acc.slug
                    ? "border-primary ring-2 ring-primary/20"
                    : planSlugs.includes(acc.slug)
                      ? "border-primary/40"
                      : "border-outline-variant/10"
                }`}
              >
                <Link
                  href={`/property/${acc.slug}`}
                  className="flex flex-col sm:flex-row"
                >
                  <div className="w-full sm:w-48 h-48 relative shrink-0 overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={acc.name}
                      src={acc.image}
                    />
                    <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">
                        {acc.typeIcon}
                      </span>
                      {acc.typeLabel}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-grow">
                    <div>
                      <h4 className="font-headline text-lg font-bold text-primary mb-1">
                        {acc.name}
                      </h4>
                      <p className="text-xs text-secondary mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {acc.village || acc.urgency}
                        {acc.trailStage && <span className="ml-1">· Stage {acc.trailStage}</span>}
                      </p>
                      {acc.description && (
                        <p className="text-xs text-secondary/80 line-clamp-2 mb-3">{acc.description}</p>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-outline-variant/10">
                      <div className="flex items-center gap-3">
                        {acc.amenities.filter(a => a.active).slice(0, 3).map((amenity) => (
                          <span key={amenity.icon} className="material-symbols-outlined text-secondary text-sm">
                            {amenity.icon}
                          </span>
                        ))}
                      </div>
                      <span className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold">
                        View Stay
                      </span>
                    </div>
                  </div>
                </Link>
                {/* Add to plan button */}
                <div className="px-5 pb-4 -mt-1">
                  <button
                    onClick={(e) => { e.preventDefault(); togglePlan(acc.slug); }}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                      planSlugs.includes(acc.slug)
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-container-high text-secondary hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {planSlugs.includes(acc.slug) ? "check_circle" : "add_circle_outline"}
                    </span>
                    {planSlugs.includes(acc.slug) ? "In your plan" : "Add to plan"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Right: Interactive Map */}
      <section
        className={`w-full md:w-1/2 relative ${
          mobileView === "list" ? "hidden md:block" : "block"
        }`}
        style={
          mobileView === "map"
            ? { height: "calc(100vh - 65px - 49px)" }
            : undefined
        }
      >
        <TrailMap
          properties={filteredMapProperties}
          activeSlug={selectedSlug || undefined}
          onMarkerClick={(slug) => setSelectedSlug(prev => prev === slug ? null : slug)}
        />

        {/* Property Preview Card */}
        {selectedProperty && selectedMapProp && (
          <div className="absolute bottom-6 left-6 right-6 z-30 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden border border-outline-variant/10">
              <button
                onClick={() => setSelectedSlug(null)}
                className="absolute top-3 right-3 z-10 w-7 h-7 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <span className="material-symbols-outlined text-xs text-secondary">close</span>
              </button>
              <div className="flex">
                <div className="w-32 sm:w-40 shrink-0 overflow-hidden">
                  <img
                    src={selectedProperty.image}
                    alt={selectedProperty.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-grow min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="bg-primary/8 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">{selectedProperty.typeIcon}</span>
                        {selectedProperty.typeLabel}
                      </span>
                    </div>
                    <h3 className="font-headline text-base sm:text-lg font-bold text-primary truncate leading-tight">
                      {selectedProperty.name}
                    </h3>
                    <p className="text-[11px] text-secondary mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">location_on</span>
                      {selectedMapProp.village} · Stage {selectedProperty.trailStage}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlan(selectedProperty.slug); }}
                      className={`text-xs font-bold flex items-center gap-1 ${
                        planSlugs.includes(selectedProperty.slug) ? "text-primary" : "text-secondary hover:text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {planSlugs.includes(selectedProperty.slug) ? "check_circle" : "add_circle_outline"}
                      </span>
                      {planSlugs.includes(selectedProperty.slug) ? "In plan" : "Add to plan"}
                    </button>
                    <Link
                      href={`/property/${selectedProperty.slug}`}
                      className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                    >
                      View
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
