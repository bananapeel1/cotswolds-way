/**
 * Route Engine — generative circular walks via GraphHopper round-trip routing.
 *
 * Public surface:
 *   findOrGenerate(req)   — cache-aware entry point. Returns LoopResult or null.
 *   generateLoop(req)     — full algorithm, no caching. Slow.
 *   scoreLoop(loop, req)  — scoring function (exported for inspection/testing).
 *   buildCacheKey(req)    — deterministic cache key for a request.
 *
 * Routing backend: GraphHopper (local HTTP server, `algorithm=round_trip`).
 * Set GRAPHHOPPER_URL env var to override the default http://localhost:8989.
 *
 * Depends on:
 *   - GraphHopper running with foot+hike profiles (see graphhopper/config.yml)
 *   - pois table enriched with terrain_class, scenic_score, is_lunch_stop
 *     (see scripts/backfill-poi-terrain.mjs)
 *   - routes cache table + upsert_route / get_route_by_cache_key RPCs
 *     (see supabase/migrations/012_routes_table.sql)
 *   - candidate_midpoint_pois RPC installed
 *     (see scripts/post-ingest-routing-functions.sql)
 */

import { getAdminClient } from "@/lib/supabase-admin";

const GH_BASE = (process.env.GRAPHHOPPER_URL ?? "http://localhost:8989").replace(/\/$/, "");

// ─── Types ──────────────────────────────────────────────────────────────────

export type Theme = "ridge" | "valley" | "woodland";

export interface LoopRequest {
  startLat: number;
  startLng: number;
  /** Target loop length in km. Engine accepts ±25% on the actual result. */
  targetKm: number;
  theme: Theme;
}

export interface MidpointPoi {
  id: number;
  name: string;
  type: string;
  lng: number;
  lat: number;
  scenicScore: number;
  terrainClass: string | null;
  isLunchStop: boolean;
}

export interface LoopResult {
  cacheKey: string;
  geometry: GeoJSON.LineString;
  actualKm: number;
  ascentM: number;
  durationMin: number;
  midpointPoi: MidpointPoi;
  score: number;
  /** Set when the row was retrieved from cache. Null on fresh generation —
   *  callers (the API route) generate narration in a separate step. */
  narrative: string | null;
  /** True when this came from the routes cache table. */
  cached: boolean;
}

export const ENGINE_VERSION = "v2"; // v2 = GraphHopper backend

// ─── Cache key ──────────────────────────────────────────────────────────────

export function buildCacheKey(req: LoopRequest): string {
  // Coarse grid bucket (~2km) collapses near-by postcodes to the same route.
  // Distance bucketed to 5km bins.
  const latBucket = (Math.round(req.startLat * 50) / 50).toFixed(2);
  const lngBucket = (Math.round(req.startLng * 50) / 50).toFixed(2);
  const kmBucket = Math.max(5, Math.round(req.targetKm / 5) * 5);
  return `grid=${latBucket},${lngBucket}|km=${kmBucket}|theme=${req.theme}|v=${ENGINE_VERSION}`;
}

// ─── Find cached ────────────────────────────────────────────────────────────

