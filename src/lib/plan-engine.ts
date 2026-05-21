/**
 * Plan Engine — consolidated data and computation for trip planning.
 * Pure functions, no React dependencies.
 *
 * Trail distances, village mile markers, elevation profile and segment ascent/
 * descent are all sourced from src/data/trail-accurate.json, which is built
 * from the real OSM Cotswold Way LineString + Open-Meteo elevation samples.
 * Regenerate with `node scripts/build-trail-data.mjs`.
 */
import trailData from "@/data/trail-accurate.json";
import type {
  BudgetTier,
  PlanRationale,
  RationaleEvent,
  TripBrief,
} from "@/lib/ai/schemas/trip-brief";
import type { Property } from "@/lib/queries";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Village {
  name: string;
  mile: number;
  lat: number;
  lng: number;
  /** Walking distance (km) from the village centre to the nearest trail point. */
  offTrailKm: number;
}

export interface TrailSegment {
  from: string;
  to: string;
  miles: number;
  km: number;
  ascentM: number;
  descentM: number;
  ascentFt: number;
  descentFt: number;
}

export interface PlannedAccommodation {
  slug: string;          // links to /property/[slug]
  name: string;
  village: string;
  propertyType: string;  // "hotel" | "inn" | "bnb" etc.
  image?: string;        // thumbnail URL
}

export interface SavedPOI {
  id: number;
  name: string;
  type: string;          // pub, cafe, water, toilets, etc.
  latitude: number;
  longitude: number;
}

export interface DayStop {
  day: number;
  village: string;
  miles: number;        // miles walked this day
  cumulative: number;   // total miles from start
  difficulty: "easy" | "moderate" | "strenuous";
  walkScore: number;    // 1-10 fatigue score
  transfer?: boolean;   // bus/taxi instead of walking
  restDay?: boolean;    // rest day, 0 miles, same village
  note?: string;        // user note for this stop
  accommodation?: PlannedAccommodation; // assigned stay for this night
  savedPois?: SavedPOI[];              // bookmarked POIs for this day
}

export interface Connection {
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  walkTime: string;     // e.g. "5h 30m"
  difficulty: "easy" | "moderate" | "strenuous";
  terrain: string;
}

/** Walking-style archetype — drives a multiplier on Tobler-predicted walking
 * times. See ARCHETYPE_SCALAR. Independent of physical day difficulty: a
 * strong walker still finds 22mi/2000ft strenuous, they just do it faster. */
export type Archetype = "casual" | "steady" | "strong" | "athletic";

/** Pack weight bucket — small additional multiplier on top of archetype. */
export type Pack = "day" | "overnight" | "full";

/** Time multipliers vs Tobler-predicted hours. >1 means slower. */
export const ARCHETYPE_SCALAR: Record<Archetype, number> = {
  casual: 1.25,
  steady: 1.10,
  strong: 0.95,
  athletic: 0.80,
};

export const PACK_SCALAR: Record<Pack, number> = {
  day: 1.00,
  overnight: 1.05,
  full: 1.10,
};

export interface PlanState {
  direction: "north_to_south" | "south_to_north";
  days: number;
  /** Month 0-11. Legacy field, derived from `startDate` when that is set. */
  month: number;
  /** ISO yyyy-mm-dd for day 1 of the walk. Optional for backwards compat. */
  startDate?: string;
  dogFriendly: boolean;
  stops: DayStop[];
  /** Per-plan pace override, set by the AI handoff so the LLM's extracted
   * fitness applies to this specific plan without overwriting the user's
   * global PaceContext preference. Not URL-encoded — shareable links
   * represent a route, not a body. */
  paceOverride?: Archetype;
}

export interface CostBreakdown {
  accommodation: number;
  luggage: number;
  lunches: number;
  dinners: number;
  total: number;
  perNight: number;
}

// ─── Static Data (sourced from src/data/trail-accurate.json) ───────────────

/** Total trail length in miles, measured from the real OSM LineString. */
export const TRAIL_TOTAL_MILES: number = trailData.trail.totalMiles;

/** Highest point on the trail (trail-relative mile + elevation in metres). */
export const TRAIL_HIGHEST_POINT = trailData.trail.highestPoint;

/** Total ascent / descent in metres across the whole trail (from SRTM samples). */
export const TRAIL_TOTAL_ASCENT_M = trailData.trail.totalAscentM;
export const TRAIL_TOTAL_DESCENT_M = trailData.trail.totalDescentM;

export const VILLAGES: Village[] = trailData.villages.map((v) => ({
  name: v.name,
  mile: v.mile,
  lat: v.anchorLat,
  lng: v.anchorLng,
  offTrailKm: v.offTrailKm,
}));

export const TRAIL_SEGMENTS: TrailSegment[] = trailData.segments;

/** Real elevation profile: [mile, metres] pairs sampled every ~0.25 mi. */
export const ELEVATION_POINTS: [number, number][] = trailData.elevationProfile as [number, number][];

export const WEATHER_DATA = [
  { month: "Jan", tempLow: 1, tempHigh: 7,  rainfall: "wet"      as const },
  { month: "Feb", tempLow: 1, tempHigh: 8,  rainfall: "wet"      as const },
  { month: "Mar", tempLow: 3, tempHigh: 10, rainfall: "moderate" as const },
  { month: "Apr", tempLow: 4, tempHigh: 13, rainfall: "moderate" as const },
  { month: "May", tempLow: 7, tempHigh: 16, rainfall: "dry"      as const },
  { month: "Jun", tempLow: 10, tempHigh: 19, rainfall: "dry"     as const },
  { month: "Jul", tempLow: 12, tempHigh: 22, rainfall: "dry"     as const },
  { month: "Aug", tempLow: 12, tempHigh: 21, rainfall: "dry"     as const },
  { month: "Sep", tempLow: 9, tempHigh: 18, rainfall: "moderate" as const },
  { month: "Oct", tempLow: 7, tempHigh: 14, rainfall: "moderate" as const },
  { month: "Nov", tempLow: 3, tempHigh: 10, rainfall: "wet"      as const },
  { month: "Dec", tempLow: 2, tempHigh: 7,  rainfall: "wet"      as const },
];

