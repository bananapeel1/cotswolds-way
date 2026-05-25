#!/usr/bin/env node
/**
 * Seed script: pre-generate 180 SEO walk pages.
 *
 *   20 villages × 3 themes × 3 distances = 180 routes
 *
 * For each combination the script:
 *   1. Calls POST /api/routes/generate (using the production or local URL)
 *   2. Reads the `cacheKey` from the response
 *   3. Updates `routes.slug` and `routes.is_seo_page = true` via Supabase RPC
 *
 * Usage:
 *   # Against production (requires the server + GraphHopper to be running):
 *   BASE_URL=https://thecotswoldsway.com \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-seo-routes.mjs
 *
 *   # Against local dev server:
 *   BASE_URL=http://localhost:3000 \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-seo-routes.mjs
 *
 *   # Filter to a single village (partial match on slug):
 *   BASE_URL=... ... node scripts/seed-seo-routes.mjs stow
 *
 * The script reads .env.local automatically if it exists in the project root.
 */

import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// ─── Tiny .env.local loader ──────────────────────────────────────────────────
// Reads key=value pairs (no interpolation, no multiline). Populates
// process.env so the rest of the script can use the same vars regardless of
// whether the caller sourced them from a shell or not.
function loadDotenv(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotenv(new URL("../.env.local", import.meta.url).pathname);

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.BASE_URL ?? "https://thecotswoldsway.com").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
    "Put them in .env.local or pass as env vars.",
  );
  process.exit(1);
}

const FILTER = process.argv[2] ?? ""; // optional partial village slug match

const CONCURRENCY = 4; // parallel GH + Gemini calls; stay under Cloud Run concurrency=20
const RETRY_ON_503 = 2; // retry degraded service at most twice per route

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Walk matrix ─────────────────────────────────────────────────────────────

const VILLAGES = [
  { name: "Stow-on-the-Wold",    slug: "stow-on-the-wold",    lat: 51.9309, lng: -1.7210 },
  { name: "Chipping Campden",     slug: "chipping-campden",     lat: 52.0490, lng: -1.7769 },
  { name: "Broadway",             slug: "broadway",             lat: 52.0354, lng: -1.8553 },
  { name: "Painswick",            slug: "painswick",            lat: 51.7889, lng: -2.2006 },
  { name: "Bourton-on-the-Water", slug: "bourton-on-the-water", lat: 51.8843, lng: -1.7575 },
  { name: "Lower Slaughter",      slug: "lower-slaughter",      lat: 51.9009, lng: -1.7723 },
  { name: "Northleach",           slug: "northleach",           lat: 51.8344, lng: -1.8335 },
  { name: "Burford",              slug: "burford",              lat: 51.8068, lng: -1.6340 },
  { name: "Bibury",               slug: "bibury",               lat: 51.7675, lng: -1.8308 },
  { name: "Snowshill",            slug: "snowshill",            lat: 52.0140, lng: -1.8447 },
  { name: "Stanton",              slug: "stanton",              lat: 52.0265, lng: -1.8714 },
  { name: "Stanway",              slug: "stanway",              lat: 51.9974, lng: -1.8810 },
  { name: "Winchcombe",           slug: "winchcombe",           lat: 52.0150, lng: -1.9774 },
  { name: "Cleeve Hill",          slug: "cleeve-hill",          lat: 51.9363, lng: -2.0168 },
  { name: "Cranham",              slug: "cranham",              lat: 51.8087, lng: -2.1458 },
  { name: "Slad",                 slug: "slad",                 lat: 51.7768, lng: -2.1784 },
  { name: "Sheepscombe",          slug: "sheepscombe",          lat: 51.7987, lng: -2.1604 },
  { name: "Bisley",               slug: "bisley",               lat: 51.7519, lng: -2.1163 },
  { name: "Minchinhampton",       slug: "minchinhampton",       lat: 51.7173, lng: -2.1685 },
  { name: "Nailsworth",           slug: "nailsworth",           lat: 51.6948, lng: -2.2154 },
];

const THEMES = ["ridge", "valley", "woodland"];
// km values are bucketed by buildCacheKey to the nearest 5km bin:
//   12 → bin 10   (short walk)
//   16 → bin 15   (medium walk)
//   20 → bin 20   (long walk)
// Three unique bins → no slug collisions. Re-seeding is idempotent:
// already-stamped slugs are skipped; 8km slugs from earlier seeds are
// overwritten with the cleaner 12km name on their shared cache row.
const KM_TARGETS = [12, 16, 20];

// Build all (village, theme, km) combos filtered to the CLI arg.
function buildJobs() {
  const jobs = [];
  for (const village of VILLAGES) {
    if (FILTER && !village.slug.includes(FILTER)) continue;
    for (const theme of THEMES) {
      for (const km of KM_TARGETS) {
        const seoSlug = `${village.slug}-${theme}-walk-${km}km`;
        jobs.push({ village, theme, km, seoSlug });
      }
    }
  }
  return jobs;
}

// ─── Generate one route ───────────────────────────────────────────────────────

