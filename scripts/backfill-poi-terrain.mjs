#!/usr/bin/env node
/*
 * Backfill enrichment columns on the pois table for the route engine:
 *   - elevation_m       — via Open-Meteo Elevation API (free, batch of 100/request)
 *   - terrain_class     — heuristic from POI type + elevation + name
 *   - scenic_score      — heuristic from POI type and tags
 *   - is_lunch_stop     — category='food' AND distance_from_trail < 1500m
 *
 * Calls Supabase via PostgREST (REST) instead of the JS client, because the
 * supabase-js client has ESM interop issues with Node 25 when run as a
 * standalone script. The Next.js runtime is fine; this is CLI-only.
 *
 * One-off, idempotent. Re-run to refresh.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-poi-terrain.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// ─── Heuristics ─────────────────────────────────────────────────────────────

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

function inferTerrainClass(poi) {
  const name = (poi.name ?? "").toLowerCase();
  const type = poi.type;
  const elev = poi.elevation_m ?? 0;

  if (type === "viewpoint" || type === "peak") return elev >= 200 ? "ridge" : "mixed";
  if (type === "river" || type === "spring" || type === "mill") return "valley";
  if (/\b(wood|forest|copse|covert|grove)\b/.test(name)) return "woodland";
  if (/\b(hill|down|ridge|beacon|tump|barrow)\b/.test(name) && elev >= 180) return "ridge";
  if (/\b(brook|valley|combe|coombe|bottom|mead)\b/.test(name)) return "valley";

  if (elev >= 220) return "ridge";
  if (elev > 0 && elev < 110) return "valley";

  if (["pub", "cafe", "restaurant", "shop", "post_office"].includes(type)) return "village";
  return "mixed";
}

function isLunchStop(poi) {
  if (poi.category !== "food") return false;
  if (poi.distance_from_trail > 1500) return false;
  return ["pub", "cafe", "restaurant"].includes(poi.type);
}

// ─── Open-Meteo elevation ───────────────────────────────────────────────────

async function fetchElevations(points, maxRetries = 3) {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.latitude).join(",");
  const lngs = points.map((p) => p.longitude).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      return json.elevation;
    }
    if (res.status === 429) {
      // Open-Meteo says "try again in one minute" — sleep 65s and retry.
      const sleep = 65_000;
      process.stdout.write(`\n  rate-limited, sleeping ${sleep / 1000}s before retry ${attempt + 1}/${maxRetries}...\n`);
      await new Promise((r) => setTimeout(r, sleep));
      continue;
    }
    throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
  }
  throw new Error("Open-Meteo retries exhausted");
}

/**
 * Fetch elevations and persist immediately per-batch so partial progress
 * survives a crash. After the first run, re-running this script will skip
 * already-elevated POIs.
 */
async function batchElevationPersist(pois, batchSize = 100, delayMs = 1500) {
  for (let i = 0; i < pois.length; i += batchSize) {
    const batch = pois.slice(i, i + batchSize);
    process.stdout.write(`  elevation batch ${i + 1}-${i + batch.length} of ${pois.length}\r`);
    const elevations = await fetchElevations(batch);
    // Include all NOT NULL columns so PostgREST's upsert works whether it
    // routes the call to INSERT or UPDATE — Supabase's PostgREST has known
    // issues with the on_conflict route when the table has GENERATED columns.
    const rows = batch.map((p, j) => ({
      id: p.id,
      type: p.type,
      category: p.category,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      distance_from_trail: p.distance_from_trail,
      elevation_m: Math.round(elevations[j] ?? 0),
    }));
    for (let j = 0; j < batch.length; j++) {
      batch[j].elevation_m = rows[j].elevation_m;
    }
    await upsertChunk(rows);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  process.stdout.write("\n");
}

// ─── Supabase REST helpers ──────────────────────────────────────────────────

async function fetchAllPois() {
  // PostgREST paginates by default (max 1000 per request). Range header walks
  // through everything; loop until we get a short page.
  const PAGE = 1000;
  const cols = "id,type,category,name,latitude,longitude,distance_from_trail,elevation_m";
  const out = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pois?select=${cols}`, {
      headers: { ...headers, Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`GET pois failed: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function upsertChunk(rows) {
  // `on_conflict=id` tells PostgREST to use ON CONFLICT (id) DO UPDATE.
  // Without it, the upsert can fall through to INSERT and fail on NOT NULL
  // columns when we only send a subset of fields.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pois?on_conflict=id`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`Upsert failed: ${res.status} ${await res.text()}`);
  }
}

async function fetchTerrainDistribution() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pois?select=terrain_class&terrain_class=not.is.null`,
    { headers },
  );
  if (!res.ok) return [];
  return await res.json();
}

async function fetchLunchStopCount() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pois?select=id&is_lunch_stop=eq.true`,
    { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } },
  );
  if (!res.ok) return null;
  const contentRange = res.headers.get("content-range");
  if (!contentRange) return null;
  const total = contentRange.split("/")[1];
  return total ? parseInt(total, 10) : null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all POIs...");
  const pois = await fetchAllPois();
  console.log(`Got ${pois.length} POIs.`);

  const needElev = pois.filter((p) => p.elevation_m === null || p.elevation_m === undefined);
  console.log(`Looking up elevation for ${needElev.length} POIs via Open-Meteo (already done: ${pois.length - needElev.length})...`);
  // Mutates `needElev` items in place; also persists elevation per-batch so
  // partial progress survives a crash. Slow but reliable.
  await batchElevationPersist(needElev);

  console.log("Inferring terrain_class, scenic_score, is_lunch_stop...");
  const updates = pois.map((p) => ({
    id: p.id,
    type: p.type,
    category: p.category,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    distance_from_trail: p.distance_from_trail,
    elevation_m: p.elevation_m,
    terrain_class: inferTerrainClass(p),
    scenic_score: TYPE_SCENIC[p.type] ?? 5,
    is_lunch_stop: isLunchStop(p),
  }));

  const CHUNK = 500;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    process.stdout.write(`  writing rows ${i + 1}-${i + chunk.length} of ${updates.length}\r`);
    await upsertChunk(chunk);
  }
  process.stdout.write("\n");

  console.log("\nDistribution by terrain_class:");
  const distRows = await fetchTerrainDistribution();
  const counts = {};
  for (const row of distRows) {
    counts[row.terrain_class] = (counts[row.terrain_class] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(10)} ${v}`);
  }

  const lunchTotal = await fetchLunchStopCount();
  console.log(`\nis_lunch_stop = true: ${lunchTotal ?? "unknown"}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
