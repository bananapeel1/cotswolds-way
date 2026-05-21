"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface LoopMapProps {
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  start: { lng: number; lat: number };
  midpoint: { lng: number; lat: number; name: string; type: string };
}

/**
 * Renders one generated walking loop with the start marker, a midpoint POI
 * marker, and the route polyline. Fits bounds on first load. Stateless — the
 * parent passes geometry that's already been generated server-side.
 */
export default function LoopMap({ geometry, start, midpoint }: LoopMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const startMarker = useRef<mapboxgl.Marker | null>(null);
  const midMarker = useRef<mapboxgl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!container.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError("Mapbox token missing — set NEXT_PUBLIC_MAPBOX_TOKEN.");
      return;
    }

    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [start.lng, start.lat],
      zoom: 12,
      attributionControl: false,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.current.on("load", () => {
      if (!map.current) return;
      drawRoute(map.current, geometry);
      fitToGeometry(map.current, geometry);
      startMarker.current = makeMarker("S", "#173124", "#ffffff").setLngLat([start.lng, start.lat]).addTo(map.current);
      const midEl = makeMidpointEl(midpoint.name);
      midMarker.current = new mapboxgl.Marker({ element: midEl })
        .setLngLat([midpoint.lng, midpoint.lat])
        .addTo(map.current);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      startMarker.current = null;
      midMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route when geometry changes without tearing down the map.
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    if (map.current.getSource("loop")) {
      drawRoute(map.current, geometry);
      fitToGeometry(map.current, geometry);
    }
    if (startMarker.current) startMarker.current.setLngLat([start.lng, start.lat]);
    if (midMarker.current) midMarker.current.setLngLat([midpoint.lng, midpoint.lat]);
  }, [geometry, start.lng, start.lat, midpoint.lng, midpoint.lat]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest text-sm text-on-surface-variant">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function drawRoute(map: mapboxgl.Map, geom: GeoJSON.LineString | GeoJSON.MultiLineString) {
  const data: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry: geom,
  };
  if (map.getSource("loop")) {
    (map.getSource("loop") as mapboxgl.GeoJSONSource).setData(data);
  } else {
    map.addSource("loop", { type: "geojson", data });
    map.addLayer({
      id: "loop-glow",
      type: "line",
      source: "loop",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#541600", "line-width": 10, "line-opacity": 0.18 },
    });
    map.addLayer({
      id: "loop-line",
      type: "line",
      source: "loop",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#541600", "line-width": 3.5 },
    });
  }
}

function fitToGeometry(map: mapboxgl.Map, geom: GeoJSON.LineString | GeoJSON.MultiLineString) {
  const coords: [number, number][] =
    geom.type === "LineString"
      ? (geom.coordinates as [number, number][])
      : (geom.coordinates as [number, number][][]).flat();
  if (coords.length < 2) return;
  const bounds = coords.reduce(
    (b, c) => b.extend(c as mapboxgl.LngLatLike),
    new mapboxgl.LngLatBounds(coords[0] as mapboxgl.LngLatLike, coords[0] as mapboxgl.LngLatLike),
  );
  map.fitBounds(bounds, { padding: 60, duration: 800 });
}

function makeMarker(label: string, bg: string, fg: string): mapboxgl.Marker {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: bg,
    color: fg,
    border: "2px solid #ffffff",
    fontSize: "13px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    fontFamily: "var(--font-sans)",
  } satisfies Partial<CSSStyleDeclaration>);
  el.textContent = label;
  return new mapboxgl.Marker({ element: el });
}

function makeMidpointEl(name: string): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    pointer-events: none;
  `;
  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #c73e00;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  `;
  const label = document.createElement("div");
  label.textContent = name;
  label.style.cssText = `
    background: rgba(255,255,255,0.92);
    color: #173124;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-sans);
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  `;
  wrap.appendChild(dot);
  wrap.appendChild(label);
  return wrap;
}
