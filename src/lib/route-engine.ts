/**
 * Route Engine — generative circular walks anchored on midpoint POIs.
 *
 * Public surface:
 *   findOrGenerate(req)   — cache-aware entry point. Returns LoopResult or null.
 *   generateLoop(req)     — full algorithm, no caching. Slow.
 *   scoreLoop(loop, req)  — scoring function (exported for inspection/testing).
 *   buildCacheKey(req)    — deterministic cache key for a request.
 *
 * Depends on:
 *   - osm2pgrouting having populated `ways` and `ways_vertices_pgr` tables
 *     (see scripts/ingest-osm-aonb.sh)
 *   - pois table enriched with terrain_class, scenic_score, is_lunch_stop
 *     (see scripts/backfill-poi-terrain.mjs)
 *   - Routing helper SQL functions installed
 *     (see scripts/post-ingest-routing-functions.sql)
 *   - routes cache table + upsert_route / get_route_by_cache_key RPCs
 *     (see supabase/migrations/012_routes_table.sql)
 */

import { getAdminClient } from "@/lib/supabase-admin";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Theme = "ridge" | "valley" | "woodland";

export interface LoopRequest {
  startLat: number;
  startLng: number;
  /** Target loop length in km. Engine accepts ±20% on the actual result. */
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
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
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

export const ENGINE_VERSION = "v1";

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
      id: row.midpoint_poi_id,
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

interface PathLegRow {
  geojson: string;
  total_m: number;
  road_m: number;
  edge_ids: number[];
}

/** Generate a loop without consulting the cache. ~2-5s wallclock per call
 *  (5 candidate POIs × 2 pgr_dijkstra calls + 1 elevation batch). */
export async function generateLoop(req: LoopRequest): Promise<LoopResult | null> {
  const sb = getAdminClient();

  // 1. Snap start to graph.
  const startVidRes = await sb.rpc("nearest_way_vertex", {
    p_lng: req.startLng,
    p_lat: req.startLat,
  });
  if (startVidRes.error || startVidRes.data == null) {
    console.warn("[route-engine] failed to snap start to graph:", startVidRes.error?.message);
    return null;
  }
  const startVid = startVidRes.data as number;

  // 2. Find theme-matching POIs in the distance band.
  const targetM = req.targetKm * 1000;
  const candidatesRes = await sb.rpc("candidate_midpoint_pois", {
    start_lng: req.startLng,
    start_lat: req.startLat,
    theme_filter: req.theme,
    band_lo_m: targetM * 0.40,
    band_hi_m: targetM * 0.55,
    max_candidates: 5,
  });
  if (candidatesRes.error) {
    console.warn("[route-engine] candidate POI query failed:", candidatesRes.error.message);
    return null;
  }
  const candidates = (candidatesRes.data ?? []) as CandidateRow[];
  if (candidates.length === 0) {
    return null;
  }

  // 3. For each candidate, build a loop. Track the best.
  type Scored = {
    geometry: GeoJSON.LineString;
    actualKm: number;
    roadM: number;
    overlap: number;
    midpointPoi: MidpointPoi;
    edgeIds: number[];
  };
  const built: Scored[] = [];

  for (const c of candidates) {
    const poiVidRes = await sb.rpc("nearest_way_vertex", {
      p_lng: c.longitude,
      p_lat: c.latitude,
    });
    if (poiVidRes.error || poiVidRes.data == null) continue;
    const poiVid = poiVidRes.data as number;

    const outRes = await sb.rpc("shortest_path_between", {
      start_vid: startVid,
      end_vid: poiVid,
    });
    if (outRes.error || !outRes.data || outRes.data.length === 0) continue;
    const outLeg = outRes.data[0] as PathLegRow;
    if (!outLeg.geojson) continue;

    const retRes = await sb.rpc("shortest_path_avoiding", {
      start_vid: poiVid,
      end_vid: startVid,
      avoid_edges: outLeg.edge_ids,
    });
    if (retRes.error || !retRes.data || retRes.data.length === 0) continue;
    const retLeg = retRes.data[0] as PathLegRow;
    if (!retLeg.geojson) continue;

    const combined = combineLegs(outLeg.geojson, retLeg.geojson);
    if (!combined) continue;

    const actualKm = (outLeg.total_m + retLeg.total_m) / 1000;
    // Reject if the loop is way off target — saves elevation API quota.
    if (Math.abs(actualKm - req.targetKm) / req.targetKm > 0.30) continue;

    const overlap = overlapRatio(outLeg.edge_ids, retLeg.edge_ids);

    built.push({
      geometry: combined,
      actualKm,
      roadM: outLeg.road_m + retLeg.road_m,
      overlap,
      edgeIds: [...outLeg.edge_ids, ...retLeg.edge_ids],
      midpointPoi: {
        id: c.id,
        name: c.name,
        type: c.type,
        lng: c.longitude,
        lat: c.latitude,
        scenicScore: c.scenic_score ?? 5,
        terrainClass: c.terrain_class,
        isLunchStop: c.is_lunch_stop,
      },
    });
  }

  if (built.length === 0) return null;

  // 4. Quick prescore on cheap features; pick top 1, then do elevation for the winner.
  built.sort((a, b) => prescore(b, req) - prescore(a, req));
  const winner = built[0];

  // 5. Elevation profile for the winner via Open-Meteo (one batch).
  const elev = await sampleElevation(winner.geometry.coordinates);
  const { ascentM } = integrateElevation(elev);
  const durationHours = toblerHoursForProfile(winner.geometry.coordinates, elev);
  const durationMin = Math.round(durationHours * 60);

  // 6. Final score with elevation factored in.
  const finalScore = scoreLoop(
    {
      actualKm: winner.actualKm,
      roadM: winner.roadM,
      overlap: winner.overlap,
      ascentM,
      durationMin,
      midpointScenicScore: winner.midpointPoi.scenicScore,
    },
    req,
  );

  return {
    cacheKey: buildCacheKey(req),
    geometry: winner.geometry,
    actualKm: Math.round(winner.actualKm * 10) / 10,
    ascentM,
    durationMin,
    midpointPoi: winner.midpointPoi,
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
  const { error } = await sb.rpc("upsert_route", {
    p_cache_key: loop.cacheKey,
    p_start_lng: req.startLng,
    p_start_lat: req.startLat,
    p_theme: req.theme,
    p_target_km: req.targetKm,
    p_actual_km: loop.actualKm,
    p_ascent_m: loop.ascentM,
    p_duration_min: loop.durationMin,
    p_midpoint_poi_id: loop.midpointPoi.id,
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
  overlap: number;          // 0..1, share of outbound edges reused by return
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

/** Cheap pre-score for ranking candidates before we spend on the elevation API. */
function prescore(
  c: { actualKm: number; roadM: number; overlap: number; midpointPoi: MidpointPoi },
  req: LoopRequest,
): number {
  return scoreLoop(
    {
      actualKm: c.actualKm,
      roadM: c.roadM,
      overlap: c.overlap,
      ascentM: 100, // neutral guess pre-elevation
      durationMin: c.actualKm * 12, // ~5km/h flat baseline
      midpointScenicScore: c.midpointPoi.scenicScore,
    },
    req,
  );
}

// ─── Geometry helpers ───────────────────────────────────────────────────────

type Coord = [number, number];

/**
 * Glue the outbound + return legs into one LineString. PostGIS sometimes
 * returns MultiLineString when ST_LineMerge can't simplify; we flatten in
 * either case. Caller passes the GeoJSON strings from the RPC.
 *
 * Drops the duplicated POI vertex where leg 1 ends and leg 2 begins.
 */
function combineLegs(outGeojson: string, retGeojson: string): GeoJSON.LineString | null {
  const outCoords = flattenCoords(outGeojson);
  const retCoords = flattenCoords(retGeojson);
  if (outCoords.length < 2 || retCoords.length < 2) return null;
  // Drop the seam vertex if it duplicates.
  const seamSame =
    Math.abs(outCoords[outCoords.length - 1][0] - retCoords[0][0]) < 1e-7 &&
    Math.abs(outCoords[outCoords.length - 1][1] - retCoords[0][1]) < 1e-7;
  const combined = seamSame
    ? [...outCoords, ...retCoords.slice(1)]
    : [...outCoords, ...retCoords];
  return { type: "LineString", coordinates: combined };
}

function flattenCoords(geojson: string): Coord[] {
  try {
    const g = JSON.parse(geojson);
    if (g.type === "LineString") return g.coordinates as Coord[];
    if (g.type === "MultiLineString") {
      return (g.coordinates as Coord[][]).flat();
    }
    return [];
  } catch {
    return [];
  }
}

function overlapRatio(outEdges: number[], retEdges: number[]): number {
  if (outEdges.length === 0) return 0;
  const retSet = new Set(retEdges);
  let shared = 0;
  for (const e of outEdges) if (retSet.has(e)) shared++;
  return shared / outEdges.length;
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
 * Tobler's hiking function over a real elevation profile. Same formula as
 * estimateWalkingTime() in plan-engine.ts, but generalised to an arbitrary
 * polyline + sampled elevations rather than the Cotswold Way mile profile.
 *
 *   v(slope) = 6 · exp(-3.5 · |slope + 0.05|) km/h
 *
 * Returns total walking hours, no scalar applied (caller can multiply).
 */
function toblerHoursForProfile(coords: Coord[], elevations: number[]): number {
  if (coords.length < 2) return 0;
  // Align elevations to coord indices via proportional mapping.
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
