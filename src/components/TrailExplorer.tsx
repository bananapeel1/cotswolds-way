"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { VILLAGES, type PlannedAccommodation } from "@/lib/plan-engine";
import { usePlanStorage } from "@/hooks/usePlanStorage";

interface POI {
  id: number;
  type: string;
  category: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number;
  tags: Record<string, string>;
}

interface LayerConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  types: string[];
  enabled: boolean;
}

const TRAIL_CENTER: [number, number] = [-2.07, 51.75];

const INITIAL_LAYERS: LayerConfig[] = [
  { id: "food",      label: "Pubs & Food",   icon: "restaurant",     color: "#92400e", types: ["pub", "cafe", "restaurant"], enabled: true },
  { id: "water",     label: "Water",         icon: "water_drop",     color: "#0369a1", types: ["water"],                     enabled: true },
  { id: "toilets",   label: "Toilets",       icon: "wc",             color: "#7c3aed", types: ["toilets"],                   enabled: true },
  { id: "transport", label: "Transport",     icon: "directions_bus", color: "#0f766e", types: ["bus_stop", "train"],         enabled: false },
  { id: "services",  label: "Shops",         icon: "store",          color: "#be185d", types: ["shop", "atm", "pharmacy", "post_office"], enabled: false },
  { id: "parking",   label: "Parking",       icon: "local_parking",  color: "#4338ca", types: ["parking"],                  enabled: false },
  { id: "outdoors",  label: "Views",         icon: "landscape",      color: "#15803d", types: ["viewpoint", "picnic", "campsite"], enabled: false },
  { id: "facilities",label: "Other",         icon: "church",         color: "#78716c", types: ["church"],                   enabled: false },
];

const STAGE_RANGES = [
  { stage: 1, label: "Chipping Campden → Stanton", minLat: 52.02, maxLat: 52.06 },
  { stage: 2, label: "Stanton → Cleeve Hill", minLat: 51.93, maxLat: 52.02 },
  { stage: 3, label: "Cleeve Hill → Birdlip", minLat: 51.82, maxLat: 51.94 },
  { stage: 4, label: "Birdlip → Painswick", minLat: 51.78, maxLat: 51.83 },
  { stage: 5, label: "Painswick → King's Stanley", minLat: 51.72, maxLat: 51.79 },
  { stage: 6, label: "King's Stanley → Wotton", minLat: 51.63, maxLat: 51.73 },
  { stage: 7, label: "Wotton → Tormarton", minLat: 51.50, maxLat: 51.64 },
  { stage: 8, label: "Tormarton → Bath", minLat: 51.37, maxLat: 51.51 },
];

const POI_MATERIAL_ICONS: Record<string, string> = {
  pub: "sports_bar", cafe: "coffee", restaurant: "restaurant",
  water: "water_drop", toilets: "wc", parking: "local_parking",
  bus_stop: "directions_bus", train: "train",
  shop: "shopping_bag", atm: "payments", pharmacy: "medical_services", post_office: "mail",
  church: "church", viewpoint: "visibility", picnic: "deck", campsite: "camping",
};

function formatDistance(meters: number): string {
  if (meters < 100) return "On trail";
  if (meters < 1000) return `${meters}m off trail`;
  return `${(meters / 1000).toFixed(1)}km off trail`;
}

