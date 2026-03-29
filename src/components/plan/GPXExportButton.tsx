"use client";

import { useState } from "react";
import { loadTrailData, sliceTrailForDay, coordinatesToGPX, downloadGPX } from "@/lib/gpx-utils";

interface POI {
  id: number;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number;
}

export default function GPXExportButton({
  dayNumber,
  fromVillage,
  toVillage,
  startMile,
  endMile,
  pois,
}: {
  dayNumber: number;
  fromVillage: string;
  toVillage: string;
  startMile: number;
  endMile: number;
  pois: POI[];
}) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const { coords, cumDist } = await loadTrailData();
      const dayCoords = sliceTrailForDay(coords, cumDist, startMile, endMile);

      // Build waypoints from nearby POIs
      const relevantTypes = ["pub", "cafe", "restaurant", "water", "toilets"];
      const waypoints = pois
        .filter(p => relevantTypes.includes(p.type) && p.distanceFromTrail <= 500)
        .map(p => ({ name: p.name, lat: p.latitude, lng: p.longitude, type: p.type }));

      const gpx = coordinatesToGPX(dayCoords, waypoints, {
        name: `Cotswold Way Day ${dayNumber}: ${fromVillage} to ${toVillage}`,
        description: `${(endMile - startMile).toFixed(1)} miles along the Cotswold Way`,
      });

      const filename = `cotswold-way-day-${dayNumber}-${fromVillage.toLowerCase().replace(/\s+/g, "-")}-to-${toVillage.toLowerCase().replace(/\s+/g, "-")}.gpx`;
      downloadGPX(gpx, filename);
    } catch (err) {
      console.error("GPX export error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-xs">{loading ? "progress_activity" : "download"}</span>
      GPX
    </button>
  );
}
