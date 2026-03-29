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
          "line-color": "#154212",
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
          "line-color": "#154212",
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
      const isCamping = p.propertyType === "campsite" || p.propertyType === "glamping";
      const isHostel = p.propertyType === "hostel";
      const isInn = p.propertyType === "inn";
      const markerBg = isActive ? "#154212" : isCamping ? "#2d6a4f" : isHostel ? "#5c4d3c" : isInn ? "#6b4423" : "#154212";

      const el = document.createElement("div");
      el.className = "trail-map-marker";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${markerBg};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2.5px solid white;
          box-shadow: 0 3px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          ${isActive ? "width: 38px; height: 38px; box-shadow: 0 4px 18px rgba(21,66,18,0.5);" : ""}
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

      // Hover scale effect only (no popup)
      const innerDiv = el.querySelector("div") as HTMLDivElement;
      el.addEventListener("mouseenter", () => {
        if (innerDiv) innerDiv.style.transform = "scale(1.15)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        if (!isActive && innerDiv) {
          innerDiv.style.transform = "scale(1)";
        }
        el.style.zIndex = "1";
      });

      // Click triggers onMarkerClick (popup handled by parent)
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
