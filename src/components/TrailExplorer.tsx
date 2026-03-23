"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Types ──────────────────────────────────────────────────────────────────

interface POI {
  id: number;
  type: string;
  category: string;
  name: string;
  latitude: number;
  longitude: number;
  tags: Record<string, string>;
}

interface LayerConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  types: string[];
  enabled: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TRAIL_CENTER: [number, number] = [-2.07, 51.75];

const INITIAL_LAYERS: LayerConfig[] = [
  { id: "food",       label: "Pubs & Food",    icon: "local_bar",       color: "#b45309", types: ["pub", "cafe", "restaurant"], enabled: true },
  { id: "water",      label: "Drinking Water",  icon: "water_drop",      color: "#0369a1", types: ["water"],                     enabled: true },
  { id: "toilets",    label: "Toilets",         icon: "wc",              color: "#6d28d9", types: ["toilets"],                   enabled: true },
  { id: "transport",  label: "Bus & Train",      icon: "directions_bus",  color: "#0f766e", types: ["bus_stop", "train"],         enabled: false },
  { id: "services",   label: "Shops & ATMs",     icon: "store",           color: "#be185d", types: ["shop", "atm", "pharmacy", "post_office"], enabled: false },
  { id: "parking",    label: "Car Parks",        icon: "local_parking",   color: "#4338ca", types: ["parking"],                  enabled: false },
  { id: "facilities", label: "Churches",         icon: "church",          color: "#78716c", types: ["church"],                   enabled: false },
  { id: "outdoors",   label: "Views & Picnic",   icon: "landscape",       color: "#15803d", types: ["viewpoint", "picnic", "campsite"], enabled: false },
];

const POI_ICONS: Record<string, string> = {
  pub: "🍺", cafe: "☕", restaurant: "🍽️",
  water: "🚰", toilets: "🚻", parking: "🅿️",
  bus_stop: "🚌", train: "🚂",
  shop: "🛒", atm: "💳", pharmacy: "💊", post_office: "📮",
  church: "⛪", viewpoint: "🧭", picnic: "🧺", campsite: "⛺",
};

