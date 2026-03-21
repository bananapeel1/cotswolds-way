"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapProperty {
  slug: string;
  name: string;
  village: string;
  price: number;
  rating: number;
  propertyType: string;
  dayOnTrail: number;
  longitude: number;
  latitude: number;
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

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-left"
    );

    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      if (!map.current) return;

      // Add trail path from OpenStreetMap GeoJSON (relation 65239)
      map.current.addSource("trail", {
        type: "geojson",
        data: "/data/cotswold-way.geojson",
      });

      // Trail glow (wider, semi-transparent)
      map.current.addLayer({
        id: "trail-glow",
        type: "line",
        source: "trail",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#541600",
          "line-width": 8,
          "line-opacity": 0.15,
        },
      });

      // Trail line
      map.current.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#541600",
          "line-width": 3,
          "line-dasharray": [3, 2],
        },
      });

      setLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add/update markers when properties change or map loads
  useEffect(() => {
    if (!map.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    properties.forEach((p) => {
      if (!p.longitude || !p.latitude) return;

      const isActive = p.slug === activeSlug;
      const price = p.price;
      const isCamping = p.propertyType === "campsite" || p.propertyType === "glamping";
      const isHostel = p.propertyType === "hostel";
      const markerBg = isActive ? "#541600" : isCamping ? "#2d6a4f" : isHostel ? "#7b2cbf" : "#173124";
      const markerIcon = isCamping ? "⛺" : isHostel ? "🏠" : "";

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "trail-map-marker";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="
          background: ${markerBg};
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Manrope', sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          border: 2px solid white;
          cursor: pointer;
          transition: transform 0.2s;
          white-space: nowrap;
          ${isActive ? "transform: scale(1.15);" : ""}
        ">${markerIcon ? markerIcon + " " : ""}£${price}</div>
      `;

      // Create popup for hover (not click)
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        className: "trail-map-popup",
      }).setHTML(`
        <div style="font-family: 'Manrope', sans-serif; padding: 4px;">
          <p style="font-weight: 800; font-size: 13px; color: #173124; margin: 0 0 2px;">
            ${p.name}
          </p>
          <p style="font-size: 11px; color: #665d4e; margin: 0 0 4px;">
            ${p.village} · Day ${p.dayOnTrail}
          </p>
          <p style="font-size: 12px; margin: 0;">
            <strong style="color: #173124;">£${price}</strong>
            <span style="color: #665d4e;">/night</span>
            <span style="margin-left: 8px; color: #541600;">★ ${p.rating}</span>
          </p>
        </div>
      `);

      // Show popup on hover, hide on leave
      const innerDiv = el.querySelector("div") as HTMLDivElement;
      el.addEventListener("mouseenter", () => {
        if (innerDiv) innerDiv.style.transform = "scale(1.15)";
        el.style.zIndex = "10";
        popup.setLngLat([p.longitude, p.latitude]).addTo(map.current!);
      });
      el.addEventListener("mouseleave", () => {
        if (!isActive && innerDiv) {
          innerDiv.style.transform = "scale(1)";
        }
        el.style.zIndex = "1";
        popup.remove();
      });

      // Click navigates to property page (or calls onMarkerClick)
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onMarkerClick) {
          onMarkerClick(p.slug);
        } else {
          window.location.href = `/property/${p.slug}`;
        }
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (properties.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      properties.forEach((p) => {
        if (p.longitude && p.latitude) {
          bounds.extend([p.longitude, p.latitude]);
        }
      });
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 80, left: 40, right: 40 },
        maxZoom: 11,
      });
    }
  }, [properties, activeSlug, loaded, onMarkerClick]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}
