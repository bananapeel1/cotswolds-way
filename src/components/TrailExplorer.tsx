"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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

// Simple opening hours checker — handles common OSM formats
function isOpenNow(hoursStr: string | undefined): boolean | null {
  if (!hoursStr) return null; // unknown
  if (hoursStr === "24/7") return true;

  const now = new Date();
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const currentDay = dayNames[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Parse rules like "Mo-Fr 09:00-17:00; Sa 10:00-16:00"
  const rules = hoursStr.split(";").map((r) => r.trim());
  for (const rule of rules) {
    const match = rule.match(/^([A-Za-z, -]+)\s+(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
    if (!match) continue;

    const dayPart = match[1];
    const openMin = parseInt(match[2]) * 60 + parseInt(match[3]);
    const closeMin = parseInt(match[4]) * 60 + parseInt(match[5]);

    // Check if current day is in the day range
    const dayRanges = dayPart.split(",").map((d) => d.trim());
    let dayMatch = false;
    for (const range of dayRanges) {
      if (range.includes("-")) {
        const [start, end] = range.split("-").map((d) => d.trim());
        const startIdx = dayNames.indexOf(start);
        const endIdx = dayNames.indexOf(end);
        if (startIdx === -1 || endIdx === -1) continue;
        const currentIdx = dayNames.indexOf(currentDay);
        if (startIdx <= endIdx) {
          dayMatch = currentIdx >= startIdx && currentIdx <= endIdx;
        } else {
          dayMatch = currentIdx >= startIdx || currentIdx <= endIdx;
        }
      } else {
        dayMatch = range === currentDay;
      }
      if (dayMatch) break;
    }

    if (dayMatch && currentMinutes >= openMin && currentMinutes < closeMin) {
      return true;
    }
  }

  return false;
}

function formatDistance(meters: number): string {
  if (meters < 100) return "On trail";
  if (meters < 1000) return `${meters}m off trail`;
  return `${(meters / 1000).toFixed(1)}km off trail`;
}

type SortMode = "distance" | "north-south";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const [hoveredPoiId, setHoveredPoiId] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

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

  const visiblePois = useMemo(() => {
    let filtered = pois.filter((p) => activeTypes.includes(p.type));

    // Stage filter
    if (stageFilter) {
      const range = STAGE_RANGES.find((s) => s.stage === stageFilter);
      if (range) filtered = filtered.filter((p) => p.latitude >= range.minLat && p.latitude <= range.maxLat);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Open now filter
    if (openNowFilter) {
      filtered = filtered.filter((p) => {
        const status = isOpenNow(p.tags.opening_hours);
        return status === true || status === null; // show open + unknown
      });
    }

    // Sort
    if (sortMode === "distance") {
      filtered.sort((a, b) => a.distanceFromTrail - b.distanceFromTrail);
    } else {
      filtered.sort((a, b) => b.latitude - a.latitude); // north first
    }

    return filtered;
  }, [pois, activeTypes, stageFilter, searchQuery, openNowFilter, sortMode]);

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
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === hoveredPoiId) {
        el.style.transform = "scale(1.35)";
        el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.3)";
        el.style.zIndex = "20";
      } else {
        el.style.transform = "scale(1)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
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

    const toRender = visiblePois.slice(0, 500);
    for (const poi of toRender) {
      const layerConfig = layers.find((l) => l.types.includes(poi.type));
      if (!layerConfig) continue;

      const iconName = POI_MATERIAL_ICONS[poi.type] || "location_on";
      const el = document.createElement("div");
      el.style.cssText = `width:30px;height:30px;background:white;border:2px solid ${layerConfig.color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s`;
      el.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;color:${layerConfig.color};font-variation-settings:'FILL' 1">${iconName}</span>`;

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
    if (stageFilter) {
      const range = STAGE_RANGES.find((s) => s.stage === stageFilter);
      if (range) map.current.fitBounds([[-2.45, range.minLat - 0.01], [-1.75, range.maxLat + 0.01]], { padding: 40, duration: 1000 });
    } else {
      map.current.flyTo({ center: TRAIL_CENTER, zoom: 9, pitch: 15, duration: 1000 });
    }
  }, [stageFilter, mapReady]);

  const toggleLayer = (layerId: string) => { setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, enabled: !l.enabled } : l))); };
  const flyTo = (poi: POI) => { map.current?.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15, pitch: 30, duration: 800 }); };

  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + (openNowFilter ? 1 : 0) + (stageFilter ? 1 : 0);

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

        {/* Search box */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search POIs…"
              className="w-full pl-9 pr-8 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-primary/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Stage filter */}
        <div className="px-5 py-2 border-b border-outline-variant/10 shrink-0">
          <div className="relative">
            <button onClick={() => setStageOpen(!stageOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 text-sm text-primary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary">route</span>
                <span className="truncate">{stageFilter ? `Stage ${stageFilter}: ${STAGE_RANGES[stageFilter - 1]?.label}` : "Full trail"}</span>
              </div>
              <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${stageOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
            </button>
            {stageOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-outline-variant/20 py-1 z-30 max-h-72 overflow-y-auto">
                <button onClick={() => { setStageFilter(null); setStageOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high ${!stageFilter ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>Full trail</button>
                {STAGE_RANGES.map((s) => (
                  <button key={s.stage} onClick={() => { setStageFilter(s.stage); setStageOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high ${stageFilter === s.stage ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>
                    Stage {s.stage}: {s.label}
                  </button>
                ))}
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

          {/* Open Now toggle + Sort */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setOpenNowFilter(!openNowFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                openNowFilter ? "bg-primary text-white" : "text-secondary bg-surface-container-high hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              Open now
            </button>

            <button
              onClick={() => setSortMode(sortMode === "distance" ? "north-south" : "distance")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-secondary bg-surface-container-high hover:bg-surface-container-highest transition-all"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              {sortMode === "distance" ? "Nearest" : "N → S"}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setOpenNowFilter(false); setStageFilter(null); }}
                className="ml-auto text-[10px] font-bold text-secondary hover:text-primary transition-colors"
              >
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
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
            Object.entries(poisByType).map(([type, typePois]) => {
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
                  {typePois.slice(0, 30).map((poi) => (
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
                        <p className="text-[10px] text-secondary mt-0.5">{formatDistance(poi.distanceFromTrail)}</p>
                      </div>
                      <span className="material-symbols-outlined text-xs text-secondary shrink-0">chevron_right</span>
                    </button>
                  ))}
                  {typePois.length > 30 && <p className="px-5 py-2 text-[10px] text-secondary">+ {typePois.length - 30} more</p>}
                </div>
              );
            })
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