export const RAINFALL_ICON: Record<string, string> = { dry: "wb_sunny", moderate: "cloud", wet: "rainy" };

export const TEMPLATES = [
  {
    id: "7-day", name: "7-Day Classic", subtitle: "The definitive experience",
    days: 7, avgMiles: 14.6, colour: "bg-tertiary", textColour: "text-white",
    stops: [
      { day: 1, from: "Chipping Campden", to: "Winchcombe",        miles: 17.6, difficulty: "strenuous" as const },
      { day: 2, from: "Winchcombe",        to: "Birdlip",           miles: 16.8, difficulty: "strenuous" as const },
      { day: 3, from: "Birdlip",           to: "Stroud",            miles: 13.8, difficulty: "moderate"  as const },
      { day: 4, from: "Stroud",            to: "Dursley",           miles: 12.4, difficulty: "moderate"  as const },
      { day: 5, from: "Dursley",           to: "Hawkesbury Upton",  miles: 13.4, difficulty: "moderate"  as const },
      { day: 6, from: "Hawkesbury Upton",  to: "Cold Ashton",       miles: 13.0, difficulty: "easy"      as const },
      { day: 7, from: "Cold Ashton",       to: "Bath",              miles: 15.0, difficulty: "moderate"  as const },
    ],
  },
  {
    id: "10-day", name: "10-Day Standard", subtitle: "Time to enjoy the villages",
    days: 10, avgMiles: 10.2, colour: "bg-primary", textColour: "text-white",
    stops: [
      { day: 1,  from: "Chipping Campden", to: "Broadway",          miles: 6.2,  difficulty: "moderate"  as const },
      { day: 2,  from: "Broadway",          to: "Winchcombe",        miles: 11.4, difficulty: "strenuous" as const },
      { day: 3,  from: "Winchcombe",        to: "Cheltenham",        miles: 12.2, difficulty: "strenuous" as const },
      { day: 4,  from: "Cheltenham",        to: "Painswick",         miles: 14.8, difficulty: "moderate"  as const },
      { day: 5,  from: "Painswick",         to: "Stroud",            miles: 5.4,  difficulty: "easy"      as const },
      { day: 6,  from: "Stroud",            to: "Dursley",           miles: 12.4, difficulty: "moderate"  as const },
      { day: 7,  from: "Dursley",           to: "Wotton-under-Edge", miles: 8.2,  difficulty: "moderate"  as const },
      { day: 8,  from: "Wotton-under-Edge", to: "Old Sodbury",       miles: 9.8,  difficulty: "moderate"  as const },
      { day: 9,  from: "Old Sodbury",       to: "Cold Ashton",       miles: 5.2,  difficulty: "easy"      as const },
      { day: 10, from: "Cold Ashton",       to: "Bath",              miles: 10.8, difficulty: "moderate"  as const },
    ],
  },
  {
    id: "14-day", name: "14-Day Explorer", subtitle: "Every pub, every view",
    days: 14, avgMiles: 7.3, colour: "bg-secondary", textColour: "text-white",
    stops: [
      { day: 1,  from: "Chipping Campden", to: "Broadway",          miles: 6.2,  difficulty: "moderate"  as const },
      { day: 2,  from: "Broadway",          to: "Winchcombe",        miles: 11.4, difficulty: "strenuous" as const },
      { day: 3,  from: "Winchcombe",        to: "Cleeve Hill",       miles: 5.2,  difficulty: "strenuous" as const },
      { day: 4,  from: "Cleeve Hill",       to: "Cheltenham",        miles: 7.0,  difficulty: "moderate"  as const },
      { day: 5,  from: "Cheltenham",        to: "Birdlip",           miles: 6.2,  difficulty: "moderate"  as const },
      { day: 6,  from: "Birdlip",           to: "Painswick",         miles: 7.2,  difficulty: "moderate"  as const },
      { day: 7,  from: "Painswick",         to: "Stroud",            miles: 5.4,  difficulty: "easy"      as const },
      { day: 8,  from: "Stroud",            to: "King's Stanley",    miles: 4.8,  difficulty: "moderate"  as const },
      { day: 9,  from: "King's Stanley",    to: "Dursley",           miles: 7.6,  difficulty: "moderate"  as const },
      { day: 10, from: "Dursley",           to: "Wotton-under-Edge", miles: 8.2,  difficulty: "moderate"  as const },
      { day: 11, from: "Wotton-under-Edge", to: "Old Sodbury",       miles: 12.0, difficulty: "moderate"  as const },
      { day: 12, from: "Old Sodbury",       to: "Tormarton",         miles: 5.0,  difficulty: "easy"      as const },
      { day: 13, from: "Tormarton",         to: "Cold Ashton",       miles: 8.0,  difficulty: "easy"      as const },
      { day: 14, from: "Cold Ashton",       to: "Bath",              miles: 14.0, difficulty: "moderate"  as const },
    ],
  },
];

// Difficulty for each destination village (used by autoStops)
const DIFFICULTY_MAP: Record<string, "easy" | "moderate" | "strenuous"> = {
  "Broadway": "moderate", "Stanton": "moderate", "Winchcombe": "strenuous",
  "Cleeve Hill": "strenuous", "Cheltenham": "moderate", "Birdlip": "moderate",
  "Cranham": "moderate", "Painswick": "moderate", "Stroud": "easy",
  "King's Stanley": "moderate", "Dursley": "moderate", "North Nibley": "moderate",
  "Wotton-under-Edge": "moderate", "Old Sodbury": "moderate", "Tormarton": "easy",
  "Cold Ashton": "easy", "Bath": "moderate", "Chipping Campden": "moderate",
};

const DIFFICULTY_FACTOR = { easy: 0.8, moderate: 1.0, strenuous: 1.3 };

// ─── Stage Mapping ─────────────────────────────────────────────────────────

/** Mile ranges for each trail stage (1-indexed) */
export const STAGE_MILE_RANGES: [number, number][] = [
  [0, 10], [10, 20], [20, 33], [33, 40],
  [40, 49], [49, 63], [63, 80], [80, 102],
];

