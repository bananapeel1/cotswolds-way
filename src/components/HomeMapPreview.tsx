"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface PreviewProperty {
  slug: string;
  name: string;
  village: string;
  price: number;
  propertyType?: string;
  longitude: number;
  latitude: number;
}

// Key landmarks along the trail for labels
const TRAIL_LANDMARKS = [
  { name: "Chipping Campden", subtitle: "Start · Mile 0", lng: -1.7798, lat: 52.0536 },
  { name: "Broadway", subtitle: "Mile 12", lng: -1.8563, lat: 52.0356 },
  { name: "Winchcombe", subtitle: "Mile 25", lng: -1.966, lat: 51.9539 },
  { name: "Cleeve Hill", subtitle: "Highest Point · 330m", lng: -2.0024, lat: 51.9348 },
  { name: "Painswick", subtitle: "Queen of the Cotswolds", lng: -2.1970, lat: 51.7889 },
  { name: "Stroud", subtitle: "Mile 56", lng: -2.2133, lat: 51.7452 },
  { name: "Dursley", subtitle: "Mile 67", lng: -2.3544, lat: 51.6813 },
  { name: "Wotton-under-Edge", subtitle: "Mile 74", lng: -2.3541, lat: 51.6366 },
  { name: "Old Sodbury", subtitle: "Mile 84", lng: -2.3496, lat: 51.5395 },
  { name: "Bath", subtitle: "Finish · Mile 102", lng: -2.3590, lat: 51.3811 },
];

export default function HomeMapPreview({
  properties,
}: {
  properties: PreviewProperty[];
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<"outdoors" | "satellite">("outdoors");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError(true);
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${mapStyle}-v12`,
      center: [-2.07, 51.75],
      zoom: 8.2,
      pitch: 30,
      bearing: -10,
      attributionControl: false,
      interactive: true,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-left"
    );

    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("error", () => {
      setError(true);
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add terrain for 3D effect
      map.current.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // Sky layer for atmosphere
      map.current.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });

      // Add trail path from GeoJSON
      map.current.addSource("trail", {
        type: "geojson",
        data: "/data/cotswold-way.geojson",
      });

      // Trail glow
      map.current.addLayer({
        id: "trail-glow",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#154212",
          "line-width": 10,
          "line-opacity": 0.15,
        },
      });

      // Trail line
      map.current.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#154212",
          "line-width": 3.5,
          "line-dasharray": [3, 2],
        },
      });

      // Add landmark labels
      TRAIL_LANDMARKS.forEach((lm) => {
        if (!map.current) return;
        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            background: white;
            padding: 3px 8px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-family: 'Manrope', sans-serif;
            pointer-events: none;
            white-space: nowrap;
          ">
            <div style="font-weight: 800; font-size: 11px; color: #154212;">${lm.name}</div>
            <div style="font-size: 9px; color: #665d4e; font-weight: 600;">${lm.subtitle}</div>
          </div>
        `;
        new mapboxgl.Marker({ element: el, anchor: "left", offset: [8, 0] })
          .setLngLat([lm.lng, lm.lat])
          .addTo(map.current!);
      });

      // Add property markers
      properties.forEach((p) => {
        if (!p.longitude || !p.latitude || !map.current) return;

        const isCamping = p.propertyType === "campsite" || p.propertyType === "glamping";
        const isHostel = p.propertyType === "hostel";
        const markerBg = isCamping ? "#2d6a4f" : isHostel ? "#7b2cbf" : "#154212";
        const markerIcon = isCamping ? "⛺" : isHostel ? "🏠" : "🏨";

        const el = document.createElement("div");
        el.style.cursor = "pointer";
        el.innerHTML = `
          <div style="
            background: ${markerBg};
            color: white;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 700;
            font-family: 'Manrope', sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25);
            border: 2px solid white;
            transition: transform 0.2s;
            white-space: nowrap;
          ">${markerIcon}</div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 20,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(`
          <div style="font-family: 'Manrope', sans-serif; padding: 4px;">
            <p style="font-weight: 800; font-size: 13px; color: #154212; margin: 0 0 2px;">${p.name}</p>
            <p style="font-size: 11px; color: #665d4e; margin: 0;">${p.village}</p>
          </div>
        `);

        const innerDiv = el.querySelector("div") as HTMLDivElement;
        el.addEventListener("mouseenter", () => {
          if (innerDiv) innerDiv.style.transform = "scale(1.15)";
          el.style.zIndex = "10";
          popup.setLngLat([p.longitude, p.latitude]).addTo(map.current!);
        });
        el.addEventListener("mouseleave", () => {
          if (innerDiv) innerDiv.style.transform = "scale(1)";
          el.style.zIndex = "1";
          popup.remove();
        });
        el.addEventListener("click", () => {
          window.location.href = `/property/${p.slug}`;
        });

        new mapboxgl.Marker({ element: el })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map.current!);
      });

      setLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStyle = () => {
    const next = mapStyle === "outdoors" ? "satellite" : "outdoors";
    setMapStyle(next);
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${next === "satellite" ? "satellite-streets" : "outdoors"}-v12`);
    }
  };

  if (error) {
    return (
      <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-xl border-4 border-white bg-surface-container-low">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-primary/20 mb-4">map</span>
          <h3 className="font-headline text-2xl font-bold text-primary mb-2">Interactive Trail Map</h3>
          <p className="text-secondary text-sm mb-2 max-w-xs">
            102 miles from Chipping Campden to Bath
          </p>
          <p className="text-secondary/60 text-xs mb-6">
            {properties.length} verified stays along the trail
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {["Chipping Campden", "Broadway", "Winchcombe", "Cheltenham", "Painswick", "Stroud", "Dursley", "Bath"].map((v) => (
              <span key={v} className="bg-surface-container-high text-primary text-xs font-bold px-3 py-1 rounded-full">{v}</span>
            ))}
          </div>
          <a
            href="/search"
            className="bg-primary text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-primary-container transition-all inline-flex items-center gap-2"
          >
            Explore on Map
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-xl border-4 border-white">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 bg-surface-container-high flex items-center justify-center z-10">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-primary animate-pulse mb-2 block">map</span>
            <p className="text-sm font-bold text-secondary">Loading trail map...</p>
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-white/40 z-20">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">explore</span>
          <div>
            <span className="font-headline font-bold text-primary text-sm block leading-tight">
              102 Miles · Chipping Campden to Bath
            </span>
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
              {properties.length} verified stays along the trail
            </span>
          </div>
        </div>
        <button
          onClick={toggleStyle}
          className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">
            {mapStyle === "outdoors" ? "satellite_alt" : "terrain"}
          </span>
          {mapStyle === "outdoors" ? "Satellite" : "Terrain"}
        </button>
      </div>
    </div>
  );
}
