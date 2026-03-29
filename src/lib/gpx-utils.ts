/**
 * GPX generation utilities.
 * Converts GeoJSON trail coordinates to GPX format, split by day segments.
 */

// Cache for the trail data
let trailCache: { coords: [number, number][]; cumDist: number[] } | null = null;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function loadTrailData(): Promise<{ coords: [number, number][]; cumDist: number[] }> {
  if (trailCache) return trailCache;

  const res = await fetch("/data/cotswold-way.geojson");
  const geojson = await res.json();
  const feature = geojson.features?.[0];
  if (!feature) throw new Error("No trail feature found");

  const rawCoords: number[][] = feature.geometry.type === "MultiLineString"
    ? feature.geometry.coordinates.flat()
    : feature.geometry.coordinates;

  // GeoJSON is [lng, lat], we want [lat, lng] for calculations
  const coords: [number, number][] = rawCoords.map(c => [c[1], c[0]]);

  // Compute cumulative distances in miles
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    cumDist.push(cumDist[i - 1] + d);
  }

  trailCache = { coords, cumDist };
  return trailCache;
}

export function sliceTrailForDay(
  coords: [number, number][],
  cumDist: number[],
  startMile: number,
  endMile: number
): [number, number][] {
  let startIdx = 0;
  let endIdx = coords.length - 1;

  for (let i = 0; i < cumDist.length; i++) {
    if (cumDist[i] >= startMile) { startIdx = Math.max(0, i - 1); break; }
  }
  for (let i = cumDist.length - 1; i >= 0; i--) {
    if (cumDist[i] <= endMile) { endIdx = Math.min(coords.length - 1, i + 1); break; }
  }

  return coords.slice(startIdx, endIdx + 1);
}

interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export function coordinatesToGPX(
  coords: [number, number][],
  waypoints: Waypoint[],
  metadata: { name: string; description: string }
): string {
  const wptXml = waypoints.map(w =>
    `  <wpt lat="${w.lat}" lon="${w.lng}">
    <name>${escapeXml(w.name)}</name>
    <type>${escapeXml(w.type)}</type>
  </wpt>`
  ).join("\n");

  const trkpts = coords.map(([lat, lng]) =>
    `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"></trkpt>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="The Cotswolds Way"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(metadata.name)}</name>
    <desc>${escapeXml(metadata.description)}</desc>
  </metadata>
${wptXml}
  <trk>
    <name>${escapeXml(metadata.name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function downloadGPX(gpxString: string, filename: string) {
  const blob = new Blob([gpxString], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