/** Map a village name to trail stage numbers (with overlap for boundary villages) */
export function villageToStages(villageName: string, overlap = 2): number[] {
  const v = VILLAGES.find(x => x.name === villageName);
  if (!v) return [];
  const mile = v.mile;
  const stages: number[] = [];
  STAGE_MILE_RANGES.forEach(([min, max], i) => {
    if (mile >= min - overlap && mile <= max + overlap) stages.push(i + 1);
  });
  return stages;
}

// ─── Wishlist → Plan ───────────────────────────────────────────────────────

export interface WishlistItem {
  slug: string;
  name: string;
  village: string;
  propertyType: string;
  image?: string;
}

/** Build a plan from wishlisted stays — orders them along the trail and fills gaps */
export function planFromWishlist(
  items: WishlistItem[],
  direction: "north_to_south" | "south_to_north"
): DayStop[] {
  // Map wishlist items to villages with mile markers
  const mapped = items
    .map(item => ({ item, village: VILLAGES.find(v => v.name === item.village) }))
    .filter((x): x is { item: WishlistItem; village: Village } => !!x.village)
    .sort((a, b) => direction === "north_to_south"
      ? a.village.mile - b.village.mile
      : b.village.mile - a.village.mile
    );

  if (mapped.length === 0) return autoStops(7, direction);

  // Build stops from wishlisted villages
  const startVillage = direction === "north_to_south" ? "Chipping Campden" : "Bath";
  const endVillage = direction === "north_to_south" ? "Bath" : "Chipping Campden";
  const villageNames = mapped.map(m => m.item.village);

  // Ensure the last stop reaches the trail end
  if (villageNames[villageNames.length - 1] !== endVillage) {
    villageNames.push(endVillage);
  }

  const stops: DayStop[] = [];
  let prevVillageName = startVillage;
  let cumulative = 0;

  for (let i = 0; i < villageNames.length; i++) {
    const vName = villageNames[i];
    const v = VILLAGES.find(x => x.name === vName);
    const pv = VILLAGES.find(x => x.name === prevVillageName);
    if (!v || !pv) continue;

    const miles = Math.abs(v.mile - pv.mile);
    cumulative += miles;
    const elevFt = findSegmentElevation(prevVillageName, vName);
    const diff = getDifficulty(miles, elevFt);

    const stop: DayStop = {
      day: i + 1,
      village: vName,
      miles: Math.round(miles * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
      difficulty: diff,
      walkScore: computeWalkScore(miles, elevFt, diff),
    };

    // Attach accommodation from wishlist if this village has one
    const wishItem = mapped.find(m => m.item.village === vName);
    if (wishItem) {
      stop.accommodation = {
        slug: wishItem.item.slug,
        name: wishItem.item.name,
        village: wishItem.item.village,
        propertyType: wishItem.item.propertyType,
        image: wishItem.item.image,
      };
    }

    stops.push(stop);
    prevVillageName = vName;
  }

  return stops;
}

// ─── Share Link Encoding ───────────────────────────────────────────────────

/** Encode a plan into compact URL search params */
export function encodePlanToURL(plan: PlanState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("dir", plan.direction === "north_to_south" ? "ns" : "sn");
  params.set("days", plan.days.toString());
  params.set("month", plan.month.toString());
  if (plan.startDate) params.set("start", plan.startDate);
  if (plan.dogFriendly) params.set("dog", "1");
  params.set("stops", plan.stops.map(s => s.village).join(","));

  // Encode accommodation: day:slug pairs
  const accPairs = plan.stops
    .filter(s => s.accommodation)
    .map(s => `${s.day}:${s.accommodation!.slug}`);
  if (accPairs.length > 0) params.set("acc", accPairs.join(","));

  // Encode saved POIs: day:id.id.id
  const poiPairs = plan.stops
    .filter(s => s.savedPois && s.savedPois.length > 0)
    .map(s => `${s.day}:${s.savedPois!.map(p => p.id).join(".")}`);
  if (poiPairs.length > 0) params.set("pois", poiPairs.join(","));

  return params;
}

/**
 * Reconstruct a full PlanState from URL params. Returns null if the URL
 * doesn't contain a parseable plan. Accommodation slugs are recorded but the
 * caller is responsible for resolving them to display names/images.
 *
 *   const plan = planFromURL(params, (slug) => properties.find(p => p.slug === slug))
 */
export function planFromURL(
  params: URLSearchParams,
  resolveAccommodation?: (slug: string) => { name: string; village: string; propertyType: string; image?: string } | undefined
): PlanState | null {
  const decoded = decodePlanFromURL(params);
  if (!decoded) return null;

  const villageNames = decoded.villages;
  const startVillage = decoded.direction === "north_to_south" ? "Chipping Campden" : "Bath";
  const stops: DayStop[] = [];
  let cumulative = 0;
  let prev = startVillage;

  for (let i = 0; i < villageNames.length; i++) {
    const name = villageNames[i];
    const v = VILLAGES.find((x) => x.name === name);
    const pv = VILLAGES.find((x) => x.name === prev);
    if (!v || !pv) continue;
    const segMiles = Math.abs(v.mile - pv.mile);
    cumulative += segMiles;
    const elevationFt = findSegmentElevation(prev, name);
    const difficulty: "easy" | "moderate" | "strenuous" = getDifficulty(segMiles, elevationFt);
    const stop: DayStop = {
      day: i + 1,
      village: name,
      miles: Math.round(segMiles * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
      difficulty,
      walkScore: computeWalkScore(segMiles, elevationFt, difficulty),
    };

    const accSlug = decoded.accMap.get(stop.day);
    if (accSlug) {
      const resolved = resolveAccommodation?.(accSlug);
      stop.accommodation = resolved
        ? { slug: accSlug, ...resolved }
        : { slug: accSlug, name: accSlug, village: name, propertyType: "unknown" };
    }

    stops.push(stop);
    prev = name;
  }

  return {
    direction: decoded.direction,
    days: decoded.days,
    month: decoded.month,
    startDate: decoded.startDate,
    dogFriendly: decoded.dogFriendly,
    stops,
  };
}

/** Decode URL params back to partial plan data (slugs/IDs need resolution) */
export function decodePlanFromURL(params: URLSearchParams): {
  direction: "north_to_south" | "south_to_north";
  days: number;
  month: number;
  startDate?: string;
  dogFriendly: boolean;
  villages: string[];
  accMap: Map<number, string>;    // day → slug
  poisMap: Map<number, number[]>; // day → POI IDs
} | null {
  const dir = params.get("dir");
  const days = params.get("days");
  const stops = params.get("stops");
  if (!dir || !days || !stops) return null;

  const accMap = new Map<number, string>();
  const accStr = params.get("acc");
  if (accStr) {
    accStr.split(",").forEach(pair => {
      const [d, slug] = pair.split(":");
      if (d && slug) accMap.set(parseInt(d), slug);
    });
  }

  const poisMap = new Map<number, number[]>();
  const poisStr = params.get("pois");
  if (poisStr) {
    poisStr.split(",").forEach(pair => {
      const [d, ids] = pair.split(":");
      if (d && ids) poisMap.set(parseInt(d), ids.split(".").map(Number));
    });
  }

  const start = params.get("start");
  // Reject anything that isn't an ISO yyyy-mm-dd to avoid garbage propagating.
  const startDate = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : undefined;

  return {
    direction: dir === "sn" ? "south_to_north" : "north_to_south",
    days: parseInt(days),
    month: parseInt(params.get("month") || "4"),
    startDate,
    dogFriendly: params.get("dog") === "1",
    villages: stops.split(","),
    accMap,
    poisMap,
  };
}

// ─── Computation ────────────────────────────────────────────────────────────

export function computeWalkScore(miles: number, elevationFt: number, difficulty: "easy" | "moderate" | "strenuous"): number {
  const raw = (miles * 100 + elevationFt * 0.5) * DIFFICULTY_FACTOR[difficulty];
  const score = Math.round(Math.min(10, Math.max(1, raw / 300)));
  return score;
}

const KM_PER_MILE = 1.609344;
const FT_PER_M = 3.28084;
const M_PER_FT = 0.3048;

/**
 * Walking time using Tobler's hiking function. Unlike Naismith, this accounts
 * for descent too — steep downhills slow you down, gentle downhills speed you
 * up vs flat. We integrate over the real elevation profile for the mile range.
 *
 *   v(slope) = 6 · exp(-3.5 · |slope + 0.05|) km/h
 *
 * Falls back to Naismith-equivalent if the profile is empty for that range.
 */
export function estimateWalkingTime(miles: number, ascentM: number, descentM: number = 0, scalar: number = 1): string {
  // Distribute ascent/descent proportionally across the distance for a coarse
  // Tobler estimate when we don't have a profile slice.
  const km = miles * KM_PER_MILE;
  if (km <= 0) return "0h 00m";
  const ascentKm = ascentM / 1000;
  const descentKm = descentM / 1000;
  // Approximate a two-segment profile: half ascent then half descent.
  const up = km / 2;
  const down = km / 2;
  const slopeUp = up > 0 ? ascentKm / up : 0;
  const slopeDown = down > 0 ? -descentKm / down : 0;
  const vUp = 6 * Math.exp(-3.5 * Math.abs(slopeUp + 0.05));
  const vDown = 6 * Math.exp(-3.5 * Math.abs(slopeDown + 0.05));
  const hours = (up / vUp + down / vDown) * scalar;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** More accurate walking time integrated over the real elevation profile. */
export function walkingTimeBetween(startMile: number, endMile: number, scalar: number = 1): string {
  const [lo, hi] = startMile < endMile ? [startMile, endMile] : [endMile, startMile];
  let hours = 0;
  let prev: [number, number] | null = null;
  for (const pt of ELEVATION_POINTS) {
    if (pt[0] < lo || pt[0] > hi) continue;
    if (prev) {
      const dxKm = (pt[0] - prev[0]) * KM_PER_MILE;
      if (dxKm > 0) {
        const dzKm = (pt[1] - prev[1]) / 1000;
        const slope = dzKm / dxKm;
        const v = 6 * Math.exp(-3.5 * Math.abs(slope + 0.05));
        hours += dxKm / v;
      }
    }
    prev = pt;
  }
  if (hours === 0) {
    // Fallback: flat Tobler speed (~5 km/h)
    hours = (hi - lo) * KM_PER_MILE / 5;
  }
  hours *= scalar;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function getDifficulty(miles: number, ascentFt: number): "easy" | "moderate" | "strenuous" {
  if (miles > 16 || ascentFt > 2000) return "strenuous";
  if (miles > 10 || ascentFt > 1000) return "moderate";
  return "easy";
}

/** Ascent/descent for any mile range, computed from the real profile. */
export function ascentDescentBetween(startMile: number, endMile: number): { ascentM: number; descentM: number; ascentFt: number; descentFt: number } {
  const [lo, hi] = startMile < endMile ? [startMile, endMile] : [endMile, startMile];
  let ascentM = 0;
  let descentM = 0;
  let prev: [number, number] | null = null;
  for (const pt of ELEVATION_POINTS) {
    if (pt[0] < lo || pt[0] > hi) continue;
    if (prev) {
      const delta = pt[1] - prev[1];
      if (delta > 0) ascentM += delta;
      else descentM -= delta;
    }
    prev = pt;
  }
  return {
    ascentM: Math.round(ascentM),
    descentM: Math.round(descentM),
    ascentFt: Math.round(ascentM * FT_PER_M),
    descentFt: Math.round(descentM * FT_PER_M),
  };
}

/**
 * Elevation gain in feet for a village-to-village segment. Prefers the
 * pre-computed value from trail-accurate.json; falls back to integrating the
 * live profile between mile markers (useful when the stop pair isn't a known
 * consecutive-villages segment).
 */
export function findSegmentElevation(from: string, to: string): number {
  const seg = TRAIL_SEGMENTS.find(s => s.from === from && s.to === to) || TRAIL_SEGMENTS.find(s => s.from === to && s.to === from);
  if (seg) return seg.ascentFt;

  const fromVillage = VILLAGES.find(v => v.name === from);
  const toVillage = VILLAGES.find(v => v.name === to);
  if (!fromVillage || !toVillage) return 800;

  return ascentDescentBetween(fromVillage.mile, toVillage.mile).ascentFt;
}

/** Return both ascent and descent in feet for a village segment. */
export function findSegmentProfile(from: string, to: string): { ascentFt: number; descentFt: number; ascentM: number; descentM: number } {
  const seg = TRAIL_SEGMENTS.find(s => s.from === from && s.to === to);
  if (seg) return { ascentFt: seg.ascentFt, descentFt: seg.descentFt, ascentM: seg.ascentM, descentM: seg.descentM };
  // Reverse direction: swap ascent/descent
  const rev = TRAIL_SEGMENTS.find(s => s.from === to && s.to === from);
  if (rev) return { ascentFt: rev.descentFt, descentFt: rev.ascentFt, ascentM: rev.descentM, descentM: rev.ascentM };

  const fromVillage = VILLAGES.find(v => v.name === from);
  const toVillage = VILLAGES.find(v => v.name === to);
  if (!fromVillage || !toVillage) return { ascentFt: 800, descentFt: 800, ascentM: Math.round(800 * M_PER_FT), descentM: Math.round(800 * M_PER_FT) };

  const ad = ascentDescentBetween(fromVillage.mile, toVillage.mile);
  return fromVillage.mile < toVillage.mile
    ? ad
    : { ascentM: ad.descentM, descentM: ad.ascentM, ascentFt: ad.descentFt, descentFt: ad.ascentFt };
}

export function autoStops(days: number, direction: "north_to_south" | "south_to_north"): DayStop[] {
  const totalMiles = TRAIL_TOTAL_MILES;
  const targetPerDay = totalMiles / days;
  const stops: DayStop[] = [];
  const used = new Set<string>();

  const orderedVillages = direction === "north_to_south"
    ? VILLAGES
    : [...VILLAGES].reverse();

  const startVillage = orderedVillages[0];
  const endVillage = orderedVillages[orderedVillages.length - 1];
  used.add(startVillage.name);
  let lastMile = 0;

  for (let day = 1; day < days; day++) {
    const targetMile = day * targetPerDay;
    let best = orderedVillages[1];
    let bestDist = Infinity;

    for (const v of orderedVillages) {
      if (used.has(v.name) || v.name === endVillage.name) continue;
      const progressMile = direction === "north_to_south" ? v.mile : totalMiles - v.mile;
      const dist = Math.abs(progressMile - targetMile);
      if (dist < bestDist && progressMile > lastMile && progressMile < totalMiles) {
        bestDist = dist;
        best = v;
      }
    }

    const progressMile = direction === "north_to_south" ? best.mile : totalMiles - best.mile;
    const dayMiles = Math.round((progressMile - lastMile) * 10) / 10;
    const difficulty = DIFFICULTY_MAP[best.name] || "moderate";
    const elevationFt = findSegmentElevation(
      stops.length > 0 ? stops[stops.length - 1].village : startVillage.name,
      best.name
    );

    stops.push({
      day,
      village: best.name,
      miles: dayMiles,
      cumulative: Math.round(progressMile * 10) / 10,
      difficulty,
      walkScore: computeWalkScore(dayMiles, elevationFt, difficulty),
    });
    used.add(best.name);
    lastMile = progressMile;
  }

  // Final day
  const finalMiles = Math.round((totalMiles - lastMile) * 10) / 10;
  const finalDifficulty = DIFFICULTY_MAP[endVillage.name] || "moderate";
  const finalElevation = findSegmentElevation(
    stops.length > 0 ? stops[stops.length - 1].village : startVillage.name,
    endVillage.name
  );
  stops.push({
    day: days,
    village: endVillage.name,
    miles: finalMiles,
    cumulative: Math.round(totalMiles * 10) / 10,
    difficulty: finalDifficulty,
    walkScore: computeWalkScore(finalMiles, finalElevation, finalDifficulty),
  });

  return stops;
}

export function computeConnections(stops: DayStop[], direction: "north_to_south" | "south_to_north", scalar: number = 1): Connection[] {
  const connections: Connection[] = [];
  const startVillage = direction === "north_to_south" ? VILLAGES[0].name : VILLAGES[VILLAGES.length - 1].name;

  for (let i = 0; i < stops.length; i++) {
    const from = i === 0 ? startVillage : stops[i - 1].village;
    const to = stops[i].village;
    const miles = stops[i].miles;
    const profile = findSegmentProfile(from, to);
    const difficulty = getDifficulty(miles, profile.ascentFt);

    let terrain = "Gentle Walk";
    if (profile.ascentFt > 1200) terrain = "Steep Escarpment";
    else if (profile.ascentFt > 800) terrain = "Moderate Ascent";
    else if (miles > 15) terrain = "Long Valley Route";

    connections.push({
      from, to, distance: miles,
      elevationGain: profile.ascentFt,
      walkTime: estimateWalkingTime(miles, profile.ascentM, profile.descentM, scalar),
      difficulty, terrain,
    });
  }

  return connections;
}

/** Indicative nightly accommodation cost per tier — used when properties don't
 * have real prices populated yet. All `price_per_night` are currently 0 in
 * properties.json, so this is the only signal we have. */
const TIER_DEFAULT_NIGHTLY: Record<BudgetTier, number> = {
  shoestring: 60,
  comfort: 110,
  "treat-yourself": 180,
};

const TIER_LUNCH: Record<BudgetTier, number> = {
  shoestring: 10,
  comfort: 15,
  "treat-yourself": 25,
};

const TIER_DINNER: Record<BudgetTier, number> = {
  shoestring: 20,
  comfort: 30,
  "treat-yourself": 55,
};

export function estimateCosts(
  nights: number,
  tier: BudgetTier = "comfort",
): CostBreakdown {
  const perNight = TIER_DEFAULT_NIGHTLY[tier];
  const accommodation = nights * perNight;
  const luggage = nights * 12;
  const lunches = (nights + 1) * TIER_LUNCH[tier];
  const dinners = nights * TIER_DINNER[tier];

  return {
    accommodation, luggage, lunches, dinners, perNight,
    total: accommodation + luggage + lunches + dinners,
  };
}

/** Compact [lat, lng, mile] trail polyline, sampled from the real OSM LineString. */
export const TRAIL_POLYLINE: ReadonlyArray<readonly [number, number, number]> =
  (trailData.polyline as unknown as [number, number, number][]);

// Equirectangular approximation — much cheaper than haversine and accurate for
// the short distances we use it for (snapping a point to the nearest trail
// sample within ~10 km).
function approxDistKm2(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const latMid = ((lat1 + lat2) / 2) * Math.PI / 180;
  const dLat = (lat2 - lat1) * 111.32;
  const dLng = (lng2 - lng1) * 111.32 * Math.cos(latMid);
  return dLat * dLat + dLng * dLng; // squared km, fine for comparisons
}

/**
 * Snap a lat/lng to the Cotswold Way polyline and return the trail mile of the
 * nearest sampled point, along with the off-trail distance in metres.
 */
export function snapLatLngToTrail(lat: number, lng: number): { mile: number; offTrailM: number } {
  let bestIdx = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < TRAIL_POLYLINE.length; i++) {
    const [tLat, tLng] = TRAIL_POLYLINE[i];
    const d2 = approxDistKm2(lat, lng, tLat, tLng);
    if (d2 < bestD2) {
      bestD2 = d2;
      bestIdx = i;
    }
  }
  const [, , mile] = TRAIL_POLYLINE[bestIdx];
  return { mile, offTrailM: Math.round(Math.sqrt(bestD2) * 1000) };
}

/**
 * Legacy helper kept for compat. Snaps by latitude only — unreliable where the
 * trail bends east-west. Prefer `snapLatLngToTrail` when longitude is known.
 * @deprecated
 */
export function approximateMileFromLat(lat: number, lng?: number): number {
  if (lng !== undefined) return snapLatLngToTrail(lat, lng).mile;
  for (let i = 0; i < VILLAGES.length - 1; i++) {
    const a = VILLAGES[i];
    const b = VILLAGES[i + 1];
    if (lat <= a.lat && lat >= b.lat) {
      const t = (a.lat - lat) / (a.lat - b.lat);
      return a.mile + t * (b.mile - a.mile);
    }
  }
  if (lat > VILLAGES[0].lat) return 0;
  return TRAIL_TOTAL_MILES;
}

/** Get the start village for a given day */
export function getStartVillage(stops: DayStop[], dayIndex: number, direction: "north_to_south" | "south_to_north"): string {
  if (dayIndex === 0) return direction === "north_to_south" ? "Chipping Campden" : "Bath";
  return stops[dayIndex - 1].village;
}

/** Get mile range for a specific day */
export function getDayMileRange(stops: DayStop[], dayIndex: number, direction: "north_to_south" | "south_to_north"): [number, number] {
  const startVillage = getStartVillage(stops, dayIndex, direction);
  const endVillage = stops[dayIndex].village;

  const startV = VILLAGES.find(v => v.name === startVillage);
  const endV = VILLAGES.find(v => v.name === endVillage);

  if (!startV || !endV) return [0, TRAIL_TOTAL_MILES];

  const startMile = Math.min(startV.mile, endV.mile);
  const endMile = Math.max(startV.mile, endV.mile);
  return [startMile, endMile];
}

// ─── Customise helpers ──────────────────────────────────────────────────────

function progressMile(village: Village, direction: "north_to_south" | "south_to_north"): number {
  return direction === "north_to_south" ? village.mile : TRAIL_TOTAL_MILES - village.mile;
}

/** Get available villages between two stops (for add-stop dropdown) */
export function getVillagesBetween(
  fromVillage: string,
  toVillage: string,
  direction: "north_to_south" | "south_to_north",
  exclude: Set<string>
): Village[] {
  const fromV = VILLAGES.find(v => v.name === fromVillage);
  const toV = VILLAGES.find(v => v.name === toVillage);
  if (!fromV || !toV) return [];

  const fromProg = progressMile(fromV, direction);
  const toProg = progressMile(toV, direction);

  return VILLAGES.filter(v => {
    if (exclude.has(v.name)) return false;
    const p = progressMile(v, direction);
    return p > fromProg && p < toProg;
  }).sort((a, b) => progressMile(a, direction) - progressMile(b, direction));
}

/** Helper: rebuild a stop entry with correct miles and walkScore */
function buildStop(village: string, prevVillage: string, day: number, direction: "north_to_south" | "south_to_north"): DayStop {
  const v = VILLAGES.find(x => x.name === village);
  const pv = VILLAGES.find(x => x.name === prevVillage);
  const cumul = v ? progressMile(v, direction) : 0;
  const prevCumul = pv ? progressMile(pv, direction) : 0;
  const miles = Math.round((cumul - prevCumul) * 10) / 10;
  const difficulty = DIFFICULTY_MAP[village] || "moderate";
  const elevationFt = findSegmentElevation(prevVillage, village);
  return {
    day,
    village,
    miles,
    cumulative: Math.round(cumul * 10) / 10,
    difficulty,
    walkScore: computeWalkScore(miles, elevationFt, difficulty),
  };
}

/** Renumber and recalculate all stops */
function renumberStops(stops: DayStop[], direction: "north_to_south" | "south_to_north"): DayStop[] {
  const startVillageName = direction === "north_to_south" ? "Chipping Campden" : "Bath";
  return stops.map((s, i) => {
    if (s.restDay || s.transfer) {
      return { ...s, day: i + 1 };
    }
    const prev = i === 0 ? startVillageName : stops[i - 1].village;
    const rebuilt = buildStop(s.village, prev, i + 1, direction);
    return { ...rebuilt, note: s.note, restDay: s.restDay, transfer: s.transfer, accommodation: s.accommodation, savedPois: s.savedPois };
  });
}

/** Insert a new village stop, returns renumbered array */
export function insertStopAtVillage(
  stops: DayStop[],
  villageName: string,
  direction: "north_to_south" | "south_to_north"
): DayStop[] {
  const v = VILLAGES.find(x => x.name === villageName);
  if (!v) return stops;

  const vProg = progressMile(v, direction);

  // Find insertion index
  let insertIdx = stops.length;
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].restDay) continue;
    const sv = VILLAGES.find(x => x.name === stops[i].village);
    if (sv && progressMile(sv, direction) > vProg) {
      insertIdx = i;
      break;
    }
  }

  const placeholder: DayStop = { day: 0, village: villageName, miles: 0, cumulative: 0, difficulty: "moderate", walkScore: 0 };
  const newStops = [...stops.slice(0, insertIdx), placeholder, ...stops.slice(insertIdx)];
  return renumberStops(newStops, direction);
}

