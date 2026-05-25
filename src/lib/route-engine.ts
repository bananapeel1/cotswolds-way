/**
 * Route Engine — generative circular walks via GraphHopper round-trip routing.
 *
 * Public surface:
 *   findOrGenerate(req)   — cache-aware entry point. Returns LoopResult or null.
 *   generateLoop(req)     — full algorithm, no caching. Slow.
 *   scoreLoop(loop, req)  — scoring function (exported for inspection/testing).
 *   buildCacheKey(req)    — deterministic cache key for a request.
 *   pingGraphHopper()     — cheap liveness probe; lets callers distinguish
 *                           "GH unreachable" from "no loop in this area".
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

// ─── GCP service-to-service auth ────────────────────────────────────────────
//
// GraphHopper runs as a private Cloud Run service (`--no-allow-unauthenticated`),
// so every call from the Next.js runtime must include an OIDC ID token in the
// Authorization header. Node's plain `fetch` does not auto-inject one — even
// when running on Firebase App Hosting where the underlying SA *has*
// `roles/run.invoker` on the target service.
//
// We fetch the token from the GCP metadata server (works in App Hosting,
// Cloud Run, Cloud Functions 2nd gen, GCE), cache it in-process, and refresh
// ~10 min before its 1h expiry. K_SERVICE is set in every Cloud Run-based
// runtime so we use it as the "am I on GCP?" gate; in local dev the metadata
// server is unreachable and we fall back to unauthenticated calls (localhost
// GraphHopper accepts those).

let cachedIdToken: { token: string; expiresAt: number; audience: string } | null = null;

async function getGcpIdToken(audience: string): Promise<string | null> {
  if (!process.env.K_SERVICE) return null;
  if (
    cachedIdToken &&
    cachedIdToken.audience === audience &&
    cachedIdToken.expiresAt > Date.now()
  ) {
    return cachedIdToken.token;
  }
  try {
    const url =
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity` +
      `?audience=${encodeURIComponent(audience)}`;
    const res = await fetch(url, {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const token = (await res.text()).trim();
    cachedIdToken = {
      token,
      audience,
      // Google ID tokens are valid 1h; refresh 10 min early.
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return token;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper that automatically attaches a GCP OIDC ID token when the
 * runtime is on GCP. Same signature as `fetch` but takes a path (joined to
 * GH_BASE) rather than a full URL, since every caller uses the same base.
 */
