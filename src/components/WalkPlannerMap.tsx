"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { COTSWOLDS_BBOX, isInsideCotswolds } from "@/lib/aonb";

/**
 * WalkPlannerMap — the interactive design canvas for /walks.
 *
 * Before a route exists it's an INPUT: click or drag the marker to set the
 * start (guarded to the Cotswolds AONB), with a translucent "reach" circle
 * sized to the chosen distance so you can see roughly where the loop will roam.
 * Once a route is generated it becomes the OUTPUT: the loop polyline + midpoint
 * POI overlay, fit to bounds. Switching inputs (which clears `route`) returns
 * it to design mode.
 *
 * The parent memoises `start` and `route` so their object identity is stable
 * across renders — these effects depend on them directly.
 */

interface RouteOverlay {
  geometry: GeoJSON.LineString;
  midpoint: { lng: number; lat: number; name: string; type: string };
}

interface WalkPlannerMapProps {
  start: { lng: number; lat: number } | null;
  /** Called when the user clicks the map or drags the marker to a valid spot. */
  onPickStart: (lng: number, lat: number) => void;
  /** Radius (km) of the reach-hint circle. Parent derives it from distance. */
  reachKm: number;
  /** When set, the generated loop is drawn and the reach circle is hidden. */
  route: RouteOverlay | null;
  /** Must-pass stops dropped on the map, in order. Rendered as numbered pins. */
  waypoints?: { lng: number; lat: number }[];
  /** When true, the next map tap drops a stop instead of moving the start. */
  addStopMode?: boolean;
  /** Called when the user taps the map (in add-stop mode) at a valid spot. */
  onAddWaypoint?: (lng: number, lat: number) => void;
}

const AONB_CENTER: [number, number] = [
  (COTSWOLDS_BBOX.west + COTSWOLDS_BBOX.east) / 2,
  (COTSWOLDS_BBOX.south + COTSWOLDS_BBOX.north) / 2,
];