/** Simulate removing a stop — returns warning if the merged day is hard */
export function removeStopWithWarning(
  stops: DayStop[],
  index: number,
  direction: "north_to_south" | "south_to_north"
): { stops: DayStop[]; warning: { day: number; miles: number; walkScore: number } | null } {
  // Rest days can be removed without warning
  if (stops[index].restDay) {
    const newStops = stops.filter((_, i) => i !== index);
    return { stops: renumberStops(newStops, direction), warning: null };
  }

  const newStops = stops.filter((_, i) => i !== index);
  const renumbered = renumberStops(newStops, direction);

  // Check the day that absorbed the removed stop's miles
  // It's the stop at the same index (or the last one if we removed the last)
  const affectedIdx = Math.min(index, renumbered.length - 1);
  const affected = renumbered[affectedIdx];

  if (affected && !affected.restDay && !affected.transfer && affected.walkScore >= 8) {
    return {
      stops: renumbered,
      warning: { day: affected.day, miles: affected.miles, walkScore: affected.walkScore },
    };
  }

  return { stops: renumbered, warning: null };
}

/** Split a hard day by inserting an intermediate village */
export function splitDay(
  stops: DayStop[],
  dayIndex: number,
  direction: "north_to_south" | "south_to_north"
): DayStop[] | null {
  const stop = stops[dayIndex];
  if (!stop || stop.restDay) return null;

  const fromVillage = getStartVillage(stops, dayIndex, direction);
  const usedNames = new Set(stops.map(s => s.village));
  usedNames.add(direction === "north_to_south" ? "Chipping Campden" : "Bath");

  const candidates = getVillagesBetween(fromVillage, stop.village, direction, usedNames);
  if (candidates.length === 0) return null;

  // Pick the village closest to the midpoint
  const fromV = VILLAGES.find(v => v.name === fromVillage);
  const toV = VILLAGES.find(v => v.name === stop.village);
  if (!fromV || !toV) return null;

  const midProg = (progressMile(fromV, direction) + progressMile(toV, direction)) / 2;
  let bestCandidate = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.abs(progressMile(c, direction) - midProg);
    if (d < bestDist) { bestDist = d; bestCandidate = c; }
  }

  return insertStopAtVillage(stops, bestCandidate.name, direction);
}

