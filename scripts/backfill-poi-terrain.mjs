#!/usr/bin/env node
/*
 * Backfill enrichment columns on the pois table for the route engine:
 *   - elevation_m       — via Open-Meteo Elevation API (free, batch of 100/request)
 *   - terrain_class     — heuristic from POI type + elevation + name
 *   - scenic_score      — heuristic from POI type and tags
 *   - is_lunch_stop     — category='food' AND distance_from_trail < 1500m
 *
 * One-off. Idempotent — re-running updates rows in place.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/backfill-poi-terrain.mjs
 *
 * Or with dotenv:
 *   node --env-file=.env.local scripts/backfill-poi-terrain.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Heuristics ─────────────────────────────────────────────────────────────

/** Initial scenic score by POI type. 5 = neutral, 8+ = "story-worthy". */
const TYPE_SCENIC = {
  viewpoint: 8,
  peak: 9,
  ruin: 8,
  castle: 9,
  mill: 7,
  church: 6,
  pub: 5,
  cafe: 5,
  restaurant: 5,
  spring: 6,
  river: 6,
  water: 4,
  toilet: 2,
  toilets: 2,
  parking: 2,
  bus_stop: 2,
};

/**
 * Choose terrain_class from POI type + elevation + name keywords. Coarse on
 * purpose — this is the v1 heuristic. A v2 backfill that imports OSM landuse
 * polygons via osm2pgsql would be more accurate.
 */
function inferTerrainClass(poi) {
  const name = (poi.name ?? "").toLowerCase();
  const type = poi.type;
  const elev = poi.elevation_m ?? 0;

  // Strong signals first.
  if (type === "viewpoint" || type === "peak") return elev >= 200 ? "ridge" : "mixed";
  if (type === "river" || type === "spring" || type === "mill") return "valley";
  if (/\b(wood|forest|copse|covert|grove)\b/.test(name)) return "woodland";
  if (/\b(hill|down|ridge|beacon|tump|barrow)\b/.test(name) && elev >= 180) return "ridge";
  if (/\b(brook|valley|combe|coombe|bottom|mead)\b/.test(name)) return "valley";

  // Fallback by elevation if nothing else hits.
  if (elev >= 220) return "ridge";
  if (elev > 0 && elev < 110) return "valley";

  // Settlement-adjacent food/services with no terrain hint.
  if (["pub", "cafe", "restaurant", "shop", "post_office"].includes(type)) {
    return "village";
  }

  return "mixed";
}

function isLunchStop(poi) {
  if (poi.category !== "food") return false;
  if (poi.distance_from_trail > 1500) return false;
  // Type must be something you can actually have lunch at.
  return ["pub", "cafe", "restaurant"].includes(poi.type);
}

// ─── Open-Meteo elevation lookup ────────────────────────────────────────────

/**
 * Open-Meteo elevation endpoint takes up to 100 points per call. Free, no key.
 * Returns elevation in metres.
 *   https://open-meteo.com/en/docs/elevation-api
 */
async function fetchElevations(points) {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.latitude).join(",");
  const lngs = points.map((p) => p.longitude).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  // Response: { elevation: [m1, m2, ...] }
  return json.elevation;
}

async function batchElevation(pois, batchSize = 100) {
  const out = new Map();
  for (let i = 0; i < pois.length; i += batchSize) {
    const batch = pois.slice(i, i + batchSize);
    process.stdout.write(`  elevation batch ${i + 1}-${i + batch.length} of ${pois.length}\r`);
    const elevations = await fetchElevations(batch);
    for (let j = 0; j < batch.length; j++) {
      out.set(batch[j].id, Math.round(elevations[j] ?? 0));
    }
    // Be polite to the free API — small delay between batches.
    await new Promise((r) => setTimeout(r, 300));
  }
  process.stdout.write("\n");
  return out;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all POIs...");
  const { data: pois, error } = await supabase
    .from("pois")
    .select("id, type, category, name, latitude, longitude, distance_from_trail, elevation_m");

  if (error) {
    console.error("Failed to fetch POIs:", error.message);
    process.exit(1);
  }

  console.log(`Got ${pois.length} POIs.`);

  // Only fetch elevation for POIs that don't have it yet — idempotency.
  const needElev = pois.filter((p) => p.elevation_m === null || p.elevation_m === undefined);
  console.log(`Looking up elevation for ${needElev.length} POIs via Open-Meteo...`);
  const elevMap = await batchElevation(needElev);
  // Merge fetched elevations back onto pois in-memory so the next step uses them.
  for (const p of pois) {
    if (elevMap.has(p.id)) p.elevation_m = elevMap.get(p.id);
  }

  console.log("Inferring terrain_class, scenic_score, is_lunch_stop...");
  const updates = pois.map((p) => ({
    id: p.id,
    elevation_m: p.elevation_m,
    terrain_class: inferTerrainClass(p),
    scenic_score: TYPE_SCENIC[p.type] ?? 5,
    is_lunch_stop: isLunchStop(p),
  }));

  // Bulk upsert in chunks. Supabase REST endpoint comfortably handles ~500.
  const CHUNK = 500;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    process.stdout.write(`  writing rows ${i + 1}-${i + chunk.length} of ${updates.length}\r`);
    const { error: upErr } = await supabase
      .from("pois")
      .upsert(chunk, { onConflict: "id" });
    if (upErr) {
      console.error("\nUpsert failed:", upErr.message);
      process.exit(1);
    }
  }
  process.stdout.write("\n");

  // Sanity check the distribution so we catch bad heuristics early.
  console.log("\nDistribution by terrain_class:");
  const distQuery = await supabase
    .from("pois")
    .select("terrain_class")
    .not("terrain_class", "is", null);
  if (distQuery.data) {
    const counts = {};
    for (const row of distQuery.data) {
      counts[row.terrain_class] = (counts[row.terrain_class] ?? 0) + 1;
    }
    for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(10)} ${v}`);
    }
  }

  const lunchQuery = await supabase
    .from("pois")
    .select("id", { count: "exact", head: true })
    .eq("is_lunch_stop", true);
  console.log(`\nis_lunch_stop = true: ${lunchQuery.count}`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
