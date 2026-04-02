/**
 * Plan Engine — consolidated data and computation for trip planning.
 * Pure functions, no React dependencies.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Village {
  name: string;
  mile: number;
  lat: number;
}

export interface PlannedAccommodation {
  slug: string;          // links to /property/[slug]
  name: string;
  village: string;
  propertyType: string;  // "hotel" | "inn" | "bnb" etc.
  image?: string;        // thumbnail URL
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

export interface PlanState {
  direction: "north_to_south" | "south_to_north";
  days: number;
  month: number;        // 0-11
  dogFriendly: boolean;
  stops: DayStop[];
}

export interface CostBreakdown {
  accommodation: number;
  luggage: number;
  lunches: number;
  dinners: number;
  total: number;
  perNight: number;
}

// ─── Static Data ────────────────────────────────────────────────────────────

export const VILLAGES: Village[] = [
  { name: "Chipping Campden", mile: 0,    lat: 52.0536 },
  { name: "Broadway",         mile: 6.2,  lat: 52.0356 },
  { name: "Stanton",          mile: 10,   lat: 52.024  },
  { name: "Winchcombe",       mile: 15.5, lat: 51.9539 },
  { name: "Cleeve Hill",      mile: 20,   lat: 51.9348 },
  { name: "Cheltenham",       mile: 26,   lat: 51.8994 },
  { name: "Birdlip",          mile: 33,   lat: 51.8403 },
  { name: "Cranham",          mile: 36,   lat: 51.82   },
  { name: "Painswick",        mile: 40,   lat: 51.7889 },
  { name: "Stroud",           mile: 46,   lat: 51.7452 },
  { name: "King's Stanley",   mile: 49,   lat: 51.728  },
  { name: "Dursley",          mile: 57,   lat: 51.6813 },
  { name: "North Nibley",     mile: 60,   lat: 51.66   },
  { name: "Wotton-under-Edge",mile: 63,   lat: 51.6366 },
  { name: "Old Sodbury",      mile: 75,   lat: 51.5395 },
  { name: "Tormarton",        mile: 80,   lat: 51.505  },
  { name: "Cold Ashton",      mile: 88,   lat: 51.43   },
  { name: "Bath",             mile: 102,  lat: 51.3811 },
];

export const TRAIL_SEGMENTS = [
  { from: "Chipping Campden", to: "Broadway",          miles: 6.2,  elevationFt: 850,  difficulty: "moderate"  as const },
  { from: "Broadway",         to: "Winchcombe",         miles: 11.4, elevationFt: 1240, difficulty: "strenuous" as const },
  { from: "Winchcombe",       to: "Cheltenham",         miles: 12.8, elevationFt: 980,  difficulty: "moderate"  as const },
  { from: "Cheltenham",       to: "Painswick",          miles: 13.5, elevationFt: 1100, difficulty: "strenuous" as const },
  { from: "Painswick",        to: "Stroud",             miles: 8.6,  elevationFt: 640,  difficulty: "moderate"  as const },
  { from: "Stroud",           to: "Dursley",            miles: 14.0, elevationFt: 1380, difficulty: "strenuous" as const },
  { from: "Dursley",          to: "Wotton-under-Edge",  miles: 7.2,  elevationFt: 580,  difficulty: "moderate"  as const },
  { from: "Wotton-under-Edge",to: "Old Sodbury",        miles: 15.5, elevationFt: 920,  difficulty: "strenuous" as const },
  { from: "Old Sodbury",      to: "Bath",               miles: 20.7, elevationFt: 760,  difficulty: "moderate"  as const },
];

// Elevation profile data (mile, elevation in metres)
export const ELEVATION_POINTS: [number, number][] = [
  [0, 170], [2, 240], [4, 285], [6, 65], [8, 120], [10, 185],
  [12, 95], [14, 78], [16, 62], [18, 52], [20, 180], [22.8, 330],
  [24, 260], [26, 100], [27, 80], [29, 150], [31, 220], [33, 265],
  [35, 200], [37, 175], [39, 140], [40.5, 188], [42, 120], [44, 88],
  [46, 68], [48, 140], [50, 175], [52, 145], [54, 80], [56, 52],
  [58, 28], [60, 85], [62, 160], [64, 178], [66, 68], [68, 96],
  [70, 152], [72, 185], [74, 124], [76, 122], [78, 160], [80, 195],
  [82, 212], [84, 190], [86, 220], [88, 165], [90, 130], [92, 175],
  [94, 210], [96, 220], [98, 165], [100, 90], [102, 40],
];

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

// ─── Computation ────────────────────────────────────────────────────────────

export function computeWalkScore(miles: number, elevationFt: number, difficulty: "easy" | "moderate" | "strenuous"): number {
  const raw = (miles * 100 + elevationFt * 0.5) * DIFFICULTY_FACTOR[difficulty];
  const score = Math.round(Math.min(10, Math.max(1, raw / 300)));
  return score;
}

export function estimateWalkingTime(miles: number, elevationFt: number): string {
  // Naismith's rule: 3mph + 1 hour per 2000ft ascent
  const baseHours = miles / 3;
  const climbHours = elevationFt / 2000;
  const total = baseHours + climbHours;
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function getDifficulty(miles: number, elevationFt: number): "easy" | "moderate" | "strenuous" {
  if (miles > 16 || elevationFt > 2000) return "strenuous";
  if (miles > 10 || elevationFt > 1000) return "moderate";
  return "easy";
}

/** Find the elevation gain for a segment between two villages */
export function findSegmentElevation(from: string, to: string): number {
  // Try exact match in TRAIL_SEGMENTS
  const seg = TRAIL_SEGMENTS.find(s => s.from === from && s.to === to);
  if (seg) return seg.elevationFt;

  // Estimate from mile markers and elevation data
  const fromVillage = VILLAGES.find(v => v.name === from);
  const toVillage = VILLAGES.find(v => v.name === to);
  if (!fromVillage || !toVillage) return 800; // default

  const startMile = Math.min(fromVillage.mile, toVillage.mile);
  const endMile = Math.max(fromVillage.mile, toVillage.mile);

  // Sum positive elevation changes along the segment
  let gain = 0;
  let prevElev = 0;
  for (const [m, e] of ELEVATION_POINTS) {
    if (m >= startMile && m <= endMile) {
      if (prevElev > 0 && e > prevElev) gain += (e - prevElev);
      prevElev = e;
    }
  }
  // Convert meters to feet and scale
  return Math.round(gain * 3.281);
}

