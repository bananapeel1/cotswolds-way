/**
 * Route Engine — generative circular walks via GraphHopper round-trip routing.
 *
 * Public surface:
 *   findOrGenerate(req)   — cache-aware entry point. Returns LoopResult or null.
 *   generateLoop(req)     — full algorithm, no caching. Slow.
 *   scoreLoop(loop, req)  — scoring function (exported for inspection/testing).
 *   buildCacheKey(req)    — deterministic cache key for a request.
 *   pingGraphHopper()     — liveness probe (kept for external health checks).
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
import { isOpenAt, type OpeningStatus } from "@/lib/opening-hours";

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

/** A "must-pass" stop the walker dropped on the map. The loop is routed to go
 *  through these in order. label is the reverse-geocoded name, for narrative. */
export interface Waypoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface LoopRequest {
  startLat: number;
  startLng: number;
  /** Target loop length in km. Engine accepts ±25% on the actual result.
   *  Ignored when `waypoints` are present — then the stops set the length. */
  targetKm: number;
  theme: Theme;
  difficulty?: Difficulty;
  pace?: Pace;
  lunchStop?: LunchStop;
  /** Must-pass stops. When non-empty the engine routes a loop THROUGH them
   *  (start → stops → start) instead of generating a round_trip of targetKm;
   *  the distance becomes whatever that takes. Geometry-affecting → part of
   *  the cache key. */
  waypoints?: Waypoint[];
  /** When true, the cache key uses the EXACT start + distance instead of the
   *  coarse grid/bin bucket — a bespoke, per-request route. Set for
   *  user-initiated walks; left false for SEO sample pages (which keep the
   *  coarse, high-reuse key). See buildCacheKey. */
  exact?: boolean;
  /** Free-text statement of what the walker most cares about (from the intent
   *  front-door, e.g. "amazing views and a good pub"). Re-weights scoring and
   *  steers the narrative. Empty/absent → identical behaviour to before. Does
   *  NOT affect geometry, so it is NOT part of the cache key. */
  emphasis?: string;
  /** ISO date (YYYY-MM-DD) the walker plans to walk. When set, candidate POI
   *  opening_hours are evaluated at 13:00 on this date; in lunchStop=required
   *  mode candidates whose status is definitely "closed" are filtered out
   *  before ranking. NOT part of the cache key (doesn't affect geometry —
   *  openingStatus is computed at serve time from the cached POI row). */
  walkDate?: string;
}

