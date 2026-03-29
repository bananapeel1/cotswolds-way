"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Types ──────────────────────────────────────────────────────────────────

interface POI {
  id: number;
  type: string;
  category: string;
  name: string;
  latitude: number;
  longitude: number;
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

// ─── Constants ──────────────────────────────────────────────────────────────

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

const STAGE_RANGES: { stage: number; label: string; minLat: number; maxLat: number }[] = [
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function TrailExplorer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [pois, setPois] = useState<POI[]>([]);
  const [layers, setLayers] = useState<LayerConfig[]>(INITIAL_LAYERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ── Fetch POIs ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/pois")
      .then((r) => r.json())
      .then((data) => {
        if (data.pois && Array.isArray(data.pois)) {
          setPois(data.pois);
        } else {
          setError("Failed to load trail data");
        }
      })
      .catch(() => setError("Network error — check your connection"))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────

  const activeTypes = useMemo(
    () => layers.filter((l) => l.enabled).flatMap((l) => l.types),
    [layers]
  );

  const visiblePois = useMemo(() => {
    let filtered = pois.filter((p) => activeTypes.includes(p.type));
    if (stageFilter) {
      const range = STAGE_RANGES.find((s) => s.stage === stageFilter);
      if (range) {
        filtered = filtered.filter((p) => p.latitude >= range.minLat && p.latitude <= range.maxLat);
      }
    }
    return filtered;
  }, [pois, activeTypes, stageFilter]);

  // Group POIs by type for the sidebar list
  const poisByType = useMemo(() => {
    const groups: Record<string, POI[]> = {};
    for (const poi of visiblePois) {
      if (!groups[poi.type]) groups[poi.type] = [];
      groups[poi.type].push(poi);
    }
    return groups;
  }, [visiblePois]);

  // ── Init map ────────────────────────────────────────────────────────────

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
      map.current.addLayer({
        id: "trail-glow", type: "line", source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#154212", "line-width": 10, "line-opacity": 0.12 },
      });
      map.current.addLayer({
        id: "trail-line", type: "line", source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#154212", "line-width": 3.5, "line-dasharray": [3, 2] },
      });
      setMapReady(true);
    });