export async function findCached(cacheKey: string): Promise<LoopResult | null> {
  const sb = getAdminClient();
  const { data, error } = await sb.rpc("get_route_by_cache_key", {
    p_cache_key: cacheKey,
  });
  if (error) {
    console.warn("[route-engine] cache lookup failed:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;
  const row = data[0];
  return {
    cacheKey: row.cache_key,
    geometry: JSON.parse(row.geojson),
    actualKm: Number(row.actual_km),
    ascentM: row.ascent_m,
    durationMin: row.duration_min,
    midpointPoi: {
      id: row.midpoint_poi_id ?? -1,
      name: row.midpoint_name ?? "(unknown)",
      type: row.midpoint_type ?? "unknown",
      lng: row.midpoint_lng ?? 0,
      lat: row.midpoint_lat ?? 0,
      scenicScore: row.midpoint_scenic_score ?? 5,
      terrainClass: row.midpoint_terrain_class,
      isLunchStop: row.midpoint_is_lunch_stop ?? false,
    },
    score: Number(row.score),
    narrative: row.narrative,
    cached: true,
  };
}

// ─── GraphHopper round-trip ──────────────────────────────────────────────────

type Coord = [number, number];

interface GhRoundTripResult {
  coords: Coord[];
  distanceM: number;
}

/**
 * Call GraphHopper's round_trip algorithm. Returns a closed loop polyline
 * starting and ending at (lat, lng) of approximately targetM metres.
 * seed controls the shape; try seeds 0..N for variety.
 */
async function callGraphhopperRoundTrip(
  lat: number,
  lng: number,
  targetM: number,
  seed: number,
): Promise<GhRoundTripResult | null> {
  const url =
    `${GH_BASE}/route` +
    `?point=${lat},${lng}` +
    `&profile=hike` +
    `&algorithm=round_trip` +
    `&round_trip.distance=${Math.round(targetM)}` +
    `&round_trip.seed=${seed}` +
    `&points_encoded=false`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[route-engine] GH returned", res.status, text.slice(0, 200));
      return null;
    }
    const json = (await res.json()) as {
      paths?: { points?: { coordinates: number[][] }; distance?: number }[];
    };
    const path = json?.paths?.[0];
    if (!path?.points?.coordinates || typeof path.distance !== "number") return null;
    return {
      coords: path.points.coordinates as Coord[],
      distanceM: path.distance,
    };
  } catch (err) {
    console.warn("[route-engine] GH round_trip threw:", err);
    return null;
  }
}

// ─── Generate ───────────────────────────────────────────────────────────────

interface CandidateRow {
  id: number;
  name: string;
  type: string;
  longitude: number;
  latitude: number;
  scenic_score: number | null;
  terrain_class: string | null;
  is_lunch_stop: boolean;
  distance_m: number;
}

/**
 * Generate a loop without consulting the cache.
 * Tries up to SEEDS different GH round_trip seeds; picks the best.
 * ~1-3s wallclock per call (GH is fast; elevation API is the slow bit).
 */