/** Insert a rest day after a given stop */
export function insertRestDay(stops: DayStop[], afterIndex: number): DayStop[] {
  const prevStop = stops[afterIndex];
  if (!prevStop) return stops;

  const restStop: DayStop = {
    day: 0,
    village: prevStop.village,
    miles: 0,
    cumulative: prevStop.cumulative,
    difficulty: "easy",
    walkScore: 0,
    restDay: true,
    accommodation: prevStop.accommodation,
    savedPois: prevStop.savedPois,
  };

  const newStops = [...stops.slice(0, afterIndex + 1), restStop, ...stops.slice(afterIndex + 1)];
  // Simple renumber (rest days don't affect mile calculations)
  return newStops.map((s, i) => ({ ...s, day: i + 1 }));
}

/** Toggle transfer flag on a stop */
export function markTransfer(
  stops: DayStop[],
  dayIndex: number,
  isTransfer: boolean,
  direction: "north_to_south" | "south_to_north"
): DayStop[] {
  return stops.map((s, i) => {
    if (i !== dayIndex) return s;
    if (isTransfer) {
      return { ...s, transfer: true, walkScore: 0 };
    }
    // Un-transfer: recalculate walkScore
    const prev = getStartVillage(stops, i, direction);
    const elevationFt = findSegmentElevation(prev, s.village);
    const difficulty = DIFFICULTY_MAP[s.village] || "moderate";
    return { ...s, transfer: false, walkScore: computeWalkScore(s.miles, elevationFt, difficulty) };
  });
}