async function ghFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getGcpIdToken(GH_BASE);
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${GH_BASE}${path}`, { ...init, headers });
}

/**
 * Lightweight liveness probe against GraphHopper. Lets the API layer return
 * a structured 503 when GH is down rather than waiting for findOrGenerate to
 * fail opaquely. Returns true on 200, false on any non-2xx, network error,
 * or timeout. Never throws.
 *
 * NOTE: AbortSignal.timeout() starts counting from the moment it is created.
 * getGcpIdToken() (called inside ghFetch) can take up to 2 s on a cold module
 * because it hits the GCP metadata server. We pre-warm the token here so the
 * AbortSignal only measures the actual GH network round-trip, not the auth
 * overhead.
 */
export async function pingGraphHopper(timeoutMs = 1500): Promise<boolean> {
  try {
    // Pre-warm the OIDC token *before* starting the timeout clock so that the
    // signal only covers the real GH health request.
    await getGcpIdToken(GH_BASE);
    const res = await ghFetch("/health", {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type Theme = "ridge" | "valley" | "woodland" | "mixed";

/** How hard a walker wants the day. Tunes the scoring's ascent preference. */
export type Difficulty = "easy" | "moderate" | "strenuous";

/** Walking pace. Tunes durationMin via a Naismith multiplier. */
export type Pace = "leisurely" | "steady" | "brisk";

/** Whether the loop must pass a lunch-suitable POI. Affects candidate ranking
 *  and (for "required") strictly filters POI choice — different POI → likely
 *  different geometry, so this is part of the cache key. */
export type LunchStop = "required" | "preferred" | "none";

export interface LoopRequest {
  startLat: number;
  startLng: number;
  /** Target loop length in km. Engine accepts ±25% on the actual result. */
  targetKm: number;
  theme: Theme;
  difficulty?: Difficulty;
  pace?: Pace;
  lunchStop?: LunchStop;
}

/** Resolve LoopRequest's optional customization fields to their defaults. */
export function resolveLoopRequest(req: LoopRequest): Required<LoopRequest> {
  return {
    ...req,
    difficulty: req.difficulty ?? "moderate",
    pace: req.pace ?? "steady",
    lunchStop: req.lunchStop ?? "preferred",
  };
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
  //
  // Only params that affect the GEOMETRY belong in the cache key. Difficulty
  // and pace tune score + duration but use the same underlying polyline, so
  // they're re-derived at serve time from the cached ascentM / actualKm.
  // LunchStop = required forces a different POI → different geometry, so it
  // does belong in the key.
  const latBucket = (Math.round(req.startLat * 50) / 50).toFixed(2);
  const lngBucket = (Math.round(req.startLng * 50) / 50).toFixed(2);
  const kmBucket = Math.max(5, Math.round(req.targetKm / 5) * 5);
  const lunch = req.lunchStop ?? "preferred";
  return `grid=${latBucket},${lngBucket}|km=${kmBucket}|theme=${req.theme}|lunch=${lunch}|v=${ENGINE_VERSION}`;
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
  // GraphHopper round_trip always returns a LineString; cast is safe.
  const geometry = JSON.parse(row.geojson) as GeoJSON.LineString;

  // When midpoint_poi_id is -1 (synthetic) or null, the SQL LEFT JOIN on pois
  // returns NULL for all poi columns. Fall back to computing the midpoint from
  // the geometry so the map marker renders correctly.
  let midpointLng: number = row.midpoint_lng ?? 0;
  let midpointLat: number = row.midpoint_lat ?? 0;
  if (!midpointLng || !midpointLat) {
    const coords = geometry.coordinates as [number, number][];
    const mid = routeMidpointCoord(coords);
    midpointLng = mid[0];
    midpointLat = mid[1];
  }

  return {
    cacheKey: row.cache_key,
    geometry,
    actualKm: Number(row.actual_km),
    ascentM: row.ascent_m,
    durationMin: row.duration_min,
    midpointPoi: {
      id: row.midpoint_poi_id ?? -1,
      name: row.midpoint_name ?? "Route midpoint",
      type: row.midpoint_type ?? "viewpoint",
      lng: midpointLng,
      lat: midpointLat,
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
  const path =
    `/route` +
    `?point=${lat},${lng}` +
    `&profile=hike` +
    `&algorithm=round_trip` +
    `&round_trip.distance=${Math.round(targetM)}` +
    `&round_trip.seed=${seed}` +
    `&points_encoded=false`;

  try {
    const res = await ghFetch(path, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[route-engine] GH returned", res.status, text.slice(0, 200));
      return null;
    }
    const json = (await res.json()) as {
      paths?: { points?: { coordinates: number[][] }; distance?: number }[];
    };
    // Renamed from `path` to avoid colliding with the URL-path variable
    // above. The outer `path` is the request URL fragment; this is one of
    // GraphHopper's "paths" — a candidate route.
    const ghPath = json?.paths?.[0];
    if (!ghPath?.points?.coordinates || typeof ghPath.distance !== "number") {
      return null;
    }
    return {
      coords: ghPath.points.coordinates as Coord[],
      distanceM: ghPath.distance,
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
    // For lunchStop=required we ask for a wider candidate set because we'll
    // filter out non-lunch-stop rows in JS — the SQL function doesn't know
    // about that constraint and changing its signature would force a
    // migration we don't need.
    const lunchPref = req.lunchStop ?? "preferred";
    const maxCandidates = lunchPref === "required" ? 12 : 3;
    const poisRes = await sb.rpc("candidate_midpoint_pois", {
      start_lng: midpoint[0],
      start_lat: midpoint[1],
      theme_filter: req.theme,
      band_lo_m: 0,
      band_hi_m: 1500,
      max_candidates: maxCandidates,
    });
    let poiRows = (poisRes.data ?? []) as CandidateRow[];

    if (lunchPref === "required") {
      poiRows = poiRows.filter((p) => p.is_lunch_stop);
    } else if (lunchPref === "preferred") {
      // Stable sort: lunch stops first, then by scenic_score within each tier.
      poiRows = [...poiRows].sort((a, b) => {
        const lunchDelta = Number(b.is_lunch_stop) - Number(a.is_lunch_stop);
        if (lunchDelta !== 0) return lunchDelta;
        return (b.scenic_score ?? 5) - (a.scenic_score ?? 5);
      });
    } else if (lunchPref === "none") {
      // Non-lunch first; users picking "none" likely want viewpoints, peaks,
      // or watercourses rather than another pub.
      poiRows = [...poiRows].sort((a, b) => {
        const lunchDelta = Number(a.is_lunch_stop) - Number(b.is_lunch_stop);
        if (lunchDelta !== 0) return lunchDelta;
        return (b.scenic_score ?? 5) - (a.scenic_score ?? 5);
      });
    }

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

/**
 * Thrown when an upstream dependency the engine needs (GraphHopper,
 * Open-Meteo, Supabase) is unreachable. The API layer catches this to
 * return a structured 503 `service_degraded` instead of a generic 500.
 *
 * Use the `service` field for diagnostic logging — it surfaces in the
 * `[routes-engine] outcome=degraded reason=...` metric line.
 */
export class ServiceDegradedError extends Error {
  constructor(public readonly service: string) {
    super(`service degraded: ${service}`);
    this.name = "ServiceDegradedError";
  }
}

export interface FindOrGenerateOptions {
  /**
   * Called only when the cache misses, before invoking generateLoop. Use to
   * assert that downstream services (e.g., GraphHopper) are reachable.
   * Throw — typically a ServiceDegradedError — to abort generation; the
   * throw propagates to the caller of findOrGenerate.
   *
   * The hook is intentionally not run on cache hits so warm-path latency
   * doesn't pay for a service we won't call.
   */
  beforeGenerate?: () => Promise<void>;
}

export async function findOrGenerate(
  req: LoopRequest,
  opts: FindOrGenerateOptions = {},
): Promise<LoopResult | null> {
  const cacheKey = buildCacheKey(req);

  const cached = await findCached(cacheKey);
  if (cached) return applyCustomizations(cached, req);

  if (opts.beforeGenerate) await opts.beforeGenerate();

  const fresh = await generateLoop(req);
  if (!fresh) return null;

  // Persist the baseline (steady-pace, moderate-difficulty) row so other
  // (difficulty, pace) combos reuse the same geometry. Apply the caller's
  // customisations to what we return.
  await persistRoute(fresh, req);
  return applyCustomizations(fresh, req);
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

// ─── SEO slug management ─────────────────────────────────────────────────────

/**
 * Extends LoopResult with start-point coordinates, the SEO slug, and the
 * theme string. Returned by findBySlug, used only on /walks/[slug] SEO pages.
 */
export interface SeoRouteData extends LoopResult {
  slug: string;
  theme: string;
  startLat: number;
  startLng: number;
}

/**
 * Look up an SEO walk page by its human-readable slug
 * (e.g. "stow-on-the-wold-ridge-walk-12km").
 * Returns null if no such SEO page is found.
 */
export async function findBySlug(slug: string): Promise<SeoRouteData | null> {
  const sb = getAdminClient();
  const { data, error } = await sb.rpc("get_route_by_slug", { p_slug: slug });
  if (error) {
    console.warn("[route-engine] get_route_by_slug failed:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;
  const row = data[0];
  const geometry = JSON.parse(row.geojson) as GeoJSON.LineString;

  let midpointLng: number = row.midpoint_lng ?? 0;
  let midpointLat: number = row.midpoint_lat ?? 0;
  if (!midpointLng || !midpointLat) {
    const coords = geometry.coordinates as [number, number][];
    const mid = routeMidpointCoord(coords);
    midpointLng = mid[0];
    midpointLat = mid[1];
  }

  return {
    cacheKey: row.cache_key,
    geometry,
    actualKm: Number(row.actual_km),
    ascentM: row.ascent_m,
    durationMin: row.duration_min,
    midpointPoi: {
      id: row.midpoint_poi_id ?? -1,
      name: row.midpoint_name ?? "Route midpoint",
      type: row.midpoint_type ?? "viewpoint",
      lng: midpointLng,
      lat: midpointLat,
      scenicScore: row.midpoint_scenic_score ?? 5,
      terrainClass: row.midpoint_terrain_class,
      isLunchStop: row.midpoint_is_lunch_stop ?? false,
    },
    score: Number(row.score),
    narrative: row.narrative,
    cached: true,
    slug: row.slug,
    theme: row.theme as string,
    startLat: Number(row.start_lat),
    startLng: Number(row.start_lng),
  };
}

/**
 * Stamp a cached route row as an SEO landing page.
 * Called by the seed script after generating each route.
 */
export async function setSeoSlug(cacheKey: string, slug: string): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.rpc("set_route_seo_slug", {
    p_cache_key: cacheKey,
    p_slug: slug,
  });
  if (error) {
    console.warn("[route-engine] setSeoSlug failed:", error.message);
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

/**
 * Difficulty-aware elevation fitness. Gaussian bell curve centred on the
 * ideal ascent for the chosen difficulty: easy walkers want a low-ascent
 * route, strenuous walkers want significant climb, moderate is in between.
 *
 * Previously this was Math.tanh(ascentM/250) — monotonically rewarding more
 * climb, which scored "strenuous" routes higher across the board regardless
 * of user intent. The bell-curve makes the engine respect easy walkers'
 * preference for flat days.
 */
function elevationFitness(ascentM: number, difficulty: Difficulty): number {
  const ideal: Record<Difficulty, number> = { easy: 80, moderate: 175, strenuous: 325 };
  const tolerance: Record<Difficulty, number> = { easy: 75, moderate: 175, strenuous: 200 };
  return Math.exp(-Math.pow((ascentM - ideal[difficulty]) / tolerance[difficulty], 2));
}

export function scoreLoop(s: ScoreInputs, req: LoopRequest): number {
  const difficulty = req.difficulty ?? "moderate";
  const distanceFit = Math.max(0, 1 - Math.abs(s.actualKm - req.targetKm) / req.targetKm);
  const overlapPenalty = Math.max(0, 1 - s.overlap);
  const roadAvoidance = Math.max(0, 1 - s.roadM / Math.max(1, s.actualKm * 1000));
  const poiBonus = Math.min(1, s.midpointScenicScore / 10);
  const elevationFit = elevationFitness(s.ascentM, difficulty);
  // Naismith feasibility: under 8 hours = feasible. Uses the durationMin
  // already adjusted for pace, so brisk walkers can score longer walks
  // higher than steady walkers can.
  const timeFeasibility = s.durationMin <= 8 * 60 ? 1 : 0;

  return (
    distanceFit * 0.35 +
    overlapPenalty * 0.20 +
    roadAvoidance * 0.20 +
    poiBonus * 0.10 +
    elevationFit * 0.10 +
    timeFeasibility * 0.05
  );
}

// ─── Per-request customization ──────────────────────────────────────────────

const PACE_MULTIPLIER: Record<Pace, number> = {
  leisurely: 1.2,
  steady: 1.0,
  brisk: 0.85,
};

/**
 * Apply per-request customisations (difficulty, pace) to a LoopResult that
 * may have come from cache. Returns a new LoopResult with score and
 * durationMin recomputed using the caller's preferences. Doesn't mutate.
 *
 * Why this lives outside the cache layer: difficulty and pace don't change
 * the underlying polyline — only how we *describe* and *time* it. Storing
 * a row per (lat-bin, km-bin, theme, lunchStop, difficulty, pace) would
 * fragment the cache 9×; we keep one row per geometry and re-derive these
 * values at serve time.
 */
function applyCustomizations(loop: LoopResult, req: LoopRequest): LoopResult {
  const pace = req.pace ?? "steady";
  const adjustedDurationMin = Math.round(loop.durationMin * PACE_MULTIPLIER[pace]);
  const score = scoreLoop(
    {
      actualKm: loop.actualKm,
      roadM: 0,
      overlap: 0.05,
      ascentM: loop.ascentM,
      durationMin: adjustedDurationMin,
      midpointScenicScore: loop.midpointPoi.scenicScore,
    },
    req,
  );
  return {
    ...loop,
    durationMin: adjustedDurationMin,
    score: Math.round(score * 100) / 100,
  };
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
