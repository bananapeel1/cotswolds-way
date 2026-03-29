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
}: {
  properties: MapProperty[];
  activeSlug?: string;
  onMarkerClick?: (slug: string) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [loaded, setLoaded] = useState(false);

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

    // Click on map background closes popup
    map.current.on("click", () => {
      if (onMarkerClick && activeSlug) {
        onMarkerClick(activeSlug); // toggle off
      }
    });

    return () => { map.current?.remove(); map.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !loaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    properties.forEach((p) => {
      if (!p.longitude || !p.latitude) return;

      const isActive = p.slug === activeSlug;
      const isCamping = p.propertyType === "campsite" || p.propertyType === "glamping";
      const isHostel = p.propertyType === "hostel";
      const isInn = p.propertyType === "inn";
      const markerBg = isActive ? "#154212" : isCamping ? "#2d6a4f" : isHostel ? "#5c4d3c" : isInn ? "#6b4423" : "#154212";
      const size = isActive ? 38 : 32;

      const el = document.createElement("div");
      el.className = "trail-map-marker";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="
          width: ${size}px; height: ${size}px;
          background: ${markerBg};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2.5px solid white;
          box-shadow: ${isActive ? "0 4px 18px rgba(21,66,18,0.5)" : "0 3px 12px rgba(0,0,0,0.3)"};
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: ${isActive ? "16px" : "14px"};
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
        if (!isActive && innerDiv) innerDiv.style.transform = "rotate(-45deg) scale(1)";
        el.style.zIndex = isActive ? "10" : "1";
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onMarkerClick) onMarkerClick(p.slug);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds on initial load only (not when activeSlug changes)
    if (properties.length > 1 && !activeSlug) {
      const bounds = new mapboxgl.LngLatBounds();
      properties.forEach((p) => {
        if (p.longitude && p.latitude) bounds.extend([p.longitude, p.latitude]);
      });
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 80, left: 40, right: 40 },
        maxZoom: 11,
      });
    }
  }, [properties, activeSlug, loaded, onMarkerClick]);

  // Fly to active marker and show popup
  useEffect(() => {
    if (!map.current || !loaded) return;

    // Remove previous popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (!activeSlug) return;

    const p = properties.find((prop) => prop.slug === activeSlug);
    if (!p) return;

    // Fly to the marker
    map.current.flyTo({
      center: [p.longitude, p.latitude],
      zoom: Math.max(map.current.getZoom(), 12),
      duration: 800,
      padding: { top: 100, bottom: 100, left: 50, right: 50 },
    });

    // Show popup next to marker after fly animation
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
        offset: 30,
        closeButton: true,
        maxWidth: "300px",
        className: "trail-property-popup",
      })
        .setLngLat([p.longitude, p.latitude])
        .setHTML(html)
        .addTo(map.current);

      popupRef.current.on("close", () => {
        if (onMarkerClick && activeSlug) {
          onMarkerClick(activeSlug);
        }
        popupRef.current = null;
      });
    }, 400);
  }, [activeSlug, properties, loaded, onMarkerClick]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
