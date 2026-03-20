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

// Cotswold Way trail path coordinates (north to south, 44 waypoints)
const TRAIL_PATH: [number, number][] = [
  [-1.7798, 52.0536], // Chipping Campden
  [-1.7870, 52.0590], // Dover's Hill
  [-1.7650, 52.0350], // Broadway Tower approach
  [-1.7685, 52.0240], // Broadway Tower
  [-1.8575, 52.0335], // Broadway village
  [-1.8350, 52.0200], // Snowshill Road
  [-1.8260, 52.0120], // Stanton
  [-1.8340, 52.0010], // Stanway
  [-1.8700, 51.9700], // Hailes Abbey
  [-1.8665, 51.9545], // Winchcombe
  [-1.8870, 51.9400], // Belas Knap
  [-1.9670, 51.9380], // Cleeve Common summit
  [-1.9900, 51.9300], // Cleeve Hill village
  [-2.0120, 51.9100], // Prestbury
  [-2.0700, 51.8700], // Leckhampton Hill
  [-2.0500, 51.8650], // Charlton Kings Common
  [-2.0350, 51.8500], // Seven Springs
  [-2.0900, 51.8480], // Crickley Hill
  [-2.0800, 51.8380], // Barrow Wake
  [-2.0650, 51.8280], // Birdlip
  [-2.1440, 51.8340], // Cooper's Hill
  [-2.1550, 51.8200], // Prinknash
  [-2.1900, 51.7980], // Painswick Beacon
  [-2.1955, 51.7880], // Painswick
  [-2.2100, 51.7680], // Edge
  [-2.2750, 51.7550], // Haresfield Beacon
  [-2.2900, 51.7450], // Standish Wood
  [-2.2800, 51.7350], // King's Stanley
  [-2.2700, 51.7250], // Selsley Common
  [-2.3520, 51.7100], // Cam Long Down
  [-2.3540, 51.6820], // Dursley
  [-2.3700, 51.6880], // Stinchcombe Hill
  [-2.3800, 51.6600], // North Nibley / Tyndale Monument
  [-2.3540, 51.6360], // Wotton-under-Edge
  [-2.3350, 51.6100], // Alderley
  [-2.3240, 51.5700], // Hawkesbury Upton
  [-2.3100, 51.5480], // Horton
  [-2.3200, 51.5350], // Little Sodbury hill fort
  [-2.3130, 51.5250], // Old Sodbury
  [-2.3600, 51.4980], // Tormarton
  [-2.3650, 51.4430], // Cold Ashton
  [-2.3700, 51.4100], // Lansdown
  [-2.3750, 51.3950], // Weston (Bath approach)
  [-2.3590, 51.3812], // Bath Abbey (finish)
];

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

      // Add trail path
      map.current.addSource("trail", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: TRAIL_PATH,
          },
        },
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

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "trail-map-marker";
      el.innerHTML = `
        <div style="
          background: ${isActive ? "#541600" : "#173124"};
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
        ">£${price}</div>
      `;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.15)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        if (!isActive) {
          el.style.transform = "scale(1)";
          el.style.zIndex = "1";
        }
      });

      if (onMarkerClick) {
        el.addEventListener("click", () => onMarkerClick(p.slug));
      }

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
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

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(popup)
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