// ─── AI brief → plan glue ───────────────────────────────────────────────────
// These extensions turn a TripBrief (extracted by the LLM) into a fully-formed
// PlanState by reusing autoStops() for the village sequence and adding a
// scoring layer for accommodation selection. Soft constraints are scored, not
// filtered, so the planner degrades gracefully. Hard constraints (mustVisit,
// avoidVillages) surface as rationale events when violated.

/** Property types eligible for each tier. Bnb appears in both shoestring and
 * comfort because the dataset doesn't separate budget B&Bs from mid-range. */
const TIER_TYPES: Record<BudgetTier, ReadonlySet<string>> = {
  shoestring: new Set(["hostel", "bnb"]),
  comfort: new Set(["bnb", "inn", "guesthouse"]),
  "treat-yourself": new Set(["hotel", "cottage", "glamping"]),
};

/** Order to try when the requested tier has no matches in a village. */
const TIER_FALLBACKS: Record<BudgetTier, BudgetTier[]> = {
  shoestring: ["comfort", "treat-yourself"],
  comfort: ["treat-yourself", "shoestring"],
  "treat-yourself": ["comfort", "shoestring"],
};

/** Score a property's fit against a brief, given a budget tier. Higher is
 * better. Tier match is the largest signal; vibe and amenity bonuses break
 * ties; rating is a small tiebreaker. */