// ─── Haversine distance in miles ────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TrailExplorer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [pois, setPois] = useState<POI[]>([]);
  const [layers, setLayers] = useState<LayerConfig[]>(INITIAL_LAYERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [nearestPois, setNearestPois] = useState<(POI & { distance: number })[]>([]);
  const [mobilePanel, setMobilePanel] = useState<"layers" | "nearest" | null>(null);
  const [poiCount, setPoiCount] = useState(0);

  // ── Fetch POIs ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/pois")
      .then((r) => r.json())
      .then((data) => {
        if (data.pois) {
          setPois(data.pois);
          setPoiCount(data.count);
        } else {
          setError("Failed to load trail data");
        }
      })
      .catch(() => setError("Network error — check your connection"))
      .finally(() => setLoading(false));
  }, []);

  // ── Get active POI types ────────────────────────────────────────────────

  const activeTypes = layers.filter((l) => l.enabled).flatMap((l) => l.types);

  const visiblePois = pois.filter((p) => activeTypes.includes(p.type));

  // ── Update nearest POIs when location changes ──────────────────────────

  useEffect(() => {
    if (!userLocation) {
      setNearestPois([]);
      return;
    }
    const withDist = visiblePois.map((p) => ({
      ...p,
      distance: haversine(userLocation.lat, userLocation.lng, p.latitude, p.longitude),
    }));
    withDist.sort((a, b) => a.distance - b.distance);
    setNearestPois(withDist.slice(0, 15));
  }, [userLocation, visiblePois]);

  // ── Init map ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: TRAIL_CENTER,
      zoom: 9.5,
      pitch: 20,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.addSource("trail", {
        type: "geojson",
        data: "/data/cotswold-way.geojson",
      });
      map.current.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#541600", "line-width": 4, "line-opacity": 0.9 },
      });
      // Glow effect
      map.current.addLayer({
        id: "trail-glow",
        type: "line",
        source: "trail",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#541600", "line-width": 12, "line-opacity": 0.15, "line-blur": 8 },
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Render markers when pois or layers change ─────────────────────────

  const renderMarkers = useCallback(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const poi of visiblePois) {
      const layerConfig = layers.find((l) => l.types.includes(poi.type));
      if (!layerConfig) continue;

      const emoji = POI_ICONS[poi.type] || "📍";
      const el = document.createElement("div");
      el.style.cssText = `
        width: 28px; height: 28px;
        background: white;
        border: 2px solid ${layerConfig.color};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: transform 0.15s;
      `;
      el.textContent = emoji;
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.3)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

      // Build popup HTML
      const openingHours = poi.tags.opening_hours || null;
      const phone = poi.tags.phone || null;
      const website = poi.tags.website || null;
      const dogFriendly = poi.tags.dog === "yes" || poi.tags.dog_friendly === "yes";
      const wheelchair = poi.tags.wheelchair === "yes";

      let popupHtml = `
        <div style="font-family:Manrope,system-ui,sans-serif;padding:4px 2px;min-width:160px">
          <div style="font-weight:700;font-size:13px;color:#173124;margin-bottom:2px">${emoji} ${poi.name}</div>
          <div style="font-size:11px;color:#665d4e;text-transform:capitalize;margin-bottom:4px">${poi.type.replace("_", " ")}</div>
      `;
      if (openingHours) {
        popupHtml += `<div style="font-size:10px;color:#665d4e;margin-bottom:2px">🕐 ${openingHours}</div>`;
      }
      if (phone) {
        popupHtml += `<div style="font-size:10px"><a href="tel:${phone}" style="color:#541600;text-decoration:none">📞 ${phone}</a></div>`;
      }
      if (website) {
        popupHtml += `<div style="font-size:10px;margin-top:2px"><a href="${website}" target="_blank" rel="noopener" style="color:#541600;text-decoration:none;font-weight:600">Visit website →</a></div>`;
      }
      const badges: string[] = [];
      if (dogFriendly) badges.push("🐕 Dog OK");
      if (wheelchair) badges.push("♿ Accessible");
      if (badges.length) {
        popupHtml += `<div style="font-size:10px;color:#15803d;margin-top:3px">${badges.join(" · ")}</div>`;
      }
      popupHtml += "</div>";

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: "220px" }).setHTML(popupHtml))
        .addTo(map.current!);

      markersRef.current.push(marker);
    }
  }, [visiblePois, layers]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  // ── User location tracking ────────────────────────────────────────────

  const toggleTracking = useCallback(() => {
    if (tracking) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      setTracking(false);
      setUserLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);

        if (!map.current) return;

        // Create or update user marker
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.innerHTML = `
            <div style="position:relative;width:20px;height:20px">
              <div style="position:absolute;inset:0;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);z-index:2"></div>
              <div style="position:absolute;inset:-8px;background:rgba(59,130,246,0.15);border-radius:50%;animation:pulse 2s ease-in-out infinite;z-index:1"></div>
            </div>
          `;
          userMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([loc.lng, loc.lat])
            .addTo(map.current);

          // Inject pulse animation
          if (!document.getElementById("cw-pulse-style")) {
            const style = document.createElement("style");
            style.id = "cw-pulse-style";
            style.textContent = `@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.8); opacity: 0; } }`;
            document.head.appendChild(style);
          }

          // Fly to user
          map.current.flyTo({ center: [loc.lng, loc.lat], zoom: 13, pitch: 30, duration: 1500 });
        } else {
          userMarkerRef.current.setLngLat([loc.lng, loc.lat]);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setTracking(false);
        alert("Could not get your location. Please enable location services.");
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  }, [tracking]);

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── Toggle layer ──────────────────────────────────────────────────────

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, enabled: !l.enabled } : l))
    );
  };

  // ── Fly to POI ────────────────────────────────────────────────────────

  const flyTo = (poi: POI) => {
    map.current?.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15, pitch: 40, duration: 1200 });
    setMobilePanel(null);
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)]">

      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[360px] bg-surface border-r border-outline-variant/30 overflow-hidden shrink-0">

        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-outline-variant/20">
          <h1 className="font-headline font-bold text-xl text-primary mb-1">Trail Explorer</h1>
          <p className="text-xs text-secondary">
            {loading ? "Loading POI data…" : `${poiCount.toLocaleString()} points of interest along the Cotswold Way`}
          </p>
        </div>

        {/* Location toggle */}
        <div className="px-6 py-3 border-b border-outline-variant/20">
          <button
            onClick={toggleTracking}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
              tracking
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-surface-container-low text-primary hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {tracking ? "my_location" : "location_searching"}
            </span>
            {tracking ? "Tracking Active" : "Enable GPS"}
          </button>
          {tracking && userLocation && (
            <p className="text-[10px] text-secondary mt-2 text-center">
              {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Layer toggles */}
        <div className="px-6 py-4 border-b border-outline-variant/20">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">Map Layers</p>
          <div className="grid grid-cols-2 gap-2">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                  layer.enabled
                    ? "border-transparent text-white shadow-sm"
                    : "border-outline-variant/30 text-secondary hover:border-outline-variant/60 bg-white"
                }`}
                style={layer.enabled ? { backgroundColor: layer.color } : {}}
              >
                <span className="material-symbols-outlined text-sm">{layer.icon}</span>
                {layer.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-secondary mt-3">
            Showing {visiblePois.length.toLocaleString()} of {poiCount.toLocaleString()} POIs
          </p>
        </div>

        {/* Nearest POIs */}
        <div className="flex-1 overflow-y-auto">
          {tracking && userLocation && nearestPois.length > 0 ? (
            <>
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Nearest to You</p>
              </div>
              {nearestPois.map((poi) => (
                <button
                  key={poi.id}
                  onClick={() => flyTo(poi)}
                  className="w-full flex items-center gap-3 px-6 py-3 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors text-left"
                >
                  <span className="text-lg shrink-0">{POI_ICONS[poi.type] || "📍"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-primary truncate">{poi.name}</p>
                    <p className="text-[10px] text-secondary capitalize">{poi.type.replace("_", " ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-tertiary">{poi.distance.toFixed(1)}mi</p>
                  </div>
                </button>
              ))}
            </>
          ) : tracking && !userLocation ? (
            <div className="flex items-center justify-center py-12 text-secondary">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Getting your location…
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 block">near_me</span>
              <p className="font-bold text-primary text-sm mb-1">Enable GPS</p>
              <p className="text-xs text-secondary">Turn on location tracking to see what&apos;s nearest to you on the trail</p>
            </div>
          )}
        </div>

        {/* Emergency panel */}
        <div className="px-6 py-4 bg-red-50 border-t border-red-100">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-2">Emergency</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-red-800 font-medium">
              <span className="material-symbols-outlined text-sm">emergency</span>
              Mountain Rescue
            </div>
            <a href="tel:999" className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              999
            </a>
          </div>
          {userLocation && (
            <p className="text-[9px] text-red-600 mt-2">
              Your location: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
            </p>
          )}
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* No token fallback */}
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-container-high/90 z-10">
            <span className="material-symbols-outlined text-4xl text-primary mb-2">map</span>
            <p className="font-bold text-primary">Map unavailable</p>
            <p className="text-xs text-secondary">Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-20">
            <span className="material-symbols-outlined animate-spin text-primary text-base">progress_activity</span>
            <span className="text-sm font-bold text-primary">Loading trail data…</span>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-20">
            <span className="material-symbols-outlined text-red-500 text-base">error</span>
            <span className="text-sm font-bold text-red-700">{error}</span>
          </div>
        )}

        {/* ── Mobile floating controls ──────────────────────────────── */}
        <div className="lg:hidden absolute bottom-6 left-4 right-4 flex gap-2 z-20">
          {/* GPS button */}
          <button
            onClick={toggleTracking}
            className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
              tracking ? "bg-blue-500 text-white" : "bg-white text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {tracking ? "my_location" : "location_searching"}
            </span>
          </button>

          {/* Layer toggle */}
          <button
            onClick={() => setMobilePanel(mobilePanel === "layers" ? null : "layers")}
            className={`flex items-center gap-2 px-4 h-12 rounded-full shadow-lg font-bold text-xs uppercase tracking-wider transition-all ${
              mobilePanel === "layers" ? "bg-primary text-white" : "bg-white text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-base">layers</span>
            Layers
          </button>

          {/* Nearest toggle */}
          {tracking && userLocation && (
            <button
              onClick={() => setMobilePanel(mobilePanel === "nearest" ? null : "nearest")}
              className={`flex items-center gap-2 px-4 h-12 rounded-full shadow-lg font-bold text-xs uppercase tracking-wider transition-all ${
                mobilePanel === "nearest" ? "bg-blue-500 text-white" : "bg-white text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base">near_me</span>
              Nearest
            </button>
          )}
        </div>

        {/* ── Mobile bottom sheet ───────────────────────────────────── */}
        {mobilePanel && (
          <div className="lg:hidden absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl max-h-[50vh] overflow-y-auto z-20 border border-outline-variant/20">
            {mobilePanel === "layers" && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-primary text-sm">Map Layers</p>
                  <button onClick={() => setMobilePanel(null)} className="text-secondary">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {layers.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                        layer.enabled
                          ? "border-transparent text-white"
                          : "border-outline-variant/30 text-secondary bg-surface-container-low"
                      }`}
                      style={layer.enabled ? { backgroundColor: layer.color } : {}}
                    >
                      <span className="material-symbols-outlined text-sm">{layer.icon}</span>
                      {layer.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mobilePanel === "nearest" && nearestPois.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="font-bold text-primary text-sm">Nearest to You</p>
                  <button onClick={() => setMobilePanel(null)} className="text-secondary">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                {nearestPois.slice(0, 8).map((poi) => (
                  <button
                    key={poi.id}
                    onClick={() => flyTo(poi)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10 text-left"
                  >
                    <span className="text-lg">{POI_ICONS[poi.type] || "📍"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-primary truncate">{poi.name}</p>
                      <p className="text-[10px] text-secondary capitalize">{poi.type.replace("_", " ")}</p>
                    </div>
                    <span className="font-bold text-sm text-tertiary">{poi.distance.toFixed(1)}mi</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
