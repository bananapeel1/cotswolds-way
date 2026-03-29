import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/pois
 *
 * Fetches points of interest along the Cotswold Way corridor from
 * OpenStreetMap's Overpass API. Results are cached for 24 hours.
 * POIs are filtered to within 2.5km of the actual trail line.
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Bounding box covering the Cotswold Way corridor
const BBOX = "51.35,-2.50,52.10,-1.70";

const OVERPASS_QUERY = `
[out:json][timeout:30];
(
  // Pubs
  node["amenity"="pub"](${BBOX});
  way["amenity"="pub"](${BBOX});

  // Cafés & tearooms
  node["amenity"="cafe"](${BBOX});
  way["amenity"="cafe"](${BBOX});

  // Restaurants
  node["amenity"="restaurant"](${BBOX});
  way["amenity"="restaurant"](${BBOX});

  // Drinking water taps
  node["amenity"="drinking_water"](${BBOX});

  // Public toilets
  node["amenity"="toilets"](${BBOX});

  // Parking
  node["amenity"="parking"](${BBOX});
  way["amenity"="parking"](${BBOX});

  // Pharmacies
  node["amenity"="pharmacy"](${BBOX});

  // ATMs
  node["amenity"="atm"](${BBOX});

  // Convenience stores / shops
  node["shop"="convenience"](${BBOX});
  node["shop"="supermarket"](${BBOX});
  node["shop"="general"](${BBOX});

  // Bus stops
  node["highway"="bus_stop"](${BBOX});

  // Train stations
  node["railway"="station"](${BBOX});

  // Churches (often have water / shelter)
  node["amenity"="place_of_worship"]["religion"="christian"](${BBOX});
  way["amenity"="place_of_worship"]["religion"="christian"](${BBOX});

  // Post offices
  node["amenity"="post_office"](${BBOX});

  // Campsites
  node["tourism"="camp_site"](${BBOX});
  way["tourism"="camp_site"](${BBOX});

  // Viewpoints
  node["tourism"="viewpoint"](${BBOX});

  // Picnic sites
  node["tourism"="picnic_site"](${BBOX});
  node["leisure"="picnic_table"](${BBOX});
);
out center body;
`;

export interface POI {
  id: number;
  type: string;        // "pub" | "cafe" | "water" | "toilets" | etc.
  category: string;    // "food" | "water" | "facilities" | "transport" | "services" | "outdoors"
  name: string;
  latitude: number;
  longitude: number;
  distanceFromTrail: number; // meters from nearest point on trail
  tags: Record<string, string>;
}

const CATEGORY_MAP: Record<string, { type: string; category: string }> = {
  pub:              { type: "pub",       category: "food" },
  cafe:             { type: "cafe",      category: "food" },
  restaurant:       { type: "restaurant",category: "food" },
  drinking_water:   { type: "water",     category: "water" },
  toilets:          { type: "toilets",   category: "facilities" },
  parking:          { type: "parking",   category: "facilities" },
  pharmacy:         { type: "pharmacy",  category: "services" },
  atm:              { type: "atm",       category: "services" },
  post_office:      { type: "post_office", category: "services" },
  bus_stop:         { type: "bus_stop",  category: "transport" },
  station:          { type: "train",     category: "transport" },
  place_of_worship: { type: "church",    category: "facilities" },
  camp_site:        { type: "campsite",  category: "outdoors" },
  viewpoint:        { type: "viewpoint", category: "outdoors" },
  picnic_site:      { type: "picnic",    category: "outdoors" },
  picnic_table:     { type: "picnic",    category: "outdoors" },
};

const SHOP_MAP: Record<string, { type: string; category: string }> = {
  convenience: { type: "shop", category: "services" },
  supermarket: { type: "shop", category: "services" },
  general:     { type: "shop", category: "services" },
};

