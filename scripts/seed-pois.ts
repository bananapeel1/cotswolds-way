/**
 * Seed POIs into Supabase from OpenStreetMap Overpass API.
 *
 * Usage:
 *   npx tsx scripts/seed-pois.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const BBOX = "51.35,-2.50,52.10,-1.70";
const MAX_DISTANCE_M = 2500;

const OVERPASS_QUERY = `
[out:json][timeout:30];
(
  node["amenity"="pub"](${BBOX});way["amenity"="pub"](${BBOX});
  node["amenity"="cafe"](${BBOX});way["amenity"="cafe"](${BBOX});
  node["amenity"="restaurant"](${BBOX});way["amenity"="restaurant"](${BBOX});
  node["amenity"="drinking_water"](${BBOX});
  node["amenity"="toilets"](${BBOX});
  node["amenity"="parking"](${BBOX});way["amenity"="parking"](${BBOX});
  node["amenity"="pharmacy"](${BBOX});
  node["amenity"="atm"](${BBOX});
  node["shop"="convenience"](${BBOX});node["shop"="supermarket"](${BBOX});node["shop"="general"](${BBOX});
  node["highway"="bus_stop"](${BBOX});
  node["railway"="station"](${BBOX});
  node["amenity"="place_of_worship"]["religion"="christian"](${BBOX});way["amenity"="place_of_worship"]["religion"="christian"](${BBOX});
  node["amenity"="post_office"](${BBOX});
  node["tourism"="camp_site"](${BBOX});way["tourism"="camp_site"](${BBOX});
  node["tourism"="viewpoint"](${BBOX});
  node["tourism"="picnic_site"](${BBOX});node["leisure"="picnic_table"](${BBOX});
);
out center body;
`;

const CATEGORY_MAP: Record<string, { type: string; category: string }> = {
  pub: { type: "pub", category: "food" },
  cafe: { type: "cafe", category: "food" },
  restaurant: { type: "restaurant", category: "food" },
  drinking_water: { type: "water", category: "water" },
  toilets: { type: "toilets", category: "facilities" },
  parking: { type: "parking", category: "facilities" },
  pharmacy: { type: "pharmacy", category: "services" },
  atm: { type: "atm", category: "services" },
  post_office: { type: "post_office", category: "services" },
  bus_stop: { type: "bus_stop", category: "transport" },
  station: { type: "train", category: "transport" },
  place_of_worship: { type: "church", category: "facilities" },
  camp_site: { type: "campsite", category: "outdoors" },
  viewpoint: { type: "viewpoint", category: "outdoors" },
  picnic_site: { type: "picnic", category: "outdoors" },
  picnic_table: { type: "picnic", category: "outdoors" },
};

const SHOP_MAP: Record<string, { type: string; category: string }> = {
  convenience: { type: "shop", category: "services" },
  supermarket: { type: "shop", category: "services" },
  general: { type: "shop", category: "services" },
};

const DEFAULT_NAMES: Record<string, string> = {
  pub: "Pub", cafe: "Cafe", restaurant: "Restaurant", water: "Drinking Water",
  toilets: "Public Toilets", parking: "Car Park", pharmacy: "Pharmacy", atm: "Cash Point",
  shop: "Shop", bus_stop: "Bus Stop", train: "Train Station", church: "Church",
  post_office: "Post Office", campsite: "Campsite", viewpoint: "Viewpoint", picnic: "Picnic Area",
};

function classifyElement(el: Record<string, unknown>): { type: string; category: string } | null {
  const tags = (el.tags || {}) as Record<string, string>;
  if (tags.highway === "bus_stop") return { type: "bus_stop", category: "transport" };
  if (tags.railway === "station") return { type: "train", category: "transport" };
  if (tags.shop && SHOP_MAP[tags.shop]) return SHOP_MAP[tags.shop];
  if (tags.tourism === "camp_site") return { type: "campsite", category: "outdoors" };
  if (tags.tourism === "viewpoint") return { type: "viewpoint", category: "outdoors" };
  if (tags.tourism === "picnic_site") return { type: "picnic", category: "outdoors" };
  if (tags.leisure === "picnic_table") return { type: "picnic", category: "outdoors" };
  if (tags.amenity && CATEGORY_MAP[tags.amenity]) return CATEGORY_MAP[tags.amenity];
  return null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistance(pLat: number, pLon: number, aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistance(pLat, pLon, aLat, aLon);
  let t = ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return haversineDistance(pLat, pLon, aLat + t * dy, aLon + t * dx);
}

function distanceToTrail(lat: number, lon: number, trail: [number, number][]): number {
  let minDist = Infinity;
  const ROUGH_THRESHOLD = 0.035;
  for (let i = 0; i < trail.length - 1; i++) {
    const [aLat, aLon] = trail[i];
    const [bLat, bLon] = trail[i + 1];
    if (lat < Math.min(aLat, bLat) - ROUGH_THRESHOLD || lat > Math.max(aLat, bLat) + ROUGH_THRESHOLD ||
        lon < Math.min(aLon, bLon) - ROUGH_THRESHOLD || lon > Math.max(aLon, bLon) + ROUGH_THRESHOLD) continue;
    const dist = pointToSegmentDistance(lat, lon, aLat, aLon, bLat, bLon);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

async function main() {
  // Load env
  const { config } = await import("dotenv");
  config({ path: join(process.cwd(), ".env.local") });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.error("Find it at: Supabase Dashboard > Settings > API > service_role key");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Load trail coordinates
  console.log("Loading trail coordinates...");
  const geojson = JSON.parse(readFileSync(join(process.cwd(), "public/data/cotswold-way.geojson"), "utf-8"));
  const feature = geojson.features?.[0];
  const coords: number[][] = feature.geometry.type === "MultiLineString"
    ? feature.geometry.coordinates.flat()
    : feature.geometry.coordinates;
  const trail: [number, number][] = coords.map((c: number[]) => [c[1], c[0]]);
  console.log(`Loaded ${trail.length} trail coordinate pairs`);

  // Fetch from Overpass
  console.log("Fetching POIs from Overpass API...");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();
  const elements = data.elements as Record<string, unknown>[];
  console.log(`Received ${elements.length} elements from Overpass`);

  // Process and filter
  const rows: Record<string, unknown>[] = [];
  for (const el of elements) {
    const classification = classifyElement(el);
    if (!classification) continue;

    const tags = (el.tags || {}) as Record<string, string>;
    let lat: number, lon: number;
    if (el.type === "node") { lat = el.lat as number; lon = el.lon as number; }
    else if (el.center) { const c = el.center as { lat: number; lon: number }; lat = c.lat; lon = c.lon; }
    else continue;
    if (!lat || !lon) continue;

    const dist = distanceToTrail(lat, lon, trail);
    if (dist > MAX_DISTANCE_M) continue;

    rows.push({
      id: el.id as number,
      type: classification.type,
      category: classification.category,
      name: tags.name || DEFAULT_NAMES[classification.type] || classification.type,
      latitude: lat,
      longitude: lon,
      distance_from_trail: Math.round(dist / 10) * 10,
      opening_hours: tags.opening_hours || null,
      phone: tags.phone || null,
      website: tags.website || null,
      cuisine: tags.cuisine || null,
      wheelchair: tags.wheelchair || null,
      fee: tags.fee || null,
    });
  }

  console.log(`Filtered to ${rows.length} POIs within ${MAX_DISTANCE_M / 1000}km of trail`);

  // Clear existing and insert in batches
  console.log("Clearing existing POIs...");
  const { error: deleteError } = await supabase.from("pois").delete().gte("id", 0);
  if (deleteError) {
    console.error("Delete error:", deleteError.message);
    process.exit(1);
  }

  console.log("Inserting POIs in batches...");
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("pois").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Batch insert error at ${i}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${rows.length}`);
  }

  console.log(`\nDone! Seeded ${rows.length} POIs into Supabase.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
