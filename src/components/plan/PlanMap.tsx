"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { VILLAGES, TRAIL_POLYLINE, getStartVillage, type DayStop } from "@/lib/plan-engine";

interface POI {
  id: number;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number;
  tags?: Record<string, string>;
}

type LayerKey = "stays" | "pubs" | "water" | "toilets" | "viewpoints";

const LAYER_DEFS: { key: LayerKey; label: string; icon: string; types: string[] }[] = [
  { key: "stays", label: "Stays", icon: "bed", types: [] },
  { key: "pubs", label: "Pubs & food", icon: "local_bar", types: ["pub", "cafe", "restaurant"] },
  { key: "water", label: "Water", icon: "water_drop", types: ["drinking_water"] },
  { key: "toilets", label: "Toilets", icon: "wc", types: ["toilets"] },
  { key: "viewpoints", label: "Views", icon: "visibility", types: ["viewpoint"] },
];

/**
 * Interactive route map for the trip planner. Shows the real OSM trail, each
 * day's segment in a distinct hue, numbered day-end markers, and filterable
 * POI overlays. Hovering a day card in the parent highlights that day's leg
 * on the map via the `highlightDays` prop.
 */
export default function PlanMap({
  stops,
  direction,
  pois,
  highlightDays,
  onHoverDay,
}: {
  stops: DayStop[];
  direction: "north_to_south" | "south_to_north";
  pois: POI[];
  highlightDays?: number[];
  onHoverDay?: (day: number | null) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const dayMarkers = useRef<mapboxgl.Marker[]>([]);
  const poiMarkers = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(["stays", "pubs"]));

  // Initialise the map.
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-2.07, 51.73],
      zoom: 8.1,
      pitch: 0,
      attributionControl: false,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.current.on("load", () => {
      if (!map.current) return;
      // Use the inline polyline (already deduplicated + sampled) as the trail
      // source — cheaper than loading the 6026-point GeoJSON at runtime.
      const coords = TRAIL_POLYLINE.map(([lat, lng]) => [lng, lat]);
      map.current.addSource("trail", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.current.addLayer({
        id: "trail-glow",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#154212", "line-width": 8, "line-opacity": 0.15 },
      });
      map.current.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#154212", "line-width": 2.5 },
      });
      setLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Draw day markers + per-day highlight segments.
  useEffect(() => {
    if (!loaded || !map.current) return;

    // Clear previous day markers
    dayMarkers.current.forEach((m) => m.remove());
    dayMarkers.current = [];

    // Remove old day-highlight layers
    const style = map.current.getStyle();
    if (style) {
      for (const layer of style.layers ?? []) {
        if (layer.id.startsWith("day-highlight-")) map.current.removeLayer(layer.id);
      }
      for (const sourceId of Object.keys(style.sources ?? {})) {
        if (sourceId.startsWith("day-highlight-")) map.current.removeSource(sourceId);
      }
    }

    const DAY_COLORS = ["#154212", "#226e2a", "#3b8a3c", "#5ea750", "#85c265", "#b0d97f", "#d6e89a", "#541600", "#7a2a05", "#9e3d0c", "#be5a1a", "#d47d2d", "#e6a14a", "#f2c470"];

    // Build per-day highlight segments from the trail polyline.
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (stop.restDay) continue;

      const fromVillage = getStartVillage(stops, i, direction);
      const fromV = VILLAGES.find((v) => v.name === fromVillage);
      const toV = VILLAGES.find((v) => v.name === stop.village);
      if (!fromV || !toV) continue;

      const [lo, hi] = fromV.mile < toV.mile ? [fromV.mile, toV.mile] : [toV.mile, fromV.mile];
      const seg = TRAIL_POLYLINE.filter(([, , mile]) => mile >= lo && mile <= hi).map(([lat, lng]) => [lng, lat]);
      if (seg.length < 2) continue;

      const srcId = `day-highlight-${stop.day}`;
      map.current.addSource(srcId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { day: stop.day },
          geometry: { type: "LineString", coordinates: seg },
        },
      });
      map.current.addLayer({
        id: srcId,
        type: "line",
        source: srcId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": DAY_COLORS[i % DAY_COLORS.length],
          "line-width": highlightDays?.includes(stop.day) ? 6 : 4,
          "line-opacity": highlightDays && highlightDays.length > 0 && !highlightDays.includes(stop.day) ? 0.3 : 0.9,
        },
      });

      // End-of-day numbered marker at the trail point for this village
      const el = document.createElement("div");
      el.className = "plan-map-day-marker";
      el.textContent = stop.day.toString();
      Object.assign(el.style, {
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: stop.accommodation ? "#154212" : "#ffffff",
        color: stop.accommodation ? "#ffffff" : "#154212",
        border: "2px solid #154212",
        fontSize: "13px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      });
      el.addEventListener("mouseenter", () => onHoverDay?.(stop.day));
      el.addEventListener("mouseleave", () => onHoverDay?.(null));
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([toV.lng, toV.lat])
        .addTo(map.current);
      dayMarkers.current.push(marker);
    }

    // Start marker (unnumbered flag)
    const startName = direction === "north_to_south" ? "Chipping Campden" : "Bath";
    const startV = VILLAGES.find((v) => v.name === startName);
    if (startV) {
      const el = document.createElement("div");
      el.textContent = "🚩";
      Object.assign(el.style, { fontSize: "22px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([startV.lng, startV.lat]).addTo(map.current);
      dayMarkers.current.push(marker);
    }
  }, [loaded, stops, direction, highlightDays, onHoverDay]);

  // Render POI markers according to active layers.
  useEffect(() => {
    if (!loaded || !map.current) return;
    poiMarkers.current.forEach((m) => m.remove());
    poiMarkers.current = [];

    const activeTypes = new Set<string>();
    for (const layer of LAYER_DEFS) {
      if (activeLayers.has(layer.key)) layer.types.forEach((t) => activeTypes.add(t));
    }
    if (activeTypes.size === 0) return;

    // Don't flood the map — cap per type, prioritise closer-to-trail
    const byType: Record<string, POI[]> = {};
    for (const p of pois) {
      if (!activeTypes.has(p.type)) continue;
      (byType[p.type] ||= []).push(p);
    }
    const toRender: POI[] = [];
    for (const type of Object.keys(byType)) {
      byType[type].sort((a, b) => a.distanceFromTrail - b.distanceFromTrail);
      toRender.push(...byType[type].slice(0, 80));
    }

    const ICONS: Record<string, string> = {
      pub: "🍺",
      cafe: "☕",
      restaurant: "🍴",
      drinking_water: "💧",
      toilets: "🚻",
      viewpoint: "🔭",
    };

    for (const p of toRender) {
      const el = document.createElement("div");
      el.textContent = ICONS[p.type] ?? "📍";
      Object.assign(el.style, {
        fontSize: "14px",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(21,66,18,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        cursor: "pointer",
      });
      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
        `<div style="font:13px var(--font-sans);padding:2px 4px">
          <div style="font-weight:700">${p.name}</div>
          <div style="color:#665d4e;font-size:11px">${p.type} · ${Math.round(p.distanceFromTrail)}m off trail</div>
        </div>`
      );
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(popup)
        .addTo(map.current);
      poiMarkers.current.push(marker);
    }
  }, [loaded, pois, activeLayers]);

  const hasToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div className="relative w-full rounded-[20px] overflow-hidden bg-cream">
      <div ref={mapContainer} className="w-full h-[360px] sm:h-[420px]" />
      {!hasToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-center px-6">
          <div>
            <p className="text-sm font-semibold text-ink">Map preview unavailable</p>
            <p className="text-xs text-stone mt-1">Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable.</p>
          </div>
        </div>
      )}

      {/* Layer toggles */}
      {hasToken && (
        <div className="absolute left-3 bottom-3 flex gap-1.5 bg-white/90 backdrop-blur rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          {LAYER_DEFS.map((l) => {
            const on = activeLayers.has(l.key);
            const disabled = l.key === "stays"; // not yet wired to real accommodation data here
            return (
              <button
                key={l.key}
                disabled={disabled}
                onClick={() =>
                  setActiveLayers((prev) => {
                    const next = new Set(prev);
                    if (next.has(l.key)) next.delete(l.key);
                    else next.add(l.key);
                    return next;
                  })
                }
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-full transition-all ${
                  on
                    ? "bg-forest text-white shadow-sm"
                    : disabled
                      ? "text-stone-light cursor-not-allowed"
                      : "text-stone hover:bg-cream"
                }`}
                title={disabled ? "Accommodation overlay coming soon" : undefined}
              >
                <span className="material-symbols-outlined text-sm">{l.icon}</span>
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