export function scoreProperty(p: Property, brief: TripBrief, tier: BudgetTier): number {
  const tierBase = TIER_TYPES[tier].has(p.property_type) ? 1.0 : 0;

  let vibe = 0;
  for (const v of brief.propertyVibes) {
    switch (v) {
      case "character-led":
        if (["bnb", "inn", "cottage"].includes(p.property_type)) vibe += 0.3;
        break;
      case "pub-with-rooms":
        if (p.property_type === "inn") vibe += 0.4;
        break;
      case "boutique":
        if (p.property_type === "hotel" && (p.rating ?? 0) >= 4.5) vibe += 0.3;
        break;
      case "rural-quiet":
        if (p.trail_distance_miles <= 0.5 && ["bnb", "cottage"].includes(p.property_type)) vibe += 0.3;
        break;
      case "town-centre":
        if (["hotel", "inn"].includes(p.property_type) && p.trail_distance_miles <= 0.3) vibe += 0.2;
        break;
    }
  }

  let amenity = 0;
  if (brief.dogFriendly && p.is_dog_friendly) amenity += 0.5;
  if (brief.diningPreference === "pub-nightly" && p.property_type === "inn") amenity += 0.2;
  if (p.has_luggage_transfer) amenity += 0.1;

  // Rating up to +0.5
  const rating = (p.rating ?? 3.5) / 10;

  return tierBase + vibe + amenity + rating;
}