export function autoStops(days: number, direction: "north_to_south" | "south_to_north"): DayStop[] {
  const totalMiles = 102.0;
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
      const progressMile = direction === "north_to_south" ? v.mile : 102 - v.mile;
      const dist = Math.abs(progressMile - targetMile);
      if (dist < bestDist && progressMile > lastMile && progressMile < totalMiles) {
        bestDist = dist;
        best = v;
      }
    }

    const progressMile = direction === "north_to_south" ? best.mile : 102 - best.mile;
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
    cumulative: totalMiles,
    difficulty: finalDifficulty,
    walkScore: computeWalkScore(finalMiles, finalElevation, finalDifficulty),
  });

  return stops;
}

export function computeConnections(stops: DayStop[], direction: "north_to_south" | "south_to_north"): Connection[] {
  const connections: Connection[] = [];
  const startVillage = direction === "north_to_south" ? VILLAGES[0].name : VILLAGES[VILLAGES.length - 1].name;

  for (let i = 0; i < stops.length; i++) {
    const from = i === 0 ? startVillage : stops[i - 1].village;
    const to = stops[i].village;
    const miles = stops[i].miles;
    const elevationFt = findSegmentElevation(from, to);
    const difficulty = getDifficulty(miles, elevationFt);

    let terrain = "Gentle Walk";
    if (elevationFt > 1200) terrain = "Steep Escarpment";
    else if (elevationFt > 800) terrain = "Moderate Ascent";
    else if (miles > 15) terrain = "Long Valley Route";

    connections.push({
      from, to, distance: miles,
      elevationGain: elevationFt,
      walkTime: estimateWalkingTime(miles, elevationFt),
      difficulty, terrain,
    });
  }

  return connections;
}

export function estimateCosts(nights: number): CostBreakdown {
  const perNight = 95; // B&B average
  const accommodation = nights * perNight;
  const luggage = nights * 12;
  const lunches = (nights + 1) * 15; // one more day than nights
  const dinners = nights * 25;

  return {
    accommodation, luggage, lunches, dinners, perNight,
    total: accommodation + luggage + lunches + dinners,
  };
}

/** Approximate mile marker from latitude using village anchors */
export function approximateMileFromLat(lat: number): number {
  // Villages are ordered N→S (decreasing lat, increasing mile)
  for (let i = 0; i < VILLAGES.length - 1; i++) {
    const a = VILLAGES[i];
    const b = VILLAGES[i + 1];
    if (lat <= a.lat && lat >= b.lat) {
      const t = (a.lat - lat) / (a.lat - b.lat);
      return a.mile + t * (b.mile - a.mile);
    }
  }
  // Outside range
  if (lat > VILLAGES[0].lat) return 0;
  return 102;
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

  if (!startV || !endV) return [0, 102];

  const startMile = Math.min(startV.mile, endV.mile);
  const endMile = Math.max(startV.mile, endV.mile);
  return [startMile, endMile];
}

// ─── Customise helpers ──────────────────────────────────────────────────────

function progressMile(village: Village, direction: "north_to_south" | "south_to_north"): number {
  return direction === "north_to_south" ? village.mile : 102 - village.mile;
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
    return { ...rebuilt, note: s.note, restDay: s.restDay, transfer: s.transfer, accommodation: s.accommodation };
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