    map.current.on("error", (e) => {
      console.error("Map error:", e);
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // ── Render markers ──────────────────────────────────────────────────────

  const renderMarkers = useCallback(() => {
    if (!map.current || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Limit markers for performance
    const maxMarkers = 500;
    const toRender = visiblePois.slice(0, maxMarkers);

    for (const poi of toRender) {
      const layerConfig = layers.find((l) => l.types.includes(poi.type));
      if (!layerConfig) continue;

      const iconName = POI_MATERIAL_ICONS[poi.type] || "location_on";

      const el = document.createElement("div");
      el.style.cssText = `
        width: 30px; height: 30px;
        background: white;
        border: 2px solid ${layerConfig.color};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      `;
      el.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;color:${layerConfig.color};font-variation-settings:'FILL' 1">${iconName}</span>`;
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.25)"; el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; });

      // Build popup
      const openingHours = poi.tags.opening_hours || null;
      const phone = poi.tags.phone || null;
      const website = poi.tags.website || null;
      const dogOk = poi.tags.dog === "yes" || poi.tags.dog_friendly === "yes";

      let html = `<div style="font-family:Inter,system-ui,sans-serif;padding:4px 2px;min-width:160px">
        <div style="font-weight:700;font-size:13px;color:#154212;margin-bottom:2px">${poi.name}</div>
        <div style="font-size:11px;color:#665d4e;text-transform:capitalize;margin-bottom:4px">${poi.type.replace("_", " ")}</div>`;
      if (openingHours) html += `<div style="font-size:10px;color:#665d4e;margin-bottom:2px">Hours: ${openingHours}</div>`;
      if (phone) html += `<div style="font-size:10px"><a href="tel:${phone}" style="color:#154212;text-decoration:none">Tel: ${phone}</a></div>`;
      if (website) html += `<div style="font-size:10px;margin-top:2px"><a href="${website}" target="_blank" rel="noopener" style="color:#154212;font-weight:600">Visit website →</a></div>`;
      if (dogOk) html += `<div style="font-size:10px;color:#15803d;margin-top:3px">Dog friendly</div>`;
      html += "</div>";

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: "240px" }).setHTML(html))
        .addTo(map.current!);

      markersRef.current.push(marker);
    }
  }, [visiblePois, layers, mapReady]);

  useEffect(() => { renderMarkers(); }, [renderMarkers]);

  // ── Zoom to stage ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!map.current || !mapReady) return;
    if (stageFilter) {
      const range = STAGE_RANGES.find((s) => s.stage === stageFilter);
      if (range) {
        map.current.fitBounds(
          [[-2.45, range.minLat - 0.01], [-1.75, range.maxLat + 0.01]],
          { padding: 40, duration: 1000 }
        );
      }
    } else {
      map.current.flyTo({ center: TRAIL_CENTER, zoom: 9, pitch: 15, duration: 1000 });
    }
  }, [stageFilter, mapReady]);

  // ── Toggle layer ──────────────────────────────────────────────────────

  const toggleLayer = (layerId: string) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, enabled: !l.enabled } : l)));
  };

  // ── Fly to POI ────────────────────────────────────────────────────────

  const flyTo = (poi: POI) => {
    map.current?.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15, pitch: 30, duration: 800 });
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)]">

      {/* Sidebar */}
      <div className={`hidden lg:flex flex-col bg-surface border-r border-outline-variant/20 overflow-hidden shrink-0 transition-all duration-300 ${
        panelCollapsed ? "w-0 min-w-0" : "w-[380px] min-w-[380px]"
      }`}>
        {!panelCollapsed && (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-outline-variant/10 shrink-0">
              <h1 className="font-headline font-bold text-xl text-primary mb-1">Trail Explorer</h1>
              <p className="text-xs text-secondary">
                {loading ? "Loading trail data…" : `${visiblePois.length.toLocaleString()} points of interest`}
              </p>
            </div>

            {/* Stage filter */}
            <div className="px-5 py-3 border-b border-outline-variant/10 shrink-0">
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
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high ${!stageFilter ? "text-primary font-bold bg-primary/5" : "text-secondary"}`}>
                      Full trail
                    </button>
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

            {/* Layer toggles */}
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
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-secondary">
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  Loading…
                </div>
              ) : error ? (
                <div className="px-5 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-red-400 mb-2 block">error</span>
                  <p className="text-sm text-red-700 font-bold mb-1">Error</p>
                  <p className="text-xs text-secondary">{error}</p>
                </div>
              ) : visiblePois.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2 block">search_off</span>
                  <p className="text-sm font-bold text-primary mb-1">No POIs visible</p>
                  <p className="text-xs text-secondary">Enable more layers above</p>
                </div>
              ) : (
                Object.entries(poisByType).map(([type, typePois]) => {
                  const layer = layers.find((l) => l.types.includes(type));
                  return (
                    <div key={type}>
                      <div className="px-5 py-2 bg-surface-container-low border-b border-outline-variant/10 sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: layer?.color, fontVariationSettings: "'FILL' 1" }}>
                              {POI_MATERIAL_ICONS[type] || "location_on"}
                            </span>
                            <span className="text-xs font-bold text-primary capitalize">{type.replace("_", " ")}s</span>
                          </div>
                          <span className="text-[10px] text-secondary font-bold">{typePois.length}</span>
                        </div>
                      </div>
                      {typePois.slice(0, 30).map((poi) => (
                        <button key={poi.id} onClick={() => flyTo(poi)}
                          className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors text-left">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-primary truncate">{poi.name}</p>
                          </div>
                          <span className="material-symbols-outlined text-xs text-secondary shrink-0">chevron_right</span>
                        </button>
                      ))}
                      {typePois.length > 30 && (
                        <p className="px-5 py-2 text-[10px] text-secondary">+ {typePois.length - 30} more</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Emergency */}
            <div className="px-5 py-3 bg-red-50 border-t border-red-100 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-red-800 font-bold">
                  <span className="material-symbols-outlined text-sm">emergency</span>
                  Emergency
                </div>
                <a href="tel:999" className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">999</a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={() => setPanelCollapsed(!panelCollapsed)}
        className="hidden lg:flex items-center justify-center w-6 bg-surface-container-high hover:bg-surface-container-highest border-r border-outline-variant/20 transition-colors shrink-0"
        aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}>
        <span className={`material-symbols-outlined text-sm text-secondary transition-transform ${panelCollapsed ? "" : "rotate-180"}`}>chevron_left</span>
      </button>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Map not available fallback */}
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-container-high/90 z-10">
            <span className="material-symbols-outlined text-4xl text-primary mb-2">map</span>
            <p className="font-bold text-primary">Map unavailable</p>
            <p className="text-xs text-secondary">Mapbox token required</p>
          </div>
        )}

        {/* Loading overlay */}
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

        {/* Mobile controls */}
        <div className="lg:hidden absolute top-4 left-4 right-4 z-20 space-y-2">
          {/* Stage selector mobile */}
          <div className="relative">
            <button onClick={() => setStageOpen(!stageOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-lg text-sm text-primary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary">route</span>
                {stageFilter ? `Stage ${stageFilter}` : "Full trail"}
              </div>
              <span className="material-symbols-outlined text-sm text-secondary">keyboard_arrow_down</span>
            </button>
            {stageOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg py-1 z-30 max-h-60 overflow-y-auto">
                <button onClick={() => { setStageFilter(null); setStageOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm">Full trail</button>
                {STAGE_RANGES.map((s) => (
                  <button key={s.stage} onClick={() => { setStageFilter(s.stage); setStageOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm">Stage {s.stage}: {s.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

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