export async function generateLoop(req: LoopRequest): Promise<LoopResult | null> {
  const sb = getAdminClient();
  const targetM = req.targetKm * 1000;

  // Try a handful of seeds to get route variety; all run concurrently.
  const SEEDS = [0, 1, 2, 42];
  const routePromises = SEEDS.map((seed) =>
    callGraphhopperRoundTrip(req.startLat, req.startLng, targetM, seed),
  );
  const rawRoutes = await Promise.all(routePromises);

  // Filter: reject routes that are too far off target (±30%).
  type Candidate = {
    coords: Coord[];
    distanceM: number;
    midpoint: Coord;
    poi: MidpointPoi | null;
  };
  const candidates: Candidate[] = [];

  for (const r of rawRoutes) {
    if (!r) continue;
    const ratio = Math.abs(r.distanceM - targetM) / targetM;
    if (ratio > 0.30) continue;

    // Find the coord at ~50% of the route (the "lunch stop" area).
    const midpoint = routeMidpointCoord(r.coords);

    // Look for a theme-matching POI within 1.5 km of the midpoint.
    const poisRes = await sb.rpc("candidate_midpoint_pois", {
      start_lng: midpoint[0],
      start_lat: midpoint[1],
      theme_filter: req.theme,
      band_lo_m: 0,
      band_hi_m: 1500,
      max_candidates: 3,
    });
    const poiRows = (poisRes.data ?? []) as CandidateRow[];
    const poi: MidpointPoi | null =
      poiRows.length > 0
        ? {
            id: poiRows[0].id,
            name: poiRows[0].name,
            type: poiRows[0].type,
            lng: poiRows[0].longitude,
            lat: poiRows[0].latitude,
            scenicScore: poiRows[0].scenic_score ?? 5,
            terrainClass: poiRows[0].terrain_class,
            isLunchStop: poiRows[0].is_lunch_stop,
          }
        : null;

    candidates.push({ coords: r.coords, distanceM: r.distanceM, midpoint, poi });
  }

  if (candidates.length === 0) return null;

  // Pre-score to find the best candidate; elevation only for the winner.
  type Scored = Candidate & { prescore: number };
  const scored: Scored[] = candidates.map((c) => ({
    ...c,
    prescore: scoreLoop(
      {
        actualKm: c.distanceM / 1000,
        roadM: 0,
        overlap: 0.05, // GH round_trip minimises overlap; conservative estimate
        ascentM: 100,  // neutral pre-elevation guess
        durationMin: (c.distanceM / 1000) * 12,
        midpointScenicScore: c.poi?.scenicScore ?? 5,
      },
      req,
    ),
  }));
  scored.sort((a, b) => b.prescore - a.prescore);
  const winner = scored[0];

  // Elevation for the winner only.
  const elev = await sampleElevation(winner.coords);
  const { ascentM } = integrateElevation(elev);
  const durationHours = toblerHoursForProfile(winner.coords, elev);
  const durationMin = Math.round(durationHours * 60);

  const finalScore = scoreLoop(
    {
      actualKm: winner.distanceM / 1000,
      roadM: 0,
      overlap: 0.05,
      ascentM,
      durationMin,
      midpointScenicScore: winner.poi?.scenicScore ?? 5,
    },
    req,
  );

  // Synthesise a midpoint POI if none was found near the midpoint.
  const midpointPoi: MidpointPoi = winner.poi ?? {
    id: -1,
    name: "Route midpoint",
    type: "viewpoint",
    lng: winner.midpoint[0],
    lat: winner.midpoint[1],
    scenicScore: 5,
    terrainClass: null,
    isLunchStop: false,
  };

  const geometry: GeoJSON.LineString = {
    type: "LineString",
    coordinates: winner.coords,
  };

  return {
    cacheKey: buildCacheKey(req),
    geometry,
    actualKm: Math.round((winner.distanceM / 1000) * 10) / 10,
    ascentM,
    durationMin,
    midpointPoi,
    score: Math.round(finalScore * 100) / 100,
    narrative: null,
    cached: false,
  };
}

// ─── Cache-aware public entry ───────────────────────────────────────────────

export async function findOrGenerate(req: LoopRequest): Promise<LoopResult | null> {
  const cacheKey = buildCacheKey(req);

  const cached = await findCached(cacheKey);
  if (cached) return cached;

  const fresh = await generateLoop(req);
  if (!fresh) return null;

  await persistRoute(fresh, req);
  return fresh;
}

async function persistRoute(loop: LoopResult, req: LoopRequest): Promise<void> {
  const sb = getAdminClient();
  // Don't cache synthetic (-1) midpoints — they carry no real POI signal.
  const poiId = loop.midpointPoi.id >= 0 ? loop.midpointPoi.id : null;
  const { error } = await sb.rpc("upsert_route", {
    p_cache_key: loop.cacheKey,
    p_start_lng: req.startLng,
    p_start_lat: req.startLat,
    p_theme: req.theme,
    p_target_km: req.targetKm,
    p_actual_km: loop.actualKm,
    p_ascent_m: loop.ascentM,
    p_duration_min: loop.durationMin,
    p_midpoint_poi_id: poiId,
    p_geometry_geojson: JSON.stringify(loop.geometry),
    p_score: loop.score,
    p_narrative: loop.narrative,
    p_engine_version: ENGINE_VERSION,
  });
  if (error) {
    console.warn("[route-engine] failed to persist route:", error.message);
  }
}

/** Update narrative for an already-persisted cache row. Called from the API
 *  route after Gemini narration completes. */
export async function setNarrative(cacheKey: string, narrative: string): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.rpc("set_route_narrative", {
    p_cache_key: cacheKey,
    p_narrative: narrative,
  });
  if (error) {
    console.warn("[route-engine] failed to set narrative:", error.message);
  }
}

// ─── Scoring ────────────────────────────────────────────────────────────────

export interface ScoreInputs {
  actualKm: number;
  roadM: number;
  overlap: number;          // 0..1, share of route that doubles back on itself
  ascentM: number;
  durationMin: number;
  midpointScenicScore: number;
}

