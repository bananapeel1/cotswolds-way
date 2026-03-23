import { NextResponse } from "next/server";

/**
 * GET /api/pois
 *
 * Fetches points of interest along the Cotswold Way corridor from
 * OpenStreetMap's Overpass API. Results are cached for 24 hours.
 *
 * The bounding box covers a ~2km corridor either side of the trail:
 *   South-west: 51.35, -2.50  (Bath)
 *   North-east: 52.10, -1.70  (Chipping Campden)
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

async function fetchFromOverpass(): Promise<POI[]> {
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

  const pois: POI[] = [];

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

    const pois = await fetchFromOverpass();
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