export interface AccommodationSelection {
  property: Property | null;
  /** Set when the requested tier had no matches and we fell back. */
  relaxedToTier?: BudgetTier;
  /** Stable token a prompt can map to prose. */
  reason?: string;
}

/** Pick the best property in `village` for the brief and tier. Falls back
 * through adjacent tiers when the requested tier is empty, then to any
 * candidate if nothing matches at all. Returns null only when the village has
 * no candidates after hard filters (dog-friendly). */
export function selectAccommodation(
  village: string,
  brief: TripBrief,
  tier: BudgetTier,
  properties: readonly Property[],
): AccommodationSelection {
  const inVillage = properties.filter(
    (p) => p.village.toLowerCase() === village.toLowerCase(),
  );
  if (inVillage.length === 0) {
    return { property: null, reason: "no-properties-in-village" };
  }

  let candidates = inVillage;
  if (brief.dogFriendly) {
    candidates = candidates.filter((p) => p.is_dog_friendly);
    if (candidates.length === 0) {
      return { property: null, reason: "no-dog-friendly-properties" };
    }
  }

  const tryTier = (t: BudgetTier): Property | null => {
    const inTier = candidates.filter((p) => TIER_TYPES[t].has(p.property_type));
    if (inTier.length === 0) return null;
    return inTier.reduce((best, p) =>
      scoreProperty(p, brief, t) > scoreProperty(best, brief, t) ? p : best,
    );
  };

  const primary = tryTier(tier);
  if (primary) return { property: primary };

  for (const fallback of TIER_FALLBACKS[tier]) {
    const alt = tryTier(fallback);
    if (alt) return { property: alt, relaxedToTier: fallback, reason: `no-${tier}-here` };
  }

  // Last resort — any candidate. Useful when property_types in a village
  // don't map cleanly to any tier (e.g. glamping-only villages with budget brief).
  const any = candidates.reduce((best, p) =>
    scoreProperty(p, brief, tier) > scoreProperty(best, brief, tier) ? p : best,
  );
  return { property: any, reason: "best-effort-fallback" };
}

/** Attach accommodations to a stops array using the brief. Emits rationale
 * events the narration prompt can turn into prose. Does NOT modify stop count,
 * mileage, or difficulty — those are autoStops's responsibility. */
export function applyBriefToStops(
  stops: DayStop[],
  brief: TripBrief,
  properties: readonly Property[],
): { stops: DayStop[]; rationale: PlanRationale } {
  const events: RationaleEvent[] = [];
  const unmet: string[] = [];
  const tier: BudgetTier = brief.budgetTier ?? "comfort";

  const enriched = stops.map((stop) => {
    if (stop.restDay || stop.transfer) return stop;

    const result = selectAccommodation(stop.village, brief, tier, properties);
    if (!result.property) {
      events.push({
        kind: "property-rejected",
        day: stop.day,
        village: stop.village,
        reason: result.reason ?? "no-match",
      });
      return stop;
    }

    if (result.relaxedToTier) {
      events.push({
        kind: "constraint-relaxed",
        day: stop.day,
        village: stop.village,
        propertySlug: result.property.slug,
        reason: result.reason ?? `relaxed-to-${result.relaxedToTier}`,
        detail: { requestedTier: tier, actualTier: result.relaxedToTier },
      });
    } else {
      events.push({
        kind: "property-chosen",
        day: stop.day,
        village: stop.village,
        propertySlug: result.property.slug,
        reason: "best-match",
      });
    }

    const next: DayStop = {
      ...stop,
      accommodation: {
        slug: result.property.slug,
        name: result.property.name,
        village: result.property.village,
        propertyType: result.property.property_type,
        image: result.property.image_url ?? undefined,
      },
    };
    return next;
  });

  // Honour deal-breakers
  for (const mv of brief.mustVisit) {
    const present = enriched.some((s) => s.village.toLowerCase() === mv.toLowerCase());
    if (!present) {
      unmet.push(`mustVisit:${mv}`);
      events.push({
        kind: "deal-breaker-violation",
        village: mv,
        reason: "must-visit-not-in-stops",
      });
    }
  }
  for (const av of brief.avoidVillages) {
    const hit = enriched.find((s) => s.village.toLowerCase() === av.toLowerCase());
    if (hit) {
      unmet.push(`avoidVillages:${av}`);
      events.push({
        kind: "deal-breaker-violation",
        day: hit.day,
        village: av,
        reason: "avoid-village-included",
      });
    }
  }

  return {
    stops: enriched,
    rationale: {
      briefSummary: {
        days: brief.days ?? stops.length,
        direction: brief.direction ?? "north_to_south",
        fitness: brief.fitness,
        budgetTier: tier,
        dogFriendly: brief.dogFriendly,
        propertyVibes: brief.propertyVibes,
        diningPreference: brief.diningPreference,
      },
      events,
      unmet,
    },
  };
}

/** Map a fitness level to a sensible default day count when the brief doesn't
 * specify days. Explicit `brief.days` always wins. */
export function daysFromFitness(fitness: TripBrief["fitness"]): number {
  switch (fitness) {
    case "relaxed": return 11;
    case "moderate": return 9;
    case "fit": return 7;
    case "very-fit": return 5;
  }
}