// In-memory cache — survives across requests in the same server process
let cachedPOIs: POI[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Trail coordinates cache
let trailCoords: [number, number][] | null = null;

const MAX_DISTANCE_M = 2500; // 2.5km from trail

function loadTrailCoordinates(): [number, number][] {
  if (trailCoords) return trailCoords;

  const filePath = join(process.cwd(), "public", "data", "cotswold-way.geojson");
  const raw = readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(raw);

  // Extract coordinates from the first feature (LineString or MultiLineString)
  const feature = geojson.features?.[0];
  if (!feature) return [];

  let coords: number[][];
  if (feature.geometry.type === "MultiLineString") {
    coords = feature.geometry.coordinates.flat();
  } else {
    coords = feature.geometry.coordinates;
  }

  // GeoJSON is [lng, lat], we store as [lat, lng] for distance calculations
  trailCoords = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
  return trailCoords;
}

// Haversine distance in meters between two points [lat, lng]
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Distance from a point to a line segment (projected onto the segment)
function pointToSegmentDistance(
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number
): number {
  // Project point onto segment using simple linear interpolation
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return haversineDistance(pLat, pLon, aLat, aLon);

  let t = ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * dy;
  const projLon = aLon + t * dx;

  return haversineDistance(pLat, pLon, projLat, projLon);
}

// Find minimum distance from a point to the trail polyline
function distanceToTrail(lat: number, lon: number, trail: [number, number][]): number {
  let minDist = Infinity;

  // Quick pre-filter: ~0.03 degrees ≈ ~3.3km at this latitude
  const ROUGH_THRESHOLD = 0.035;

  for (let i = 0; i < trail.length - 1; i++) {
    const [aLat, aLon] = trail[i];
    const [bLat, bLon] = trail[i + 1];

    // Rough bounding box check — skip segments far away
    const segMinLat = Math.min(aLat, bLat) - ROUGH_THRESHOLD;
    const segMaxLat = Math.max(aLat, bLat) + ROUGH_THRESHOLD;
    const segMinLon = Math.min(aLon, bLon) - ROUGH_THRESHOLD;
    const segMaxLon = Math.max(aLon, bLon) + ROUGH_THRESHOLD;

    if (lat < segMinLat || lat > segMaxLat || lon < segMinLon || lon > segMaxLon) continue;

    const dist = pointToSegmentDistance(lat, lon, aLat, aLon, bLat, bLon);
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

function classifyElement(el: Record<string, unknown>): { type: string; category: string } | null {
  const tags = (el.tags || {}) as Record<string, string>;

  // Highway (bus stop)
  if (tags.highway === "bus_stop") return { type: "bus_stop", category: "transport" };

  // Railway
  if (tags.railway === "station") return { type: "train", category: "transport" };

  // Shop
  if (tags.shop && SHOP_MAP[tags.shop]) return SHOP_MAP[tags.shop];

  // Tourism
  if (tags.tourism) {
    if (tags.tourism === "camp_site")    return { type: "campsite", category: "outdoors" };
    if (tags.tourism === "viewpoint")    return { type: "viewpoint", category: "outdoors" };
    if (tags.tourism === "picnic_site")  return { type: "picnic", category: "outdoors" };
  }

  // Leisure
  if (tags.leisure === "picnic_table") return { type: "picnic", category: "outdoors" };

  // Amenity
  if (tags.amenity && CATEGORY_MAP[tags.amenity]) return CATEGORY_MAP[tags.amenity];

  return null;
}

async function fetchFromOverpass(): Promise<Omit<POI, "distanceFromTrail">[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status}`);
  }

  const data = await res.json();
  const elements = data.elements as Record<string, unknown>[];

  const pois: Omit<POI, "distanceFromTrail">[] = [];

  for (const el of elements) {
    const classification = classifyElement(el);
    if (!classification) continue;

    const tags = (el.tags || {}) as Record<string, string>;

    // Get coordinates — nodes have lat/lon, ways have center
    let lat: number;
    let lon: number;
    if (el.type === "node") {
      lat = el.lat as number;
      lon = el.lon as number;
    } else if (el.center) {
      const center = el.center as { lat: number; lon: number };
      lat = center.lat;
      lon = center.lon;
    } else {
      continue;
    }

    if (!lat || !lon) continue;

    pois.push({
      id: el.id as number,
      type: classification.type,
      category: classification.category,
      name: tags.name || defaultName(classification.type),
      latitude: lat,
      longitude: lon,
      tags: {
        ...(tags.opening_hours ? { opening_hours: tags.opening_hours } : {}),
        ...(tags.phone ? { phone: tags.phone } : {}),
        ...(tags.website ? { website: tags.website } : {}),
        ...(tags.dog ? { dog: tags.dog } : {}),
        ...(tags["dog:friendly"] ? { dog_friendly: tags["dog:friendly"] } : {}),
        ...(tags.cuisine ? { cuisine: tags.cuisine } : {}),
        ...(tags.food ? { food: tags.food } : {}),
        ...(tags.wheelchair ? { wheelchair: tags.wheelchair } : {}),
        ...(tags.fee ? { fee: tags.fee } : {}),
      },
    });
  }

  return pois;
}

function defaultName(type: string): string {
  const names: Record<string, string> = {
    pub: "Pub",
    cafe: "Cafe",
    restaurant: "Restaurant",
    water: "Drinking Water",
    toilets: "Public Toilets",
    parking: "Car Park",
    pharmacy: "Pharmacy",
    atm: "Cash Point",
    shop: "Shop",
    bus_stop: "Bus Stop",
    train: "Train Station",
    church: "Church",
    post_office: "Post Office",
    campsite: "Campsite",
    viewpoint: "Viewpoint",
    picnic: "Picnic Area",
  };
  return names[type] || type;
}

export async function GET() {
  try {
    const now = Date.now();

    if (cachedPOIs && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({ pois: cachedPOIs, cached: true, count: cachedPOIs.length });
    }

    const trail = loadTrailCoordinates();
    const rawPois = await fetchFromOverpass();

    // Filter by distance to trail and add distanceFromTrail field
    const pois: POI[] = [];
    for (const poi of rawPois) {
      const dist = distanceToTrail(poi.latitude, poi.longitude, trail);
      if (dist <= MAX_DISTANCE_M) {
        pois.push({
          ...poi,
          distanceFromTrail: Math.round(dist / 10) * 10, // round to nearest 10m
        });
      }
    }

    cachedPOIs = pois;
    cacheTimestamp = now;

    return NextResponse.json({ pois, cached: false, count: pois.length });
  } catch (error) {
    console.error("POI fetch error:", error);

    // Return cached data if we have any, even if expired
    if (cachedPOIs) {
      return NextResponse.json({ pois: cachedPOIs, cached: true, stale: true, count: cachedPOIs.length });
    }

    return NextResponse.json({ error: "Failed to fetch POI data", pois: [] }, { status: 500 });
  }
}