async function generateRoute({ village, theme, km, seoSlug }, attempt = 0) {
  const res = await fetch(`${BASE_URL}/api/routes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat: village.lat, lng: village.lng, km, theme }),
  });

  if (res.status === 503 && attempt < RETRY_ON_503) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 30);
    console.warn(`  ⏳  ${seoSlug}: 503, retrying in ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return generateRoute({ village, theme, km, seoSlug }, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

// ─── Stamp the SEO slug in Supabase ─────────────────────────────────────────

async function setSeoSlug(cacheKey, seoSlug) {
  const { error } = await sb.rpc("set_route_seo_slug", {
    p_cache_key: cacheKey,
    p_slug: seoSlug,
  });
  if (error) throw new Error(`set_route_seo_slug: ${error.message}`);
}

// ─── Direct upsert from seed script ──────────────────────────────────────────
// When the backend's persistRoute fails (PostgREST INT4 coercion of BIGINT
// POI IDs > 2,147,483,647), the route exists in memory but never reaches
// Supabase. This function inserts/updates the route row directly from the
// seed script — we always pass p_midpoint_poi_id = null to avoid the overflow.

async function upsertRouteDirect({ cacheKey, village, theme, km, data }) {
  // First check: is the route already in the DB? If so, don't overwrite
  // a valid midpoint_poi_id with null.
  const { data: existing } = await sb
    .from("routes")
    .select("id")
    .eq("cache_key", cacheKey)
    .limit(1);

  if (existing && existing.length > 0) return; // already persisted, skip

  // Cap INTEGER-column values at INT4 max (2 147 483 647) in case the route
  // engine produced an out-of-range value (e.g. Tobler blow-up for durationMin).
  const MAX_INT4 = 2_147_483_647;
  const safeAscentM    = Math.min(Math.round(data.ascentM   ?? 0), MAX_INT4);
  const safeDurationMin = Math.min(Math.round(data.durationMin ?? 0), MAX_INT4);

  const { error } = await sb.rpc("upsert_route", {
    p_cache_key: cacheKey,
    p_start_lng: village.lng,
    p_start_lat: village.lat,
    p_theme: theme,
    p_target_km: km,
    p_actual_km: data.actualKm,
    p_ascent_m: safeAscentM,
    p_duration_min: safeDurationMin,
    p_midpoint_poi_id: null, // always null — sidesteps PostgREST INT4 coercion
    p_geometry_geojson: JSON.stringify(data.geometry),
    p_score: data.score,
    p_narrative: data.narrative ?? null,
    p_engine_version: "v2",
  });
  if (error) throw new Error(`upsert_route (direct): ${error.message}`);
}

// ─── Check if already seeded ─────────────────────────────────────────────────

async function isAlreadySeeded(seoSlug) {
  const { data } = await sb
    .from("routes")
    .select("id")
    .eq("slug", seoSlug)
    .eq("is_seo_page", true)
    .limit(1);
  return (data ?? []).length > 0;
}

// ─── Worker ──────────────────────────────────────────────────────────────────

async function processJob(job) {
  const { seoSlug, village, theme, km } = job;

  // Skip if already stamped (idempotent re-runs).
  if (await isAlreadySeeded(seoSlug)) {
    console.log(`  ✓  ${seoSlug} (already seeded)`);
    return { status: "skipped" };
  }

  try {
    const data = await generateRoute(job);
    const cacheKey = data?.cacheKey;
    if (!cacheKey) throw new Error("No cacheKey in response");

    // Ensure the route is in the DB before stamping the slug.  The backend's
    // persistRoute can silently fail when a midpoint POI ID overflows
    // PostgREST's INT4 coercion.  Calling upsertRouteDirect from here fixes
    // the gap: it checks first (no-op if already persisted) and only inserts
    // when missing, always passing p_midpoint_poi_id = null.
    await upsertRouteDirect({ cacheKey, village, theme, km, data });
    await setSeoSlug(cacheKey, seoSlug);

    const cached = data.cached ? " (cache hit)" : "";
    console.log(`  ✅  ${seoSlug} → ${cacheKey}${cached}`);
    return { status: "ok", cached: data.cached };
  } catch (err) {
    console.error(`  ❌  ${seoSlug}: ${err.message}`);
    return { status: "error", error: err.message };
  }
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function runWithConcurrency(jobs, limit) {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < jobs.length) {
      const job = jobs[i++];
      results.push(await processJob(job));
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const jobs = buildJobs();

  console.log(`\nSeed-seo-routes`);
  console.log(`  BASE_URL  : ${BASE_URL}`);
  console.log(`  Routes    : ${jobs.length} (${FILTER ? `filtered to "${FILTER}"` : "all villages"})`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log("");

  if (jobs.length === 0) {
    console.warn(`No jobs matched filter "${FILTER}".`);
    return;
  }

  const t0 = Date.now();
  const results = await runWithConcurrency(jobs, CONCURRENCY);

  const ok      = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\nDone in ${elapsed}s — ✅ ${ok} generated, ⏭  ${skipped} skipped, ❌ ${errors} errors`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