export default function TrailExplorer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const resizerRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<number, HTMLButtonElement>>(new Map());

  const [pois, setPois] = useState<POI[]>([]);
  const [layers, setLayers] = useState<LayerConfig[]>(INITIAL_LAYERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [mapReady, setMapReady] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("map");
  const [hoveredPoiId, setHoveredPoiId] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [dayFilter, setDayFilter] = useState<number | null>(null);

  // Shared plan from localStorage
  const { plan, hydrated } = usePlanStorage();

  interface WalkDay { day: number; from: string; to: string; minLat: number; maxLat: number; accommodation?: PlannedAccommodation; }

  const walkDays = useMemo(() => {
    if (!plan.stops.length) return [];
    const days: WalkDay[] = [];
    const dir = plan.direction;
    for (let i = 0; i < plan.stops.length; i++) {
      const stop = plan.stops[i];
      if (stop.restDay || stop.transfer) continue;
      const fromVillage = i === 0
        ? (dir === "north_to_south" ? "Chipping Campden" : "Bath")
        : plan.stops[i - 1].village;
      const toVillage = stop.village;

      const fromV = VILLAGES.find((v) => v.name === fromVillage);
      const toV = VILLAGES.find((v) => v.name === toVillage);
      if (!fromV || !toV) continue;

      const minLat = Math.min(fromV.lat, toV.lat) - 0.005;
      const maxLat = Math.max(fromV.lat, toV.lat) + 0.005;
      days.push({ day: stop.day, from: fromVillage, to: toVillage, minLat, maxLat, accommodation: stop.accommodation });
    }
    return days;
  }, [plan.stops, plan.direction]);

  // Per-type card limit: 15 on full trail view, unlimited when filtered
  const isFiltered = stageFilter !== null || dayFilter !== null;
  const cardLimit = isFiltered ? 100 : 15;

  // Track desktop breakpoint to avoid hydration mismatch
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Draggable resizer
  const isDragging = useRef(false);
  const handleMouseDown = useCallback(() => { isDragging.current = true; }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.max(280, Math.min(600, e.clientX));
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  // Resize map when panel width changes
  useEffect(() => {
    if (map.current) map.current.resize();
  }, [panelWidth]);

  // Fetch POIs
  useEffect(() => {
    fetch("/api/pois")
      .then((r) => r.json())
      .then((data) => {
        if (data.pois && Array.isArray(data.pois)) setPois(data.pois);
        else setError("Failed to load trail data");
      })
      .catch(() => setError("Network error — check your connection"))
      .finally(() => setLoading(false));
  }, []);

  const activeTypes = useMemo(() => layers.filter((l) => l.enabled).flatMap((l) => l.types), [layers]);

  // Types that get a tighter distance filter to reduce urban clutter
  const FOOD_TYPES = new Set(["pub", "cafe", "restaurant"]);
  const FOOD_MAX_DISTANCE = 800; // metres

  // Bath area (lat range) gets extra culling — too many urban cafes/pubs
  const BATH_MIN_LAT = 51.37;
  const BATH_MAX_LAT = 51.42;

  /** Score a POI by metadata richness — higher = more useful to walkers */
  function qualityScore(poi: POI): number {
    let score = 0;
    if (poi.tags.opening_hours) score += 3;
    if (poi.tags.website) score += 2;
    if (poi.tags.phone) score += 2;
    if (poi.tags.cuisine) score += 1;
    // Closer to trail = more relevant
    if (poi.distanceFromTrail < 200) score += 2;
    else if (poi.distanceFromTrail < 500) score += 1;
    return score;
  }

  const visiblePois = useMemo(() => {
    let filtered = pois.filter((p) => {
      if (!activeTypes.includes(p.type)) return false;
      // Tighter radius for food/drink
      if (FOOD_TYPES.has(p.type) && p.distanceFromTrail > FOOD_MAX_DISTANCE) return false;
      return true;
    });

    // In Bath area, keep only top 50% of food POIs by quality score
    const bathFood = filtered.filter((p) => FOOD_TYPES.has(p.type) && p.latitude >= BATH_MIN_LAT && p.latitude <= BATH_MAX_LAT);
    if (bathFood.length > 6) {
      bathFood.sort((a, b) => qualityScore(b) - qualityScore(a));
      const cutoff = Math.ceil(bathFood.length / 2);
      const toRemove = new Set(bathFood.slice(cutoff).map((p) => p.id));
      filtered = filtered.filter((p) => !toRemove.has(p.id));
    }

    if (stageFilter) {
      const range = STAGE_RANGES.find((s) => s.stage === stageFilter);
      if (range) filtered = filtered.filter((p) => p.latitude >= range.minLat && p.latitude <= range.maxLat);
    }

    if (dayFilter !== null && walkDays.length > 0) {
      const day = walkDays[dayFilter];
      if (day) filtered = filtered.filter((p) => p.latitude >= day.minLat && p.latitude <= day.maxLat);
    }

    filtered.sort((a, b) => a.distanceFromTrail - b.distanceFromTrail);

    return filtered;
  }, [pois, activeTypes, stageFilter, dayFilter, walkDays]);

  const poisByType = useMemo(() => {
    const groups: Record<string, POI[]> = {};
    for (const poi of visiblePois) {
      if (!groups[poi.type]) groups[poi.type] = [];
      groups[poi.type].push(poi);
    }
    return groups;
  }, [visiblePois]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: TRAIL_CENTER,
      zoom: 9,
      pitch: 15,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource("trail", { type: "geojson", data: "/data/cotswold-way.geojson" });
      map.current.addLayer({ id: "trail-glow", type: "line", source: "trail", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#154212", "line-width": 10, "line-opacity": 0.12 } });
      map.current.addLayer({ id: "trail-line", type: "line", source: "trail", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#154212", "line-width": 3.5, "line-dasharray": [3, 2] } });
      setMapReady(true);
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Highlight marker when hoveredPoiId changes
  // Style the inner circle element, NOT the marker root (which has Mapbox's translate3d)
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      const inner = el.firstElementChild as HTMLElement | null;
      if (!inner) return;
      if (id === hoveredPoiId) {
        inner.style.transform = "scale(1.35)";
        inner.style.boxShadow = "0 4px 14px rgba(0,0,0,0.3)";
        el.style.zIndex = "20";
      } else {
        inner.style.transform = "scale(1)";
        inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
        el.style.zIndex = "1";
      }
    });
  }, [hoveredPoiId]);

  // Highlight card when hoveredPoiId changes (from marker hover)
  useEffect(() => {
    if (hoveredPoiId) {
      const card = cardRefsMap.current.get(hoveredPoiId);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [hoveredPoiId]);

  // Render markers
  const renderMarkers = useCallback(() => {
    if (!map.current || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = new Map();

    for (const poi of visiblePois) {
      const layerConfig = layers.find((l) => l.types.includes(poi.type));
      if (!layerConfig) continue;

      const iconName = POI_MATERIAL_ICONS[poi.type] || "location_on";
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer";
      el.innerHTML = `<div style="width:30px;height:30px;background:white;border:2px solid ${layerConfig.color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s"><span class="material-symbols-outlined" style="font-size:16px;color:${layerConfig.color};font-variation-settings:'FILL' 1">${iconName}</span></div>`;

      // Hover handlers for marker → card highlight
      el.addEventListener("mouseenter", () => { setHoveredPoiId(poi.id); });
      el.addEventListener("mouseleave", () => { setHoveredPoiId(null); });

      const distLabel = formatDistance(poi.distanceFromTrail);
      const openingHours = poi.tags.opening_hours || null;
      const phone = poi.tags.phone || null;
      const website = poi.tags.website || null;
      let html = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 2px;min-width:160px">
        <div style="font-weight:700;font-size:13px;color:#154212;margin-bottom:2px">${poi.name}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:11px;color:#665d4e;text-transform:capitalize">${poi.type.replace("_", " ")}</span>
          <span style="font-size:10px;color:#92400e;font-weight:600">${distLabel}</span>
        </div>`;
      if (openingHours) html += `<div style="font-size:10px;color:#665d4e;margin-bottom:2px">Hours: ${openingHours}</div>`;
      if (phone) html += `<div style="font-size:10px"><a href="tel:${phone}" style="color:#154212">Tel: ${phone}</a></div>`;
      if (website) html += `<div style="font-size:10px;margin-top:2px"><a href="${website}" target="_blank" rel="noopener" style="color:#154212;font-weight:600">Visit website →</a></div>`;
      html += "</div>";

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: "240px" }).setHTML(html))
        .addTo(map.current!);

      markersRef.current.set(poi.id, marker);
    }
  }, [visiblePois, layers, mapReady]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    if (dayFilter !== null && walkDays[dayFilter]) {
      const day = walkDays[dayFilter];
      map.current.fitBounds([[-2.45, day.minLat - 0.01], [-1.75, day.maxLat + 0.01]], { padding: 40, duration: 1000 });
    } else if (stageFilter) {
      const range = STAGE_RANGES.find((s) => s.stage === stageFilter);
      if (range) map.current.fitBounds([[-2.45, range.minLat - 0.01], [-1.75, range.maxLat + 0.01]], { padding: 40, duration: 1000 });
    } else {
      map.current.flyTo({ center: TRAIL_CENTER, zoom: 9, pitch: 15, duration: 1000 });
    }
  }, [stageFilter, dayFilter, walkDays, mapReady]);

  const toggleLayer = (layerId: string) => { setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, enabled: !l.enabled } : l))); };
  const flyTo = (poi: POI) => { map.current?.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15, pitch: 30, duration: 800 }); };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">

      {/* Mobile toggle */}
      <div className="lg:hidden flex bg-surface border-b border-outline-variant/20 shrink-0">
        <button onClick={() => setMobileView("list")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${mobileView === "list" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}>
          <span className="material-symbols-outlined text-lg">list</span> POIs
        </button>
        <button onClick={() => setMobileView("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${mobileView === "map" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}>
          <span className="material-symbols-outlined text-lg">map</span> Map
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`bg-surface flex flex-col overflow-hidden shrink-0 ${mobileView === "map" ? "hidden lg:flex" : "flex"}`}
        style={{ width: isDesktop ? `${panelWidth}px` : undefined }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/10 shrink-0">
          <h1 className="font-headline font-bold text-xl text-primary mb-1">Trail Explorer</h1>
          <p className="text-xs text-secondary">
            {loading ? "Loading…" : `${visiblePois.length.toLocaleString()} points of interest`}
          </p>
        </div>

        {/* Stage filter */}
        <div className="px-5 py-3 border-b border-outline-variant/10 shrink-0">
          <div className="relative">
            <button onClick={() => setStageOpen(!stageOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 text-sm text-primary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary">route</span>
                <span className="truncate">{
                dayFilter !== null && walkDays[dayFilter]
                  ? `Day ${walkDays[dayFilter].day}: ${walkDays[dayFilter].from} → ${walkDays[dayFilter].to}`
                  : stageFilter ? `Stage ${stageFilter}: ${STAGE_RANGES[stageFilter - 1]?.label}`
                  : "Full trail"
              }</span>
              </div>
              <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${stageOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
            </button>
            {stageOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-outline-variant/20 py-1 z-30 max-h-80 overflow-y-auto">
                <button onClick={() => { setStageFilter(null); setDayFilter(null); setStageOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high ${!stageFilter && dayFilter === null ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>Full trail</button>

                <p className="px-4 pt-3 pb-1 text-[9px] font-bold text-secondary uppercase tracking-widest">Trail Stages</p>
                {STAGE_RANGES.map((s) => (
                  <button key={s.stage} onClick={() => { setStageFilter(s.stage); setDayFilter(null); setStageOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high ${stageFilter === s.stage && dayFilter === null ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>
                    Stage {s.stage}: {s.label}
                  </button>
                ))}

                <div className="border-t border-outline-variant/10 mt-1 pt-1">
                  <p className="px-4 pt-2 pb-1 text-[9px] font-bold text-tertiary uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">hiking</span> My Walk
                  </p>
                  {walkDays.length > 0 ? (
                    walkDays.map((wd, idx) => (
                      <button key={idx} onClick={() => { setDayFilter(idx); setStageFilter(null); setStageOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high ${dayFilter === idx ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>
                        Day {wd.day}: {wd.from} → {wd.to}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-xs text-secondary mb-1.5">Plan your walk to filter by day</p>
                      <Link href="/plan" onClick={() => setStageOpen(false)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-tertiary transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_forward</span> Create a plan
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Layer toggles + Open Now + Sort */}
        <div className="px-5 py-3 border-b border-outline-variant/10 shrink-0">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Layers</p>
          <div className="grid grid-cols-2 gap-1.5">
            {layers.map((layer) => (
              <button key={layer.id} onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  layer.enabled ? "text-white shadow-sm" : "text-secondary bg-surface-container-high hover:bg-surface-container-highest"
                }`}
                style={layer.enabled ? { backgroundColor: layer.color } : {}}>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{layer.icon}</span>
                {layer.label}
              </button>
            ))}
          </div>

        </div>

        {/* POI list */}
        <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-secondary">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span> Loading…
            </div>
          ) : error ? (
            <div className="px-5 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-red-400 mb-2 block">error</span>
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          ) : visiblePois.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2 block">search_off</span>
              <p className="text-sm font-bold text-primary mb-1">No POIs visible</p>
              <p className="text-xs text-secondary">Enable more layers or adjust filters</p>
            </div>
          ) : (
            <>
            {/* Your stay — shown when day filter is active */}
            {dayFilter !== null && walkDays[dayFilter]?.accommodation && (
              <div className="mx-5 mt-3 mb-2">
                <Link href={`/property/${walkDays[dayFilter].accommodation!.slug}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 hover:border-primary/30 transition-colors">
                  {walkDays[dayFilter].accommodation!.image && (
                    <img src={walkDays[dayFilter].accommodation!.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bed</span>
                      <span className="text-[9px] font-bold text-primary uppercase">Your stay tonight</span>
                    </div>
                    <p className="text-sm font-bold text-primary truncate">{walkDays[dayFilter].accommodation!.name}</p>
                    <p className="text-[10px] text-secondary capitalize">{walkDays[dayFilter].accommodation!.propertyType} · {walkDays[dayFilter].accommodation!.village}</p>
                  </div>
                  <span className="material-symbols-outlined text-sm text-primary shrink-0">chevron_right</span>
                </Link>
              </div>
            )}
            {Object.entries(poisByType).map(([type, typePois]) => {
              const layer = layers.find((l) => l.types.includes(type));
              return (
                <div key={type}>
                  <div className="px-5 py-2 bg-surface-container-low border-b border-outline-variant/10 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm" style={{ color: layer?.color, fontVariationSettings: "'FILL' 1" }}>{POI_MATERIAL_ICONS[type] || "location_on"}</span>
                        <span className="text-xs font-bold text-primary capitalize">{type.replace("_", " ")}s</span>
                      </div>
                      <span className="text-[10px] text-secondary font-bold">{typePois.length}</span>
                    </div>
                  </div>
                  {typePois.slice(0, cardLimit).map((poi) => {
                    const hours = poi.tags.opening_hours || null;
                    const cuisine = poi.tags.cuisine || null;
                    const phone = poi.tags.phone || null;
                    const website = poi.tags.website || null;
                    const hasExtra = hours || cuisine;
                    return (
                      <button
                        key={poi.id}
                        ref={(el) => { if (el) cardRefsMap.current.set(poi.id, el); else cardRefsMap.current.delete(poi.id); }}
                        onClick={() => flyTo(poi)}
                        onMouseEnter={() => setHoveredPoiId(poi.id)}
                        onMouseLeave={() => setHoveredPoiId(null)}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors text-left ${
                          hoveredPoiId === poi.id ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-primary truncate">{poi.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-secondary">{formatDistance(poi.distanceFromTrail)}</span>
                            {cuisine && <span className="text-[10px] text-secondary/70 truncate">· {cuisine.replace(/;/g, ", ")}</span>}
                          </div>
                          {hours && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[10px] text-secondary/60">schedule</span>
                              <span className="text-[10px] text-secondary/70 truncate">{hours}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {phone && (
                            <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded-full hover:bg-primary/10 transition-colors" title={phone}>
                              <span className="material-symbols-outlined text-sm text-secondary">call</span>
                            </a>
                          )}
                          {website && (
                            <a href={website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded-full hover:bg-primary/10 transition-colors" title="Website">
                              <span className="material-symbols-outlined text-sm text-secondary">open_in_new</span>
                            </a>
                          )}
                          <span className="material-symbols-outlined text-xs text-secondary">chevron_right</span>
                        </div>
                      </button>
                    );
                  })}
                  {typePois.length > cardLimit && <p className="px-5 py-2 text-[10px] text-secondary">+ {typePois.length - cardLimit} more</p>}
                </div>
              );
            })}
            </>
          )}
        </div>
      </div>

      {/* Draggable resizer — desktop only */}
      <div
        ref={resizerRef}
        onMouseDown={handleMouseDown}
        className="hidden lg:flex items-center justify-center w-2 bg-outline-variant/10 hover:bg-primary/20 cursor-col-resize transition-colors shrink-0 group"
      >
        <div className="w-1 h-8 rounded-full bg-outline-variant/40 group-hover:bg-primary/40 transition-colors" />
      </div>

      {/* Map */}
      <div className={`flex-1 min-h-0 min-w-0 relative ${mobileView === "list" ? "hidden lg:block" : "block"}`}>
        <div ref={mapContainer} className="w-full h-full" />

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-20">
            <span className="material-symbols-outlined animate-spin text-primary text-base">progress_activity</span>
            <span className="text-sm font-bold text-primary">Loading trail data…</span>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-20">
            <span className="material-symbols-outlined text-red-500 text-base">error</span>
            <span className="text-sm font-bold text-red-700">{error}</span>
          </div>
        )}

        {/* Mobile layer bar */}
        <div className="lg:hidden absolute bottom-6 left-4 right-4 z-20">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {layers.map((layer) => (
              <button key={layer.id} onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg transition-all ${
                  layer.enabled ? "text-white" : "bg-white text-secondary"
                }`}
                style={layer.enabled ? { backgroundColor: layer.color } : {}}>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{layer.icon}</span>
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