/** Resolve LoopRequest's optional customization fields to their defaults. */
export function resolveLoopRequest(req: LoopRequest): Required<LoopRequest> {
  return {
    ...req,
    difficulty: req.difficulty ?? "moderate",
    pace: req.pace ?? "steady",
    lunchStop: req.lunchStop ?? "preferred",
    exact: req.exact ?? false,
    emphasis: req.emphasis ?? "",
    waypoints: req.waypoints ?? [],
    walkDate: req.walkDate ?? "",
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
  /** True when the route polyline actually passes within ~50 m of this POI —
   *  i.e. the walker following the GPX file reaches its door. False when the
   *  POI is "near" the loop's midpoint but the line goes around it. Derived
   *  fresh at read time from a polyline-vertex sweep, never persisted. */
  viaPoi: boolean;
  /** Raw OSM opening_hours string from the joined POI row. Null when the POI
   *  has no opening_hours tag (the common case for rural pubs). */
  openingHours: string | null;
  /** Day-and-time-aware open status at 13:00 on the walker's chosen walkDate.
   *  "unknown" when openingHours is null, unparseable, or no walkDate was
   *  supplied. Computed per request — never persisted to the routes table. */
  openingStatus: OpeningStatus;
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

export function buildCacheKey(req: LoopRequest, seed: number = 0): string {
  // Only params that affect the GEOMETRY belong in the cache key. Difficulty
  // and pace tune score + duration but use the same underlying polyline, so
  // they're re-derived at serve time from the cached ascentM / actualKm.
  // LunchStop = required forces a different POI → different geometry, so it
  // does belong in the key. walkDate does NOT — openingStatus is per-request.
  //
  // Two tiers (see LoopRequest.exact):
  //   - bespoke (exact): full-precision start (5dp ≈ 1.1 m) + exact distance
  //     (1dp ≈ 100 m). Near-zero reuse — that's the point: every user request
  //     is its own route. Still persisted + shareable (the key avoids '_'/'~'
  //     so share-slug round-trips it).
  //   - sample (coarse): ~2 km grid bucket + 5 km distance bins, collapsing
  //     near-by starts to one route. Powers the pre-seeded SEO pages. UNCHANGED
  //     from the original format so the 180 existing keys still resolve.
  //
  // `seed` is appended ONLY when ≠ 0 and only on the exact path. This is what
  // lets the multi-candidate flow store 3 alternative loops for the same
  // request as 3 distinct rows (one per seed), each with its own share-link
  // slug. seed=0 omits the suffix so seed-unaware code (SEO, legacy callers)
  // keeps producing the original key format.
  const lunch = req.lunchStop ?? "preferred";
  // Must-pass stops define the geometry entirely (start + ordered stops). km,
  // theme and lunch don't change the polyline in this mode, so they're left out
  // of the key — only start, the stops, and the engine version matter. (No '_'
  // or '~' so share-slug round-trips it; the page decodes %2C/%3B.)
  if (req.waypoints && req.waypoints.length > 0) {
    const lat = req.startLat.toFixed(5);
    const lng = req.startLng.toFixed(5);
    const via = req.waypoints
      .map((w) => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`)
      .join(";");
    return `exact=${lat},${lng}|via=${via}|v=${ENGINE_VERSION}`;
  }
  if (req.exact) {
    const lat = req.startLat.toFixed(5);
    const lng = req.startLng.toFixed(5);
    const km = req.targetKm.toFixed(1);
    const seedSuffix = seed === 0 ? "" : `|seed=${seed}`;
    return `exact=${lat},${lng}|km=${km}|theme=${req.theme}|lunch=${lunch}${seedSuffix}|v=${ENGINE_VERSION}`;
  }
  const latBucket = (Math.round(req.startLat * 50) / 50).toFixed(2);
  const lngBucket = (Math.round(req.startLng * 50) / 50).toFixed(2);
  const kmBucket = Math.max(5, Math.round(req.targetKm / 5) * 5);
  return `grid=${latBucket},${lngBucket}|km=${kmBucket}|theme=${req.theme}|lunch=${lunch}|v=${ENGINE_VERSION}`;
}

// ─── Find cached ────────────────────────────────────────────────────────────

export async function findCached(
  cacheKey: string,
  walkDate?: string,
): Promise<LoopResult | null> {
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
  const coords = geometry.coordinates as Coord[];

  // When midpoint_poi_id is -1 (synthetic) or null, the SQL LEFT JOIN on pois
  // returns NULL for all poi columns. Fall back to computing the midpoint from
  // the geometry so the map marker renders correctly.
  let midpointLng: number = row.midpoint_lng ?? 0;
  let midpointLat: number = row.midpoint_lat ?? 0;
  if (!midpointLng || !midpointLat) {
    const mid = routeMidpointCoord(coords);
    midpointLng = mid[0];
    midpointLat = mid[1];
  }

  const openingHours: string | null = row.midpoint_opening_hours ?? null;
  // viaPoi is recomputed at read time from the polyline geometry — never
  // persisted, so old cached rows automatically benefit from the new logic
  // without a backfill.
  const viaPoi = isPoiOnPolyline(coords, [midpointLng, midpointLat]);

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
      viaPoi,
      openingHours,
      openingStatus: evaluateOpeningStatus(openingHours, walkDate),
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

interface GhPath {
  points?: { coordinates: number[][] };
  distance?: number;
}

/**
 * Shared GraphHopper request → parsed `paths` array. Centralises error
 * semantics: 401/403 (IAM) and 5xx (container down) become ServiceDegradedError
 * so the API returns a structured 503 rather than collapsing to a 404; other
 * non-OK responses or a missing body return [] (caller treats as "no route").
 */
async function ghFetchPaths(path: string): Promise<GhPath[]> {
  try {
    const res = await ghFetch(path, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403 || res.status >= 500) {
        throw new ServiceDegradedError("graphhopper_http_" + res.status);
      }
      console.warn("[route-engine] GH returned", res.status, text.slice(0, 200));
      return [];
    }
    const json = (await res.json()) as { paths?: GhPath[] };
    return json?.paths ?? [];
  } catch (err) {
    if (err instanceof ServiceDegradedError) throw err;
    // Network error (connection refused, DNS failure, timeout) — GH is down.
    throw new ServiceDegradedError("graphhopper_unreachable");
  }
}

function pathToResult(p: GhPath | undefined): GhRoundTripResult | null {
  if (!p?.points?.coordinates || typeof p.distance !== "number") return null;
  return { coords: p.points.coordinates as Coord[], distanceM: p.distance };
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
    `/route?point=${lat},${lng}&profile=hike&algorithm=round_trip` +
    `&round_trip.distance=${Math.round(targetM)}&round_trip.seed=${seed}` +
    `&points_encoded=false`;
  return pathToResult((await ghFetchPaths(path))[0]);
}

/**
 * Standard GraphHopper routing through an ordered list of points (each
 * [lng, lat]). Chains start → stop₁ → … → stopₙ → start into a loop when the
 * walker dropped 2+ must-pass stops.
 */
async function callGraphhopperVia(
  points: Coord[],
): Promise<GhRoundTripResult | null> {
  const pts = points.map((c) => `point=${c[1]},${c[0]}`).join("&");
  return pathToResult(
    (await ghFetchPaths(`/route?${pts}&profile=hike&points_encoded=false`))[0],
  );
}

/**
 * Loop through a SINGLE must-pass stop. Uses alternative_route to get distinct
 * outbound/return paths so it's a real loop, not a there-and-back; falls back to
 * retracing the outbound path when GraphHopper finds no genuine alternative.
 */
async function ghAlternativeLoop(
  start: Coord,
  wp: Coord,
): Promise<GhRoundTripResult | null> {
  const path =
    `/route?point=${start[1]},${start[0]}&point=${wp[1]},${wp[0]}` +
    `&profile=hike&algorithm=alternative_route&alternative_route.max_paths=3` +
    `&points_encoded=false`;
  const paths = await ghFetchPaths(path);
  const out = pathToResult(paths[0]);
  if (!out) return null;
  const back = pathToResult(paths[1]) ?? out; // distinct return, else retrace
  // `back` runs start→wp; reverse to wp→start and drop the duplicate junction.
  const backCoords = back.coords.slice().reverse().slice(1);
  return {
    coords: out.coords.concat(backCoords),
    distanceM: out.distanceM + back.distanceM,
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
  opening_hours: string | null;
  distance_m: number;
}

/** Pre-elevation candidate: a GH-produced loop with the POI already chosen. */
interface RawCandidate {
  seed: number;
  coords: Coord[];
  distanceM: number;
  midpoint: Coord;
  poi: MidpointPoi | null;
  /** True once the polyline has been re-routed to actually pass the POI's door
   *  (start → POI → start via ghAlternativeLoop). False if the route-through
   *  attempt was skipped or rejected for distance overshoot. */
  viaPoi: boolean;
  prescore: number;
}

/** Build the synthetic "Route midpoint" placeholder for routes with no POI. */
function synthesizeMidpoint(midpoint: Coord): MidpointPoi {
  return {
    id: -1,
    name: "Route midpoint",
    type: "viewpoint",
    lng: midpoint[0],
    lat: midpoint[1],
    scenicScore: 5,
    terrainClass: null,
    isLunchStop: false,
    viaPoi: true,
    openingHours: null,
    openingStatus: "unknown",
  };
}

/** Convert an OSM opening_hours string + the walker's intended date into a
 *  day-and-time-aware open/closed verdict. Returns "unknown" whenever we lack
 *  data to decide (no opening_hours, unparseable string, or no walkDate). */
function evaluateOpeningStatus(
  spec: string | null,
  walkDate: string | undefined,
): OpeningStatus {
  if (!spec) return "unknown";
  if (!walkDate || !walkDate.trim()) return "unknown";
  // Probe at 13:00 — the most forgiving lunchtime hour for pubs that open late
  // or close early. Use local-time parsing (Date(`YYYY-MM-DDTHH:MM:SS`)).
  const probe = new Date(`${walkDate}T13:00:00`);
  if (Number.isNaN(probe.getTime())) return "unknown";
  return isOpenAt(spec, probe);
}

/** Rank POI candidates by lunch preference + theme + opening status. */
function rankPoiCandidates(
  rows: CandidateRow[],
  req: LoopRequest,
): CandidateRow[] {
  const lunchPref = req.lunchStop ?? "preferred";
  const themeMatches = (p: CandidateRow): boolean =>
    p.terrain_class === req.theme;

  const lunchtimeFor = (p: CandidateRow): OpeningStatus =>
    evaluateOpeningStatus(p.opening_hours, req.walkDate);

  // Lunchtime ranking: open > unknown > closed. "closed" is sorted last
  // (and in required mode, filtered out below). "unknown" sits in the middle
  // so a verified-open pub always wins over a we-can't-tell pub.
  const openingRank = (p: CandidateRow): number => {
    const s = lunchtimeFor(p);
    return s === "open" ? 2 : s === "unknown" ? 1 : 0;
  };

  const byThemeThenScenic = (a: CandidateRow, b: CandidateRow): number => {
    const t = Number(themeMatches(b)) - Number(themeMatches(a));
    if (t !== 0) return t;
    return (b.scenic_score ?? 5) - (a.scenic_score ?? 5);
  };

  if (lunchPref === "required") {
    // Must be a lunch stop AND not verified-closed on the walker's date.
    // "unknown" passes through (the UI flags it as unverified rather than
    // dropping the route entirely — which would leave too many users empty
    // when OSM has no opening_hours data).
    return rows
      .filter((p) => p.is_lunch_stop)
      .filter((p) => lunchtimeFor(p) !== "closed")
      .sort((a, b) => {
        const o = openingRank(b) - openingRank(a);
        if (o !== 0) return o;
        return byThemeThenScenic(a, b);
      });
  }
  if (lunchPref === "none") {
    // Non-lunch first; users picking "none" want viewpoints, peaks, or
    // watercourses rather than another pub.
    return [...rows].sort((a, b) => {
      const lunchDelta = Number(a.is_lunch_stop) - Number(b.is_lunch_stop);
      if (lunchDelta !== 0) return lunchDelta;
      return byThemeThenScenic(a, b);
    });
  }
  // preferred: lunch stops first, then opening status, then theme/scenic.
  return [...rows].sort((a, b) => {
    const lunchDelta = Number(b.is_lunch_stop) - Number(a.is_lunch_stop);
    if (lunchDelta !== 0) return lunchDelta;
    // Within the lunch-stop tier, prefer verified-open > unknown > closed.
    if (a.is_lunch_stop && b.is_lunch_stop) {
      const o = openingRank(b) - openingRank(a);
      if (o !== 0) return o;
    }
    return byThemeThenScenic(a, b);
  });
}

/** Fetch POI candidates around `midpoint`, ranked per lunch preference, with
 *  one widening from 1.5 km → 2.5 km if the primary band is empty. */
async function findCandidatePoi(
  midpoint: Coord,
  req: LoopRequest,
): Promise<MidpointPoi | null> {
  const sb = getAdminClient();
  const fetchPois = async (bandHiM: number): Promise<CandidateRow[]> => {
    const res = await sb.rpc("candidate_midpoint_pois", {
      start_lng: midpoint[0],
      start_lat: midpoint[1],
      // Theme-AGNOSTIC — the pois table's terrain_class is uniformly 'mixed'
      // so the SQL theme branch matches almost nothing. We fetch a generous
      // candidate set and use terrain_class as a soft JS tiebreak instead;
      // it auto-activates once the terrain backfill is fixed.
      theme_filter: "any",
      band_lo_m: 0,
      band_hi_m: bandHiM,
      max_candidates: 40,
    });
    return (res.data ?? []) as CandidateRow[];
  };

  let poiRows = rankPoiCandidates(await fetchPois(1500), req);
  if (poiRows.length === 0) {
    poiRows = rankPoiCandidates(await fetchPois(2500), req);
  }
  if (poiRows.length === 0) return null;
  const top = poiRows[0];
  return {
    id: top.id,
    name: top.name,
    type: top.type,
    lng: top.longitude,
    lat: top.latitude,
    scenicScore: top.scenic_score ?? 5,
    terrainClass: top.terrain_class,
    isLunchStop: top.is_lunch_stop,
    viaPoi: false, // set true after a successful route-through
    openingHours: top.opening_hours,
    openingStatus: evaluateOpeningStatus(top.opening_hours, req.walkDate),
  };
}

/**
 * Build one round_trip candidate for a single seed. Encapsulates the GH call,
 * the ±30% distance filter, midpoint extraction, POI search, and the optional
 * re-route-through-POI pass that makes "via {pub}" honest.
 *
 * Returns null when:
 *   - GH produced no route,
 *   - the route is more than ±30% off target km,
 *   - or lunchStop=required and no open-or-unverified lunch POI was found in
 *     either the 1.5 km or 2.5 km band (no silent synthetic fallback — the
 *     walker explicitly asked for a pub).
 */
async function buildRawCandidate(
  req: LoopRequest,
  seed: number,
  targetM: number,
): Promise<RawCandidate | null> {
  const raw = await callGraphhopperRoundTrip(
    req.startLat,
    req.startLng,
    targetM,
    seed,
  );
  if (!raw) return null;
  const ratio = Math.abs(raw.distanceM - targetM) / targetM;
  if (ratio > 0.30) return null;

  let coords = raw.coords;
  let distanceM = raw.distanceM;
  const midpoint = routeMidpointCoord(coords);

  const poi = await findCandidatePoi(midpoint, req);
  const lunchPref = req.lunchStop ?? "preferred";

  // Bail hard on a "required" lunch stop with no real POI — silently subbing
  // in a synthetic midpoint here is exactly the failure mode the audit
  // flagged. Better to let the seed produce nothing and surface a clean
  // 404 to the user than ship a misleading route.
  if (!poi && lunchPref === "required") return null;

  // A — Route the loop THROUGH the chosen POI so "via {name}" is honest.
  // ghAlternativeLoop produces an out-one-way-back-another loop through a
  // single waypoint. We replace the polyline if the new distance is still
  // within ±30% of target; otherwise keep the original round_trip and leave
  // viaPoi=false so the UI says "near" rather than "via".
  let viaPoi = false;
  if (poi) {
    const reRouted = await ghAlternativeLoop(
      [req.startLng, req.startLat],
      [poi.lng, poi.lat],
    );
    if (reRouted) {
      const newRatio = Math.abs(reRouted.distanceM - targetM) / targetM;
      if (newRatio <= 0.30) {
        coords = reRouted.coords;
        distanceM = reRouted.distanceM;
        viaPoi = true;
      }
    }
    if (viaPoi) {
      poi.viaPoi = true;
    } else {
      // Belt-and-braces: also re-check geometrically. The original round_trip
      // might happen to pass within 50 m of the POI by chance.
      poi.viaPoi = isPoiOnPolyline(coords, [poi.lng, poi.lat]);
    }
  }

  const prescore = scoreLoop(
    {
      actualKm: distanceM / 1000,
      roadM: 0,
      overlap: viaPoi ? 0.1 : 0.05,
      ascentM: 100,
      durationMin: (distanceM / 1000) * 12,
      midpointScenicScore: poi?.scenicScore ?? 5,
    },
    req,
  );

  return { seed, coords, distanceM, midpoint, poi, viaPoi: poi?.viaPoi ?? false, prescore };
}

/**
 * Materialise a RawCandidate into a full LoopResult: real elevation,
 * Tobler-timed duration, final score, cache key. Network: 1 Open-Meteo call.
 */
async function materializeCandidate(
  req: LoopRequest,
  c: RawCandidate,
): Promise<LoopResult> {
  const elev = await sampleElevation(c.coords);
  const { ascentM } = integrateElevation(elev);
  const durationHours = toblerHoursForProfile(c.coords, elev);
  // Defence-in-depth: toblerHoursForProfile now clamps slope and skips
  // sub-metre segments, so a blow-up shouldn't reach here — but cap at 24 h
  // and fall back to a Naismith estimate if a non-finite value ever slips
  // through. Any real Cotswolds walk is well inside 24 h.
  const rawDurationMin = durationHours * 60;
  const durationMin = Number.isFinite(rawDurationMin)
    ? Math.min(Math.round(rawDurationMin), 24 * 60)
    : Math.round((c.distanceM / 1000) * 15);

  const finalScore = scoreLoop(
    {
      actualKm: c.distanceM / 1000,
      roadM: 0,
      overlap: c.viaPoi ? 0.1 : 0.05,
      ascentM,
      durationMin,
      midpointScenicScore: c.poi?.scenicScore ?? 5,
    },
    req,
  );

  return {
    cacheKey: buildCacheKey(req, c.seed),
    geometry: { type: "LineString", coordinates: c.coords },
    actualKm: Math.round((c.distanceM / 1000) * 10) / 10,
    ascentM,
    durationMin,
    midpointPoi: c.poi ?? synthesizeMidpoint(c.midpoint),
    score: Math.round(finalScore * 100) / 100,
    narrative: null,
    cached: false,
  };
}

const ROUND_TRIP_SEEDS = [0, 1, 2, 42];

/**
 * Generate a single best loop without consulting the cache. Used by SEO
 * seeding and the legacy single-route API path. ~1-3 s wallclock.
 */
export async function generateLoop(req: LoopRequest): Promise<LoopResult | null> {
  const targetM = req.targetKm * 1000;
  const rawCandidates = (
    await Promise.all(
      ROUND_TRIP_SEEDS.map((seed) => buildRawCandidate(req, seed, targetM)),
    )
  ).filter((c): c is RawCandidate => c !== null);
  if (rawCandidates.length === 0) return null;
  rawCandidates.sort((a, b) => b.prescore - a.prescore);
  // Elevation for the winner only — keep parity with the pre-refactor cost.
  return materializeCandidate(req, rawCandidates[0]);
}

/**
 * Generate up to 3 distinct loop candidates from one request. Each gets its
 * own polyline (often a different GH seed), its own POI, its own elevation
 * profile + score, and its own cache key with seed suffix so all three are
 * independently shareable.
 *
 * Wallclock: ~3 s (4 GH calls + 3 elevation calls, all parallel). Returns an
 * empty array — never null — when every seed produced no usable candidate.
 */
export async function generateCandidates(
  req: LoopRequest,
): Promise<LoopResult[]> {
  const targetM = req.targetKm * 1000;
  const rawCandidates = (
    await Promise.all(
      ROUND_TRIP_SEEDS.map((seed) => buildRawCandidate(req, seed, targetM)),
    )
  ).filter((c): c is RawCandidate => c !== null);
  if (rawCandidates.length === 0) return [];

  // Sort by pre-elevation score, then take up to 3 with a simple diversity
  // filter: skip any candidate whose midpoint coord is within 300 m of an
  // already-accepted candidate's midpoint. Stops the UI from showing three
  // near-identical loops when GH seeds happen to produce them.
  rawCandidates.sort((a, b) => b.prescore - a.prescore);
  const picked: RawCandidate[] = [];
  for (const c of rawCandidates) {
    if (picked.length >= 3) break;
    const tooClose = picked.some(
      (p) => haversineKm(p.midpoint, c.midpoint) < 0.3,
    );
    if (tooClose) continue;
    picked.push(c);
  }
  // Materialise all picked in parallel — elevation is the only expensive step.
  return Promise.all(picked.map((c) => materializeCandidate(req, c)));
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

/**
 * Generate a loop that passes THROUGH the request's must-pass stops, in order.
 * One stop → an alternative_route loop (out one way, back another); two or more
 * → a via-chain start → stops → start. Distance is whatever the routing
 * produces. Returns null if GraphHopper can't connect the points.
 */
async function generateLoopThroughWaypoints(
  req: LoopRequest,
): Promise<LoopResult | null> {
  const wps = req.waypoints ?? [];
  if (wps.length === 0) return null;

  const start: Coord = [req.startLng, req.startLat];
  const wpCoords: Coord[] = wps.map((w) => [w.lng, w.lat]);

  const result =
    wpCoords.length === 1
      ? await ghAlternativeLoop(start, wpCoords[0])
      : await callGraphhopperVia([start, ...wpCoords, start]);
  if (!result || result.coords.length < 2) return null;

  const { coords, distanceM } = result;

  const elev = await sampleElevation(coords);
  const { ascentM } = integrateElevation(elev);
  const durationHours = toblerHoursForProfile(coords, elev);
  const rawDurationMin = durationHours * 60;
  const durationMin = Number.isFinite(rawDurationMin)
    ? Math.min(Math.round(rawDurationMin), 24 * 60)
    : Math.round((distanceM / 1000) * 15);

  // Single-stop loops retrace more (higher overlap estimate) than spread chains.
  const overlap = wpCoords.length === 1 ? 0.2 : 0.1;
  const score = scoreLoop(
    {
      actualKm: distanceM / 1000,
      roadM: 0,
      overlap,
      ascentM,
      durationMin,
      midpointScenicScore: 6,
    },
    req,
  );

  // Synthetic geometric midpoint — the real "stops" are the walker's pins,
  // rendered by the designer UI and named in the narrative. Mirrors how
  // findCached recomputes the midpoint for cached rows with no POI FK.
  const mid = routeMidpointCoord(coords);
  const midpointPoi: MidpointPoi = {
    ...synthesizeMidpoint(mid),
    scenicScore: 6,
  };

  return {
    cacheKey: buildCacheKey(req),
    geometry: { type: "LineString", coordinates: coords },
    actualKm: Math.round((distanceM / 1000) * 10) / 10,
    ascentM,
    durationMin,
    midpointPoi,
    score: Math.round(score * 100) / 100,
    narrative: null,
    cached: false,
  };
}

export async function findOrGenerate(
  req: LoopRequest,
): Promise<LoopResult | null> {
  const cacheKey = buildCacheKey(req);

  const cached = await findCached(cacheKey, req.walkDate);
  if (cached) return applyCustomizations(cached, req);

  // Must-pass stops switch the engine from round_trip to route-through.
  const fresh =
    req.waypoints && req.waypoints.length > 0
      ? await generateLoopThroughWaypoints(req)
      : await generateLoop(req);
  if (!fresh) return null;

  // Persist the baseline (steady-pace, moderate-difficulty) row so other
  // (difficulty, pace) combos reuse the same geometry. Apply the caller's
  // customisations to what we return.
  await persistRoute(fresh, req);
  return applyCustomizations(fresh, req);
}

/**
 * Multi-route entry point: generates (or, for already-known seeds, reuses) up
 * to 3 candidate loops for one request. Each candidate is independently
 * persisted under its own seed-suffixed cache key so /walks/r/[slug] continues
 * to work for any of the three after the request returns.
 *
 * - Waypoint requests fall back to the single-route path: the walker's
 *   chosen stops define exactly one geometry, so there is nothing to vary.
 * - When the cache holds at least one matching seed, it is reused; missing
 *   seeds are generated fresh in the same pass (so a returning user gets an
 *   instant first card and the others trickle in).
 * - Empty result means even seed 0 produced nothing usable (e.g. required
 *   lunch stop with no candidates in the area). The API surfaces this as a
 *   "no loop found" 404, never a silent synthetic fallback.
 */
export async function findOrGenerateCandidates(
  req: LoopRequest,
): Promise<LoopResult[]> {
  // Waypoint routes only produce one geometry; no point pretending otherwise.
  if (req.waypoints && req.waypoints.length > 0) {
    const single = await findOrGenerate(req);
    return single ? [single] : [];
  }

  // Try the cache for each candidate seed first. A returning user (same
  // start + km + theme + lunch) gets instant results; misses fall through
  // to the live generator. Seeds 0/1/2 are the three we expose to UI; seed
  // 42 is held in reserve as a tiebreaker in generateCandidates.
  const lookupSeeds = [0, 1, 2];
  const cachedHits = await Promise.all(
    lookupSeeds.map((seed) => findCached(buildCacheKey(req, seed), req.walkDate)),
  );
  const cached = cachedHits.filter((c): c is LoopResult => c !== null);

  // If we got all three from cache, we're done — apply customisations and
  // return without touching GraphHopper.
  if (cached.length === lookupSeeds.length) {
    return cached.map((c) => applyCustomizations(c, req));
  }

  // Otherwise regenerate the whole set. We could be smarter and only fill
  // the gaps, but seed-by-seed cache fills race with each other on the
  // diversity filter — generating all three together makes the result
  // deterministic and the diversity check meaningful.
  const fresh = await generateCandidates(req);
  if (fresh.length === 0) return [];

  // Persist all candidates so their share permalinks work independently.
  await Promise.all(fresh.map((f) => persistRoute(f, req)));
  return fresh.map((f) => applyCustomizations(f, req));
}

async function persistRoute(loop: LoopResult, req: LoopRequest): Promise<void> {
  const sb = getAdminClient();
  const rawId = loop.midpointPoi.id;
  // Only consider non-negative real ids. Synthetic (-1) midpoints carry no POI
  // signal and become null (the UI uses the geometric midpoint coordinate).
  const validId =
    rawId >= 0 && Number.isSafeInteger(rawId) ? rawId : null;

  // upsert_route's row payload, minus the POI id (filled in per-attempt below).
  const baseArgs = {
    p_cache_key: loop.cacheKey,
    p_start_lng: req.startLng,
    p_start_lat: req.startLat,
    p_theme: req.theme,
    p_target_km: req.targetKm,
    p_actual_km: loop.actualKm,
    p_ascent_m: loop.ascentM,
    p_duration_min: loop.durationMin,
    p_geometry_geojson: JSON.stringify(loop.geometry),
    p_score: loop.score,
    p_narrative: loop.narrative,
    p_is_seo_page: false,
    p_engine_version: ENGINE_VERSION,
  };

  // Preferred path — requires migration 014 (p_midpoint_poi_id is TEXT).
  // Passing the id as a STRING makes PostgREST serialise it as text, sidestepping
  // its INT4 coercion bug (ids > 2,147,483,647 — most real OSM ids — otherwise
  // fail with "out of range for type integer"). The 014 function validates the
  // text, casts to BIGINT, and FK-checks pois (null if absent). If 014 is NOT
  // yet applied the BIGINT function rejects the text arg; we then fall back to
  // the legacy number form (INT4-capped, large ids null'd) so routes still
  // persist. This keeps the deploy safe regardless of migration timing.
  let { error } = await sb.rpc("upsert_route", {
    ...baseArgs,
    p_midpoint_poi_id: validId === null ? null : String(validId),
  });
  if (error) {
    const capped =
      validId !== null && validId <= 2_147_483_647 ? validId : null;
    ({ error } = await sb.rpc("upsert_route", {
      ...baseArgs,
      p_midpoint_poi_id: capped,
    }));
  }
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
  const coords = geometry.coordinates as Coord[];

  let midpointLng: number = row.midpoint_lng ?? 0;
  let midpointLat: number = row.midpoint_lat ?? 0;
  if (!midpointLng || !midpointLat) {
    const mid = routeMidpointCoord(coords);
    midpointLng = mid[0];
    midpointLat = mid[1];
  }

  const openingHours: string | null = row.midpoint_opening_hours ?? null;
  const viaPoi = isPoiOnPolyline(coords, [midpointLng, midpointLat]);

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
      viaPoi,
      openingHours,
      // SEO pages serve no specific walker — the open-status is shown as
      // unknown to all visitors, who can verify their own date in the planner.
      openingStatus: "unknown",
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

interface ScoreWeights {
  distanceFit: number;
  overlap: number;
  road: number;
  poi: number;
  elevation: number;
  time: number;
}

/** Baseline scoring weights (sum to 1.0). Used verbatim when the request
 *  carries no emphasis — so SEO sample scoring is unchanged. */
const BASE_WEIGHTS: ScoreWeights = {
  distanceFit: 0.35,
  overlap: 0.2,
  road: 0.2,
  poi: 0.1,
  elevation: 0.1,
  time: 0.05,
};

/**
 * Re-weight the score from the walker's free-text emphasis. Empty emphasis
 * returns BASE_WEIGHTS unchanged (the backward-compatibility guarantee). Any
 * recognised cue bumps the relevant term, then we renormalise to sum 1.0 so
 * the score stays in [0, 1]. Keyword matching only — no LLM in the hot loop.
 */
function emphasisWeights(emphasis: string): ScoreWeights {
  const e = emphasis.toLowerCase().trim();
  if (!e) return BASE_WEIGHTS;
  const w = { ...BASE_WEIGHTS };
  if (/\b(view|views|scen|vista|panoram|lookout)/.test(e)) w.poi += 0.2;
  if (/\b(flat|gentle|easy|level|knee|accessible)/.test(e)) w.elevation += 0.2;
  if (/(quiet|peaceful|secluded|traffic|off.?road|away from)/.test(e)) w.road += 0.15;
  const sum = w.distanceFit + w.overlap + w.road + w.poi + w.elevation + w.time;
  return {
    distanceFit: w.distanceFit / sum,
    overlap: w.overlap / sum,
    road: w.road / sum,
    poi: w.poi / sum,
    elevation: w.elevation / sum,
    time: w.time / sum,
  };
}

export function scoreLoop(s: ScoreInputs, req: LoopRequest): number {
  const difficulty = req.difficulty ?? "moderate";
  const w = emphasisWeights(req.emphasis ?? "");
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
    distanceFit * w.distanceFit +
    overlapPenalty * w.overlap +
    roadAvoidance * w.road +
    poiBonus * w.poi +
    elevationFit * w.elevation +
    timeFeasibility * w.time
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
 * True when the POI's coordinate lies within `thresholdM` of any vertex on
 * the polyline. We sweep vertices rather than segments — at GH's typical
 * ~30 m vertex spacing this catches "the loop passes the pub door" without
 * the cost of a proper point-to-segment perpendicular distance calculation.
 *
 * 50 m is a deliberate buffer: GraphHopper snaps waypoints to the nearest
 * routing vertex, which can be a few metres off the pub's actual coordinate
 * (the OSM node is often the building centroid, not the road entrance).
 */
function isPoiOnPolyline(coords: Coord[], poi: Coord, thresholdM = 50): boolean {
  if (coords.length === 0) return false;
  const thresholdKm = thresholdM / 1000;
  for (const v of coords) {
    if (haversineKm(v, poi) <= thresholdKm) return true;
  }
  return false;
}

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
  // Elevation at coord i, LINEARLY INTERPOLATED between the two bracketing
  // samples. The elevation profile has ~80 samples spread over ~351 coords; the
  // old nearest-index lookup snapped each coord to one sample, so every ~4th
  // coordinate absorbed the entire elevation delta between two samples (~150 m
  // apart in reality) across a single ~35 m segment — a 4×-steep spike that
  // Tobler's exponential punished, inflating duration several-fold (an 11 h
  // estimate for a 12 km walk). Interpolating spreads each delta over the real
  // distance, so per-segment slopes are realistic while total ascent is
  // preserved (piecewise-linear sums to the same sample-to-sample climb).
  const eMap = (i: number) => {
    if (elevations.length === 0) return 150;
    if (elevations.length === 1) return elevations[0] ?? 150;
    const pos = (i * (elevations.length - 1)) / Math.max(1, coords.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(elevations.length - 1, lo + 1);
    const frac = pos - lo;
    const a = elevations[lo] ?? 150;
    const b = elevations[hi] ?? 150;
    return a + (b - a) * frac;
  };
  let hours = 0;
  for (let i = 1; i < coords.length; i++) {
    const dKm = haversineKm(coords[i - 1], coords[i]);
    // Skip sub-metre segments. Near-coincident GraphHopper vertices carry no
    // real walking time, and dividing an elevation delta by a tiny dKm produces
    // an astronomical slope → near-zero velocity → a duration blow-up (the
    // 6,108,476,011,791,251-minute bug). 1 mm threshold.
    if (dKm < 0.001) continue;
    const dzKm = (eMap(i) - eMap(i - 1)) / 1000;
    // Clamp slope to ±150% grade as a final guard against any residual noise.
    const slope = Math.max(-1.5, Math.min(1.5, dzKm / dKm));
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
