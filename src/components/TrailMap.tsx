"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapProperty {
  slug: string;
  name: string;
  village: string;
  price?: number;
  rating: number | null;
  propertyType: string;
  dayOnTrail: number;
  longitude: number;
  latitude: number;
  description?: string;
  typeLabel?: string;
  trailStage?: number;
}

export default function TrailMap({
  properties,
  activeSlug,
  onMarkerClick,
  planSlugs,
}: {
  properties: MapProperty[];
  activeSlug?: string;
  onMarkerClick?: (slug: string) => void;
  planSlugs?: string[];
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement; innerDiv: HTMLDivElement }>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const removingPopup = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const prevActiveSlug = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-2.07, 51.75],
      zoom: 8.5,
      pitch: 20,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource("trail", { type: "geojson", data: "/data/cotswold-way.geojson" });
      map.current.addLayer({
        id: "trail-glow", type: "line", source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#154212", "line-width": 8, "line-opacity": 0.15 },
      });
      map.current.addLayer({
        id: "trail-line", type: "line", source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#154212", "line-width": 3, "line-dasharray": [3, 2] },
      });
      setLoaded(true);
    });

    // Click on map background deselects
    map.current.on("click", () => {
      if (onMarkerClick && activeSlug) {
        onMarkerClick(activeSlug);
      }
    });

    // Resize map when container changes size (e.g. panel drag)
    const observer = new ResizeObserver(() => { map.current?.resize(); });
    observer.observe(mapContainer.current);

    return () => { observer.disconnect(); map.current?.remove(); map.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create markers once when properties change
  useEffect(() => {
    if (!map.current || !loaded) return;

    // Clean up old markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = new Map();

    properties.forEach((p) => {
      if (!p.longitude || !p.latitude) return;

      const isCamping = p.propertyType === "campsite" || p.propertyType === "glamping";
      const isHostel = p.propertyType === "hostel";
      const isInn = p.propertyType === "inn";
      const defaultBg = isCamping ? "#2d6a4f" : isHostel ? "#5c4d3c" : isInn ? "#6b4423" : "#154212";

      const el = document.createElement("div");
      el.className = "trail-map-marker";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="
          width: 32px; height: 32px;
          background: ${defaultBg};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2.5px solid white;
          box-shadow: 0 3px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, width 0.2s, height 0.2s;
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 14px;
            color: white;
            font-family: 'Material Symbols Outlined';
            font-variation-settings: 'FILL' 1;
          ">${isCamping ? "forest" : isHostel ? "backpack" : isInn ? "local_bar" : "hotel"}</span>
        </div>
      `;

      const innerDiv = el.querySelector("div") as HTMLDivElement;
      el.addEventListener("mouseenter", () => {
        if (innerDiv) innerDiv.style.transform = "rotate(-45deg) scale(1.15)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        if (innerDiv) innerDiv.style.transform = "rotate(-45deg) scale(1)";
        el.style.zIndex = "1";
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onMarkerClick) onMarkerClick(p.slug);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map.current!);

      markersRef.current.set(p.slug, { marker, el, innerDiv });
    });

    // Fit bounds on initial load
    if (properties.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      properties.forEach((p) => {
        if (p.longitude && p.latitude) bounds.extend([p.longitude, p.latitude]);
      });
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 80, left: 40, right: 40 },
        maxZoom: 11,
      });
    }
  }, [properties, loaded, onMarkerClick]);

  // Handle activeSlug changes — update marker styles, show popup, pan (don't zoom)
  useEffect(() => {
    if (!map.current || !loaded) return;

    // Remove previous popup (flag prevents close handler from toggling selection)
    if (popupRef.current) {
      removingPopup.current = true;
      popupRef.current.remove();
      popupRef.current = null;
      removingPopup.current = false;
    }

    // Reset previous active marker style
    if (prevActiveSlug.current) {
      const prev = markersRef.current.get(prevActiveSlug.current);
      if (prev) {
        const p = properties.find((prop) => prop.slug === prevActiveSlug.current);
        const isCamping = p?.propertyType === "campsite" || p?.propertyType === "glamping";
        const isHostel = p?.propertyType === "hostel";
        const isInn = p?.propertyType === "inn";
        const defaultBg = isCamping ? "#2d6a4f" : isHostel ? "#5c4d3c" : isInn ? "#6b4423" : "#154212";
        prev.innerDiv.style.width = "32px";
        prev.innerDiv.style.height = "32px";
        prev.innerDiv.style.background = defaultBg;
        prev.innerDiv.style.boxShadow = "0 3px 12px rgba(0,0,0,0.3)";
        prev.el.style.zIndex = "1";
      }
    }

    prevActiveSlug.current = activeSlug;

    if (!activeSlug) return;

    // Highlight active marker
    const active = markersRef.current.get(activeSlug);
    if (active) {
      active.innerDiv.style.width = "38px";
      active.innerDiv.style.height = "38px";
      active.innerDiv.style.background = "#154212";
      active.innerDiv.style.boxShadow = "0 4px 18px rgba(21,66,18,0.5)";
      active.el.style.zIndex = "10";
    }

    const p = properties.find((prop) => prop.slug === activeSlug);
    if (!p) return;

    // Pan to marker without changing zoom level
    map.current.panTo([p.longitude, p.latitude], { duration: 600 });

    // Show popup after pan
    setTimeout(() => {
      if (!map.current) return;

      const typeLabel = p.typeLabel || p.propertyType;
      const stage = p.trailStage || p.dayOnTrail;
      const desc = p.description ? `<p style="font-size:12px;color:#665d4e;margin:6px 0 0;line-clamp:3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${p.description}</p>` : "";

      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;min-width:220px;max-width:280px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="background:#154212;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px">${typeLabel}</span>
            <span style="font-size:11px;color:#665d4e">Stage ${stage}</span>
          </div>
          <p style="font-weight:800;font-size:15px;color:#154212;margin:0 0 2px">${p.name}</p>
          <p style="font-size:12px;color:#665d4e;margin:0;display:flex;align-items:center;gap:3px">
            <span style="font-family:'Material Symbols Outlined';font-size:14px">location_on</span>
            ${p.village}
          </p>
          ${desc}
          <a href="/property/${p.slug}" style="
            display:block;
            margin-top:10px;
            background:#154212;
            color:white;
            text-align:center;
            padding:8px 16px;
            border-radius:99px;
            font-size:13px;
            font-weight:700;
            text-decoration:none;
          ">View Details</a>
        </div>
      `;

      popupRef.current = new mapboxgl.Popup({
        offset: [0, -45],
        anchor: "bottom",
        closeButton: true,
        maxWidth: "300px",
        className: "trail-property-popup",
      })
        .setLngLat([p.longitude, p.latitude])
        .setHTML(html)
        .addTo(map.current);

      popupRef.current.on("close", () => {
        if (!removingPopup.current && onMarkerClick && activeSlug) {
          onMarkerClick(activeSlug);
        }
        popupRef.current = null;
      });
    }, 300);
  }, [activeSlug, properties, loaded, onMarkerClick]);

  // Draw route line between planned properties + highlight planned markers
  useEffect(() => {
    if (!map.current || !loaded) return;

    // Build coordinates for planned properties sorted by trail stage
    const plannedProps = (planSlugs || [])
      .map(slug => properties.find(p => p.slug === slug))
      .filter((p): p is MapProperty => !!p && !!p.longitude && !!p.latitude)
      .sort((a, b) => (a.trailStage || a.dayOnTrail || 0) - (b.trailStage || b.dayOnTrail || 0));

    const coords = plannedProps.map(p => [p.longitude, p.latitude]);

    // Update or create the plan route source/layer
    const source = map.current.getSource("plan-route") as mapboxgl.GeoJSONSource | undefined;
    const geojson: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords.length >= 2 ? coords : [] },
    };

    if (source) {
      source.setData(geojson);
    } else {
      map.current.addSource("plan-route", { type: "geojson", data: geojson });
      map.current.addLayer({
        id: "plan-route-line", type: "line", source: "plan-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#541600", "line-width": 3, "line-dasharray": [4, 3], "line-opacity": 0.7 },
      });
    }

    // Highlight planned markers with a gold border
    const planSet = new Set(planSlugs || []);
    markersRef.current.forEach(({ innerDiv }, slug) => {
      if (planSet.has(slug)) {
        innerDiv.style.borderColor = "#d4a017";
        innerDiv.style.borderWidth = "3px";
      } else {
        innerDiv.style.borderColor = "white";
        innerDiv.style.borderWidth = "2.5px";
      }
    });
  }, [planSlugs, properties, loaded]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
