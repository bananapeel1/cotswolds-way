"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import TrailMap from "@/components/TrailMap";
import type { MapProperty } from "@/components/TrailMap";
import { usePlanStorage } from "@/hooks/usePlanStorage";
import { useWishlistStorage } from "@/hooks/useWishlistStorage";
import { villageToStages } from "@/lib/plan-engine";

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
  initialDay,
}: {
  accommodations: AccommodationCard[];
  mapProperties: MapProperty[];
  initialDay?: number;
}) {
  const { plan, setAccommodation, hydrated } = usePlanStorage();
  const { items: wishlistItems, addItem: addWishlistItem, removeItem: removeWishlistItem, clearWishlist, hydrated: wishlistHydrated } = useWishlistStorage();

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [panelWidth, setPanelWidth] = useState(420);
  const isDragging = useRef(false);
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  const showToast = useCallback((message: string, icon = "check_circle") => {
    setToast({ message, icon });
    setToastExiting(false);
    setTimeout(() => setToastExiting(true), 2000);
    setTimeout(() => { setToast(null); setToastExiting(false); }, 2300);
  }, []);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const [planOpen, setPlanOpen] = useState(true);

  // Scroll selected card to the top of the list
  useEffect(() => {
    if (!selectedSlug) return;
    const card = cardRefs.current.get(selectedSlug);
    const list = listRef.current;
    if (!card || !list) return;
    const targetTop = card.offsetTop - list.offsetTop - 8;
    const startTop = list.scrollTop;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 2) return;
    const duration = 300;
    const start = performance.now();
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      list!.scrollTop = startTop + distance * ease(progress);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [selectedSlug]);

  const handleMouseDown = useCallback(() => { isDragging.current = true; }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) setPanelWidth(Math.max(300, Math.min(600, e.clientX))); };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

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

  // Plan-aware data
  const hasPlan = plan.stops.length > 0;
  const nightStops = useMemo(() =>
    plan.stops.filter(s => !s.restDay).slice(0, -1),
    [plan.stops]
  );
  const bookedNights = useMemo(() => nightStops.filter(s => s.accommodation).length, [nightStops]);
  const planSlugs = useMemo(() =>
    plan.stops.filter(s => s.accommodation).map(s => s.accommodation!.slug),
    [plan.stops]
  );
  const plannedSlugSet = useMemo(() => new Set(planSlugs), [planSlugs]);
  const wishlistSlugSet = useMemo(() => new Set(wishlistItems.map(i => i.slug)), [wishlistItems]);

  // Stage-based matching: find unbooked nights whose village stage overlaps the accommodation's stage
  const getMatchingNights = useCallback((acc: AccommodationCard) => {
    if (!acc.trailStage) return [];
    return nightStops.filter(s => {
      if (s.accommodation) return false;
      const stages = villageToStages(s.village);
      return stages.includes(acc.trailStage!);
    });
  }, [nightStops]);

  const assignAccommodation = useCallback((day: number, acc: AccommodationCard) => {
    setAccommodation(day, {
      slug: acc.slug,
      name: acc.name,
      village: acc.village || "",
      propertyType: acc.propertyType,
      image: acc.image,
    });
    showToast(`${acc.name} booked for Night ${day}`, "bed");
  }, [setAccommodation, showToast]);

  const toggleWishlist = useCallback((acc: AccommodationCard) => {
    if (wishlistSlugSet.has(acc.slug)) {
      removeWishlistItem(acc.slug);
    } else {
      addWishlistItem({
        slug: acc.slug,
        name: acc.name,
        village: acc.village || "",
        propertyType: acc.propertyType,
        image: acc.image,
      });
    }
  }, [wishlistSlugSet, addWishlistItem, removeWishlistItem]);

  const [highlightDay, setHighlightDay] = useState<number | null>(initialDay ?? null);
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

  if (!hydrated || !wishlistHydrated) {
    return (
      <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-65px)]">
        <section className="w-full lg:w-[420px] p-4 space-y-3 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-28 h-[120px] skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2.5 py-3">
                <div className="h-4 w-3/4 skeleton-shimmer" />
                <div className="h-3 w-1/2 skeleton-shimmer" />
                <div className="h-3 w-2/3 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </section>
        <div className="flex-1 bg-surface-container-low" />
      </main>
    );
  }

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
        {/* Top panel — My Plan / Wishlist / Prompt */}
        <div className="bg-topo bg-primary/5 border-b border-primary/10 shrink-0">
          {hasPlan ? (
            <>
              <button onClick={() => setPlanOpen(!planOpen)}
                className="w-full flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>hiking</span>
                  <span className="text-sm font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>My Plan</span>
                  <span className="text-[10px] font-bold text-secondary bg-secondary/8 rounded-full px-2 py-0.5">{bookedNights}/{nightStops.length} nights</span>
                </div>
                <span className={`material-symbols-outlined text-sm text-primary transition-transform ${planOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
              </button>
              {planOpen && (
                <div className="px-5 pb-4 relative">
                  {/* Timeline connecting line */}
                  <div className="absolute left-[36px] top-0 bottom-16 w-0.5 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

                  <div className="space-y-0.5">
                    {nightStops.map((stop) => {
                      const isHighlighted = highlightDay === stop.day;
                      return (
                        <div key={stop.day} className="relative flex items-start gap-3 py-1.5">
                          {/* Day circle */}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                            stop.accommodation
                              ? "btn-primary-gradient text-white shadow-ambient"
                              : isHighlighted
                                ? "bg-accent text-white shadow-ambient"
                                : "border-2 border-primary/25 text-primary bg-surface"
                          }`}>
                            {stop.day}
                          </div>
                          {/* Content */}
                          <div className={`flex-1 min-w-0 rounded-xl p-2.5 transition-all ${
                            stop.accommodation ? "bg-white shadow-ambient" : isHighlighted ? "bg-accent-soft" : "bg-surface-container-low/60"
                          }`}>
                            {stop.accommodation ? (
                              <div className="flex items-center gap-2.5">
                                {stop.accommodation.image && (
                                  <img src={stop.accommodation.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="min-w-0 flex-grow">
                                  <p className="text-xs font-bold text-primary truncate">{stop.accommodation.name}</p>
                                  <p className="text-[9px] text-secondary">{stop.village}</p>
                                </div>
                                <button onClick={() => { setAccommodation(stop.day, null); showToast("Stay removed", "delete"); }}
                                  className="text-secondary hover:text-red-500 shrink-0 p-1 rounded-full hover:bg-red-50 transition-colors" title="Remove stay">
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  // Use villageToStages for reliable stage lookup
                                  const stages = villageToStages(stop.village);
                                  if (stages.length > 0) {
                                    setStageFilter(stages[0]);
                                  } else {
                                    // Fallback: try matching via accommodation data
                                    const match = accommodations.find(a => a.village === stop.village);
                                    if (match?.trailStage) setStageFilter(match.trailStage);
                                    else setStageFilter(null); // show all if no match
                                  }
                                  setHighlightDay(stop.day);
                                }}
                                className="w-full flex items-center gap-2 text-left"
                              >
                                <span className="text-xs text-secondary truncate flex-1">{stop.village}</span>
                                <span className="text-[11px] font-bold text-accent bg-accent/10 rounded-full px-2.5 py-1 whitespace-nowrap">Find stay</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 px-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-secondary">{bookedNights} of {nightStops.length} nights booked</span>
                      {bookedNights === nightStops.length && nightStops.length > 0 && (
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1 animate-scale-in">
                          <span className="material-symbols-outlined text-xs">celebration</span>
                          All booked!
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary to-primary-container"
                        style={{ width: `${nightStops.length > 0 ? (bookedNights / nightStops.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : wishlistItems.length > 0 ? (
            <>
              <button onClick={() => setPlanOpen(!planOpen)}
                className="w-full flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  <span className="text-sm font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>My Wishlist</span>
                  <span className="text-[10px] font-bold text-secondary bg-secondary/8 rounded-full px-2 py-0.5">{wishlistItems.length} saved</span>
                </div>
                <span className={`material-symbols-outlined text-sm text-primary transition-transform ${planOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
              </button>
              {planOpen && (
                <div className="px-5 pb-4 space-y-1.5">
                  {wishlistItems.map((item) => (
                    <div key={item.slug} className="flex items-center gap-2.5 bg-white shadow-ambient rounded-xl px-3 py-2.5">
                      {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-bold text-primary truncate">{item.name}</p>
                        <p className="text-[9px] text-secondary capitalize">{item.village} · {item.propertyType}</p>
                      </div>
                      <button onClick={() => { removeWishlistItem(item.slug); showToast("Removed from wishlist", "heart_broken"); }}
                        className="text-secondary hover:text-red-500 shrink-0 p-1 rounded-full hover:bg-red-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2">
                    <Link href="/plan"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-accent rounded-full px-4 py-2 shadow-ambient hover:shadow-card transition-all">
                      <span className="material-symbols-outlined text-sm">auto_awesome</span> Build a plan from these
                    </Link>
                    <button onClick={clearWishlist} className="text-[10px] text-secondary hover:text-red-500 transition-colors">Clear</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>hiking</span>
                <span className="text-sm font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>My Plan</span>
              </div>
              <p className="text-xs text-secondary mb-3">Plan your walk to assign stays, or save favourites below</p>
              <Link href="/plan" className="inline-flex items-center gap-1.5 text-xs font-bold text-white btn-primary-gradient rounded-full px-4 py-2 shadow-ambient hover:shadow-card transition-all">
                <span className="material-symbols-outlined text-sm">arrow_forward</span> Create a plan
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-surface px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bed</span>Stays
            </h2>
            <span className="text-xs font-label text-secondary">{filtered.length} stays</span>
          </div>

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
        <div ref={listRef} className="px-4 pb-8 space-y-3 overflow-y-auto no-scrollbar flex-grow pt-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-secondary/20 mb-3">search_off</span>
              <p className="text-sm font-bold text-primary mb-1">No matches</p>
              <p className="text-xs text-secondary mb-4">Try adjusting your filters</p>
              <button onClick={clearFilters} className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold">Clear Filters</button>
            </div>
          ) : (
            filtered.map((acc) => {
              const isPlanned = plannedSlugSet.has(acc.slug);
              const plannedStop = isPlanned ? plan.stops.find(s => s.accommodation?.slug === acc.slug) : null;
              const matchingNights = hasPlan ? getMatchingNights(acc) : [];
              const isWishlisted = wishlistSlugSet.has(acc.slug);
              return (
                <div key={acc.slug}
                  ref={(el) => { if (el) cardRefs.current.set(acc.slug, el); else cardRefs.current.delete(acc.slug); }}
                  onClick={() => setSelectedSlug((prev) => (prev === acc.slug ? null : acc.slug))}
                  className={`bg-white rounded-xl overflow-hidden border transition-all cursor-pointer card-press ${
                    selectedSlug === acc.slug ? "border-primary shadow-card-hover border-l-4" : isPlanned ? "border-primary/30 shadow-card" : isWishlisted ? "border-accent/30 shadow-card" : "border-outline-variant/10 shadow-ambient card-hover-lift"
                  }`}
                >
                  <div className="flex min-h-[120px]">
                    <Link href={`/property/${acc.slug}`} className="w-28 shrink-0 overflow-hidden relative">
                      <img className="w-full h-full object-cover" alt={acc.name} src={acc.image} />
                      {plannedStop && (
                        <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          Night {plannedStop.day}
                        </span>
                      )}
                    </Link>
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
                        {isPlanned ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Night {plannedStop?.day}
                          </span>
                        ) : hasPlan && matchingNights.length === 1 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); assignAccommodation(matchingNights[0].day, acc); }}
                            className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">add_circle_outline</span>
                            Night {matchingNights[0].day}
                          </button>
                        ) : hasPlan && matchingNights.length > 1 ? (
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { if (e.target.value) assignAccommodation(parseInt(e.target.value), acc); }}
                            defaultValue=""
                            className="text-[11px] font-bold text-secondary bg-transparent cursor-pointer"
                          >
                            <option value="" disabled>+ Add to night...</option>
                            {matchingNights.map(s => (
                              <option key={s.day} value={s.day}>Night {s.day}</option>
                            ))}
                          </select>
                        ) : !hasPlan ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWishlist(acc); }}
                            className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${isWishlisted ? "text-tertiary" : "text-secondary hover:text-tertiary"}`}
                          >
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                            {isWishlisted ? "Saved" : "Save"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Draggable resizer */}
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

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-2xl shadow-toast flex items-center gap-2 text-sm font-bold ${toastExiting ? "animate-toast-out" : "animate-toast-in"}`}>
          <span className="material-symbols-outlined text-base">{toast.icon}</span>
          {toast.message}
        </div>
      )}
    </main>
  );
}