export function scoreLoop(s: ScoreInputs, req: LoopRequest): number {
  const distanceFit = Math.max(0, 1 - Math.abs(s.actualKm - req.targetKm) / req.targetKm);
  const overlapPenalty = Math.max(0, 1 - s.overlap);
  const roadAvoidance = Math.max(0, 1 - s.roadM / Math.max(1, s.actualKm * 1000));
  const poiBonus = Math.min(1, s.midpointScenicScore / 10);
  const elevationVariety = Math.tanh(s.ascentM / 250);
  // Naismith feasibility: under 8 hours = feasible.
  const timeFeasibility = s.durationMin <= 8 * 60 ? 1 : 0;

  return (
    distanceFit * 0.35 +
    overlapPenalty * 0.20 +
    roadAvoidance * 0.20 +
    poiBonus * 0.10 +
    elevationVariety * 0.10 +
    timeFeasibility * 0.05
  );
}

// ─── Geometry helpers ───────────────────────────────────────────────────────

/**
 * Return the coordinate at ~50% cumulative distance along a polyline.
 * Used to find the "lunch stop" zone of a generated loop.
 */
function routeMidpointCoord(coords: Coord[]): Coord {
  if (coords.length < 2) return coords[0] ?? [0, 0];
  let total = 0;
  const cumulative: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1], coords[i]);
    cumulative.push(total);
  }
  const half = total / 2;
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] >= half) return coords[i];
  }
  return coords[Math.floor(coords.length / 2)];
}

// ─── Elevation ──────────────────────────────────────────────────────────────

const ELEVATION_SAMPLES = 80;

/** Subsample coords down to ~80 points and fetch elevation via Open-Meteo. */
async function sampleElevation(coords: Coord[]): Promise<number[]> {
  const samples = subsample(coords, ELEVATION_SAMPLES);
  if (samples.length === 0) return [];
  const lats = samples.map((c) => c[1]).join(",");
  const lngs = samples.map((c) => c[0]).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[route-engine] Open-Meteo elevation failed:", res.status);
      return new Array(samples.length).fill(150); // sensible fallback for Cotswolds
    }
    const json = (await res.json()) as { elevation: number[] };
    return json.elevation ?? [];
  } catch (err) {
    console.warn("[route-engine] Open-Meteo elevation threw:", err);
    return new Array(samples.length).fill(150);
  }
}

function subsample<T>(arr: T[], targetCount: number): T[] {
  if (arr.length <= targetCount) return arr;
  const step = (arr.length - 1) / (targetCount - 1);
  return Array.from({ length: targetCount }, (_, i) => arr[Math.round(i * step)]);
}

function integrateElevation(elev: number[]): { ascentM: number; descentM: number } {
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < elev.length; i++) {
    const d = elev[i] - elev[i - 1];
    if (d > 0) ascent += d;
    else descent -= d;
  }
  return { ascentM: Math.round(ascent), descentM: Math.round(descent) };
}

/**
 * Tobler's hiking function over a real elevation profile.
 *   v(slope) = 6 · exp(-3.5 · |slope + 0.05|) km/h
 * Returns total walking hours.
 */
function toblerHoursForProfile(coords: Coord[], elevations: number[]): number {
  if (coords.length < 2) return 0;
  const eMap = (i: number) => {
    if (elevations.length === 0) return 150;
    const idx = Math.min(
      elevations.length - 1,
      Math.round((i * (elevations.length - 1)) / Math.max(1, coords.length - 1)),
    );
    return elevations[idx] ?? 150;
  };
  let hours = 0;
  for (let i = 1; i < coords.length; i++) {
    const dKm = haversineKm(coords[i - 1], coords[i]);
    if (dKm === 0) continue;
    const dzKm = (eMap(i) - eMap(i - 1)) / 1000;
    const slope = dzKm / dKm;
    const v = 6 * Math.exp(-3.5 * Math.abs(slope + 0.05));
    hours += dKm / v;
  }
  return hours;
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