export default function WalkPlannerMap({
  start,
  onPickStart,
  reachKm,
  route,
  waypoints = [],
  addStopMode = false,
  onAddWaypoint,
}: WalkPlannerMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const startMarker = useRef<mapboxgl.Marker | null>(null);
  const midMarker = useRef<mapboxgl.Marker | null>(null);
  const stopMarkers = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Latest values reachable from the one-time map event handlers.
  const onPickRef = useRef(onPickStart);
  onPickRef.current = onPickStart;
  const onAddRef = useRef(onAddWaypoint);
  onAddRef.current = onAddWaypoint;
  const addStopModeRef = useRef(addStopMode);
  addStopModeRef.current = addStopMode;
  const startRef = useRef(start);
  startRef.current = start;

  function showFlash(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2600);
  }

  // ── Init (once) ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!container.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError("Mapbox token missing — set NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    mapboxgl.accessToken = token;
    const s0 = startRef.current;
    const m = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: s0 ? [s0.lng, s0.lat] : AONB_CENTER,
      zoom: s0 ? 12 : 8.5,
      attributionControl: false,
    });
    map.current = m;
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    m.getCanvas().style.cursor = "crosshair";

    m.on("load", () => {
      m.addSource("reach", { type: "geojson", data: emptyFC() });
      m.addLayer({
        id: "reach-fill",
        type: "fill",
        source: "reach",
        paint: { "fill-color": "#173124", "fill-opacity": 0.07 },
      });
      m.addLayer({
        id: "reach-outline",
        type: "line",
        source: "reach",
        paint: {
          "line-color": "#173124",
          "line-width": 1.5,
          "line-opacity": 0.35,
          "line-dasharray": [2, 2],
        },
      });
      setMapReady(true);
    });

    m.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      if (!isInsideCotswolds(lat, lng)) {
        showFlash("That's outside the Cotswolds — pick a spot inside the area.");
        return;
      }
      // In add-stop mode the tap drops a must-pass stop; otherwise it sets/moves
      // the start.
      if (addStopModeRef.current && onAddRef.current) {
        onAddRef.current(lng, lat);
      } else {
        onPickRef.current(lng, lat);
      }
    });

    return () => {
      m.remove();
      map.current = null;
      startMarker.current = null;
      midMarker.current = null;
      stopMarkers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start marker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (!start) {
      startMarker.current?.remove();
      startMarker.current = null;
      return;
    }

    if (!startMarker.current) {
      const marker = new mapboxgl.Marker({ element: makeStartEl(), draggable: true });
      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        if (!isInsideCotswolds(lat, lng)) {
          showFlash("That's outside the Cotswolds — moved it back.");
          const s = startRef.current;
          if (s) marker.setLngLat([s.lng, s.lat]);
          return;
        }
        onPickRef.current(lng, lat);
      });
      startMarker.current = marker.setLngLat([start.lng, start.lat]).addTo(m);
    } else {
      startMarker.current.setLngLat([start.lng, start.lat]);
    }

    // Recenter to the start only while designing (no route on screen). Zoom in
    // enough that the reach circle is legible — but never zoom the user back out
    // if they've already zoomed in past that.
    if (!route) {
      m.easeTo({
        center: [start.lng, start.lat],
        zoom: Math.max(m.getZoom(), 11),
        duration: 600,
      });
    }
  }, [mapReady, start, route]);

  // ── Reach circle ───────────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource("reach") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    // The reach hint only makes sense for a distance-driven loop — once stops
    // are dropped, the length is whatever routing through them takes.
    const show = !route && start && reachKm > 0 && waypoints.length === 0;
    src.setData(show ? circle([start.lng, start.lat], reachKm) : emptyFC());
  }, [mapReady, start, reachKm, route, waypoints.length]);

  // ── Must-pass stop markers ───────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    stopMarkers.current.forEach((mk) => mk.remove());
    stopMarkers.current = waypoints.map((w, i) =>
      new mapboxgl.Marker({ element: makeStopEl(i + 1) })
        .setLngLat([w.lng, w.lat])
        .addTo(m),
    );
  }, [mapReady, waypoints]);

  // ── Route overlay ──────────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    if (!route) {
      ["loop-line", "loop-glow"].forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
      });
      if (m.getSource("loop")) m.removeSource("loop");
      midMarker.current?.remove();
      midMarker.current = null;
      return;
    }

    const data: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: route.geometry };
    if (m.getSource("loop")) {
      (m.getSource("loop") as mapboxgl.GeoJSONSource).setData(data);
    } else {
      m.addSource("loop", { type: "geojson", data });
      m.addLayer({
        id: "loop-glow",
        type: "line",
        source: "loop",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#541600", "line-width": 10, "line-opacity": 0.18 },
      });
      m.addLayer({
        id: "loop-line",
        type: "line",
        source: "loop",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#541600", "line-width": 3.5 },
      });
    }

    if (!midMarker.current) {
      midMarker.current = new mapboxgl.Marker({ element: makeMidpointEl(route.midpoint.name) })
        .setLngLat([route.midpoint.lng, route.midpoint.lat])
        .addTo(m);
    } else {
      midMarker.current.setLngLat([route.midpoint.lng, route.midpoint.lat]);
    }

    const coords = route.geometry.coordinates as [number, number][];
    if (coords.length >= 2) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(coords[0] as mapboxgl.LngLatLike, coords[0] as mapboxgl.LngLatLike),
      );
      m.fitBounds(bounds, { padding: 60, duration: 800 });
    }
  }, [mapReady, route]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      {!route && !error && (addStopMode || !start) && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-primary/90 px-4 py-1.5 text-xs font-medium text-on-primary shadow-md">
          {addStopMode
            ? "Tap the map to drop a must-pass stop"
            : "Tap the map to set your start point"}
        </div>
      )}
      {flash && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-tertiary/95 px-4 py-1.5 text-xs font-medium text-white shadow-md">
          {flash}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest text-sm text-on-surface-variant">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

/** Geodesic-ish circle polygon (equirectangular approx — fine at AONB scale). */
function circle(center: [number, number], radiusKm: number, points = 72): GeoJSON.Feature {
  const [lng, lat] = center;
  const R = 6371;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = ((radiusKm * Math.sin(angle)) / R) * (180 / Math.PI);
    const dLng =
      (((radiusKm * Math.cos(angle)) / R) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

function makeStartEl(): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "26px",
    height: "26px",
    borderRadius: "50% 50% 50% 0",
    transform: "rotate(-45deg)",
    background: "#173124",
    border: "3px solid #ffffff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
    cursor: "grab",
  } satisfies Partial<CSSStyleDeclaration>);
  return el;
}

function makeStopEl(n: number): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = String(n);
  el.style.cssText =
    "width:24px;height:24px;border-radius:50%;background:#541600;border:2px solid #ffffff;" +
    "color:#ffffff;font-size:12px;font-weight:700;font-family:var(--font-sans);display:flex;" +
    "align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.35);";
  return el;
}

function makeMidpointEl(name: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;";
  const dot = document.createElement("div");
  dot.style.cssText =
    "width:16px;height:16px;border-radius:50%;background:#c73e00;border:2px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.3);";
  const label = document.createElement("div");
  label.textContent = name;
  label.style.cssText =
    "background:rgba(255,255,255,0.92);color:#173124;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;font-family:var(--font-sans);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15);";
  wrap.appendChild(dot);
  wrap.appendChild(label);
  return wrap;
}
