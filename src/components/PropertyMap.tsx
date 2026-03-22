"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TRAIL_CENTER: [number, number] = [-2.07, 51.75];

// Fallback village coordinates
const VILLAGE_COORDS: Record<string, [number, number]> = {
  "Chipping Campden": [-1.7798, 52.0536],
  Broadway: [-1.8563, 52.0356],
  Winchcombe: [-1.966, 51.9539],
  "Cleeve Hill": [-2.0024, 51.9348],
  Cheltenham: [-2.0805, 51.8994],
  Dowdeswell: [-1.9989, 51.8806],
  "Seven Springs": [-2.0499, 51.8403],
  Leckhampton: [-2.0889, 51.8525],
  Painswick: [-2.197, 51.7889],
  Stroud: [-2.2133, 51.7452],
  Dursley: [-2.3544, 51.6813],
  "Wotton-under-Edge": [-2.3541, 51.6366],
  "Old Sodbury": [-2.3496, 51.5395],
  Bath: [-2.359, 51.3811],
};

interface PropertyMapProps {
  name: string;
  village: string;
  longitude?: number | null;
  latitude?: number | null;
}

export default function PropertyMap({ name, village, longitude, latitude }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    // Resolve property coordinates
    const villageCoords = VILLAGE_COORDS[village];
    const lng = longitude || villageCoords?.[0] || TRAIL_CENTER[0];
    const lat = latitude || villageCoords?.[1] || TRAIL_CENTER[1];

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [lng, lat],
      zoom: 13,
      pitch: 25,
      attributionControl: false,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      if (!map.current) return;

      // Trail path source
      map.current.addSource("trail", {
        type: "geojson",
        data: "/trail.geojson",
      });

      map.current.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#541600",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      });

      // Property marker
      const el = document.createElement("div");
      el.style.cssText = `
        width: 40px; height: 40px;
        background: #541600;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const inner = document.createElement("div");
      inner.style.cssText = `
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        transform: rotate(45deg);
        color: white; font-size: 16px;
      `;
      inner.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">hotel</span>`;
      el.appendChild(inner);

      new mapboxgl.Marker({ element: el, anchor: "bottom-left" })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false })
            .setHTML(
              `<div style="font-family:sans-serif;padding:4px 2px">
                <div style="font-weight:700;font-size:13px;color:#173124">${name}</div>
                <div style="font-size:11px;color:#665d4e">${village}</div>
              </div>`
            )
        )
        .addTo(map.current);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [name, village, longitude, latitude]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-container-high/90">
          <span className="material-symbols-outlined text-4xl text-primary mb-2">map</span>
          <p className="font-bold text-primary">Map unavailable</p>
          <p className="text-xs text-secondary">{village}</p>
        </div>
      )}
    </div>
  );
}
