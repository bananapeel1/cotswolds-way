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
  shortDescription?: string;
  isDogFriendly?: boolean;
  dayOnTrail?: number | null;
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

const DAY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Any" },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `Day ${i + 1}`,
  })),
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
  const [dayOnTrail, setDayOnTrail] = useState<number | null>(null);
  const [dayOpen, setDayOpen] = useState(false);

  // Count active filters
  const activeFilterCount = [
    propertyType !== null,
    dogFriendly,
    dayOnTrail !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPropertyType(null);
    setDogFriendly(false);
    setDayOnTrail(null);
  };

  // Filter accommodations
  const filtered = useMemo(() => {
    return accommodations.filter((acc) => {
      if (propertyType && acc.propertyType !== propertyType) return false;
      if (dogFriendly && !acc.isDogFriendly) return false;
      if (dayOnTrail && acc.dayOnTrail !== dayOnTrail) return false;
      return true;
    });
  }, [accommodations, propertyType, dogFriendly, dayOnTrail]);

  // Filter map properties to match
  const filteredSlugs = useMemo(
    () => new Set(filtered.map((a) => a.slug)),
    [filtered]
  );
  const filteredMapProperties = useMemo(
    () => mapProperties.filter((p) => filteredSlugs.has(p.slug)),
    [mapProperties, filteredSlugs]
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-primary">
              Accommodations
            </h2>
            <span className="text-sm font-label text-secondary">
              {filtered.length} properties found
            </span>
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

          {/* Second row: Budget, Dog-friendly, Day on Trail, Clear */}
          <div className="flex gap-2 items-center overflow-x-auto pb-3 no-scrollbar">
            {/* Dog-friendly toggle */}
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

            {/* Day on Trail dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setDayOpen(!dayOpen);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  dayOnTrail !== null
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-secondary-container/50"
                }`}
              >
                {dayOnTrail ? `Day ${dayOnTrail}` : "Day on Trail"}
                <span className="material-symbols-outlined text-sm">
                  keyboard_arrow_down
                </span>
              </button>
              {dayOpen && (
                <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/20 py-1 z-30 min-w-[120px] max-h-60 overflow-y-auto">
                  {DAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setDayOnTrail(opt.value);
                        setDayOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-body hover:bg-surface-container-high transition-colors ${
                        dayOnTrail === opt.value
                          ? "text-primary font-bold"
                          : "text-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active filter count + Clear */}
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

          <div className="h-px w-full bg-outline-variant/20 mt-2" />
        </div>

        {/* Accommodation Cards */}
        <div className="px-4 sm:px-8 pb-12 space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar flex-grow">
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
                className="flex items-center gap-2 bg-tertiary text-on-tertiary px-5 py-2.5 rounded-lg font-label text-xs font-bold uppercase tracking-widest hover:bg-tertiary-container transition-all"
              >
                <span className="material-symbols-outlined text-sm">
                  filter_alt_off
                </span>
                Clear All Filters
              </button>
            </div>
          ) : (
            filtered.map((acc) => (
              <Link
                href={`/property/${acc.slug}`}
                key={acc.slug}
                className={`bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-shadow group border block ${
                  selectedSlug === acc.slug
                    ? "border-tertiary ring-2 ring-tertiary/20"
                    : "border-outline-variant/10"
                }`}
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
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-headline text-xl font-bold text-primary">
                        {acc.name}
                      </h4>
                      {acc.rating && (
                        <div className="flex items-center text-tertiary">
                          <span className="material-symbols-outlined text-sm filled">
                            star
                          </span>
                          <span className="text-sm font-bold ml-1">
                            {acc.rating}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-label text-secondary uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-xs">
                        {acc.distanceIcon}
                      </span>
                      {acc.distance}
                    </p>
                    <div className="flex gap-4 mb-4">
                      {acc.amenities.map((amenity) => (
                        <div
                          key={amenity.icon}
                          className="group/icon relative cursor-help"
                        >
                          <span
                            className={`material-symbols-outlined text-secondary ${
                              !amenity.active
                                ? "opacity-30"
                                : "hover:text-primary"
                            } transition-colors`}
                          >
                            {amenity.icon}
                          </span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/icon:block bg-primary text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {amenity.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-outline-variant/10 pt-4">
                    <p
                      className={`text-[10px] ${acc.urgencyColor} font-bold uppercase tracking-tighter`}
                    >
                      {acc.urgency}
                    </p>
                    <span className="bg-primary text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-primary-container transition-colors">
                      View Stay
                    </span>
                  </div>
                </div>
              </Link>
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
            <Link
              href={`/property/${selectedProperty.slug}`}
              className="block bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden border border-outline-variant/10 hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-shadow"
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSlug(null); }}
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
                      {selectedMapProp.rating && (
                        <div className="flex items-center gap-0.5 text-tertiary">
                          <span className="material-symbols-outlined text-xs filled">star</span>
                          <span className="text-xs font-bold">{selectedMapProp.rating}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-headline text-base sm:text-lg font-bold text-primary truncate leading-tight">
                      {selectedProperty.name}
                    </h3>
                    <p className="text-[11px] text-secondary mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">location_on</span>
                      {selectedMapProp.village} · Day {selectedMapProp.dayOnTrail}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      {selectedProperty.amenities.filter(a => a.active).slice(0, 3).map((a) => (
                        <span key={a.icon} className="material-symbols-outlined text-secondary text-sm">{a.icon}</span>
                      ))}
                    </div>
                    <span className="bg-tertiary text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                      View
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
