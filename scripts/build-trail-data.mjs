#!/usr/bin/env node
/**
 * Builds trail-accurate data from the real Cotswold Way GeoJSON:
 *   - Precomputes cumulative distance at every trail point (haversine)
 *   - Snaps each village anchor to its nearest trail point → true mile markers
 *   - Fetches real elevation from Open-Meteo at evenly sampled points along the trail
 *   - Computes cumulative ascent + descent
 *
 * Output: src/data/trail-accurate.json
 *
 * Run: node scripts/build-trail-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GEOJSON_PATH = resolve(ROOT, "public/data/cotswold-way.geojson");
const OUTPUT_PATH = resolve(ROOT, "src/data/trail-accurate.json");

// 18 village anchors with their lat/lng (OpenStreetMap-verified village centres).
// Villages are listed in official north→south walking order. We snap each to its
// nearest trail point, BUT only searching forward of the previous village's snap
// — the Cotswold Way zigzags, so unconstrained closest-point matches the wrong
// section (e.g. Stanton ends up near Broadway).
//
// Known authoritative mile markers ("known") override the snap. These come from
// the official National Trail stage distances and guidebook (Harvey Map, Kev
// Reynolds). The remaining villages are interpolated by snap + constraint.
const VILLAGE_ANCHORS = [
  { name: "Chipping Campden",   lat: 52.0536, lng: -1.7798, known: 0 },
  { name: "Broadway",           lat: 52.0371, lng: -1.8760 },
  { name: "Stanton",            lat: 52.0188, lng: -1.8816, known: 10.3 },
  { name: "Winchcombe",         lat: 51.9539, lng: -1.9677 },
  { name: "Cleeve Hill",        lat: 51.9348, lng: -2.0130, known: 24.2 },
  { name: "Cheltenham",         lat: 51.8994, lng: -2.0783 }, // off-trail detour
  { name: "Birdlip",            lat: 51.8403, lng: -2.1106, known: 39.9 },
  { name: "Cranham",            lat: 51.8200, lng: -2.1380 },
  { name: "Painswick",          lat: 51.7889, lng: -2.1970, known: 46.9 },
  { name: "Stroud",             lat: 51.7452, lng: -2.2170 }, // off-trail detour
  { name: "King's Stanley",     lat: 51.7280, lng: -2.2760, known: 56.5 },
  { name: "Dursley",            lat: 51.6813, lng: -2.3570 },
  { name: "North Nibley",       lat: 51.6600, lng: -2.3770 },
  { name: "Wotton-under-Edge",  lat: 51.6366, lng: -2.3470, known: 68.9 },
  { name: "Old Sodbury",        lat: 51.5395, lng: -2.3960, known: 77.5 }, // trail detours east
  { name: "Tormarton",          lat: 51.5050, lng: -2.3340, known: 83.4 },
  { name: "Cold Ashton",        lat: 51.4300, lng: -2.3540 },
  { name: "Bath",               lat: 51.3811, lng: -2.3595, known: 102.59 }, // matches OSM total
];

// How many elevation samples to fetch from Open-Meteo. 400 points along a 102mi
// trail gives ~0.25mi resolution — accurate enough for all downstream use.
const ELEVATION_SAMPLES = 400;

// ─── Geometry helpers ──────────────────────────────────────────────────────
function haversineKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const KM_PER_MILE = 1.609344;
const M_PER_FT = 0.3048;

// ─── Step 1: load trail and compute cumulative distances ──────────────────
console.log("→ loading", GEOJSON_PATH);
const geo = JSON.parse(readFileSync(GEOJSON_PATH, "utf8"));
const coords = geo.features[0].geometry.coordinates; // [[lng, lat], ...]
console.log(`  ${coords.length} trail points loaded`);

const cumulativeKm = new Array(coords.length);
cumulativeKm[0] = 0;
for (let i = 1; i < coords.length; i++) {
  cumulativeKm[i] = cumulativeKm[i - 1] + haversineKm(coords[i - 1], coords[i]);
}
const totalKm = cumulativeKm[coords.length - 1];
const totalMiles = totalKm / KM_PER_MILE;
console.log(`  trail length: ${totalKm.toFixed(2)} km / ${totalMiles.toFixed(2)} miles`);

// ─── Step 2: snap each village to the trail, monotonically ────────────────
// Villages are given in walking order. We snap each one to its nearest trail
// point AFTER the previous village's snap. If a village has a `known` mile
// value, we use the trail point at that mile directly (authoritative override).
console.log("→ snapping villages to trail (monotonic)");

function trailIndexAtMile(mile) {
  const targetKm = mile * KM_PER_MILE;
  let lo = 0;
  let hi = cumulativeKm.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulativeKm[mid] < targetKm) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function snapForwardFrom(lat, lng, minIndex) {
  let bestIdx = minIndex;
  let bestDistKm = Infinity;
  for (let i = minIndex; i < coords.length; i++) {
    const d = haversineKm([lng, lat], coords[i]);
    if (d < bestDistKm) {
      bestDistKm = d;
      bestIdx = i;
    }
  }
  return { index: bestIdx, distKmFromTrail: bestDistKm };
}

const villages = [];
let prevIndex = 0;
for (const v of VILLAGE_ANCHORS) {
  let index;
  let distKmFromTrail;
  let source;
  if (v.known !== undefined) {
    index = trailIndexAtMile(v.known);
    distKmFromTrail = haversineKm([v.lng, v.lat], coords[index]);
    source = "known";
  } else {
    const snap = snapForwardFrom(v.lat, v.lng, prevIndex);
    index = snap.index;
    distKmFromTrail = snap.distKmFromTrail;
    source = "snap";
  }
  const mile = cumulativeKm[index] / KM_PER_MILE;
  villages.push({
    name: v.name,
    anchorLat: v.lat,
    anchorLng: v.lng,
    trailLat: coords[index][1],
    trailLng: coords[index][0],
    trailPointIndex: index,
    mile: Math.round(mile * 100) / 100,
    km: Math.round(cumulativeKm[index] * 100) / 100,
    offTrailKm: Math.round(distKmFromTrail * 1000) / 1000,
    source,
  });
  prevIndex = index;
}

villages.forEach((v) =>
  console.log(
    `  ${v.mile.toFixed(2).padStart(6)} mi  ${v.name.padEnd(24)}  ${v.source.padEnd(5)} (${v.offTrailKm.toFixed(3)} km off-trail)`
  )
);

// ─── Step 3: fetch real elevation along the trail ─────────────────────────
console.log(`→ sampling ${ELEVATION_SAMPLES} elevation points from Open-Meteo`);

// Pick `ELEVATION_SAMPLES` evenly spaced points (by distance) along the trail.
const sampledIndices = [];
for (let i = 0; i < ELEVATION_SAMPLES; i++) {
  const targetKm = (i / (ELEVATION_SAMPLES - 1)) * totalKm;
  // Binary search for the trail point closest to this cumulative distance.
  let lo = 0;
  let hi = cumulativeKm.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulativeKm[mid] < targetKm) lo = mid + 1;
    else hi = mid;
  }
  sampledIndices.push(lo);
}

// Open-Meteo's elevation API accepts up to 100 coordinates per call.
async function fetchElevations(points) {
  const BATCH = 100;
  const out = new Array(points.length);
  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    const lats = batch.map((p) => p[1]).join(",");
    const lngs = batch.map((p) => p[0]).join(",");
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Open-Meteo: ${resp.status} ${await resp.text()}`);
    const json = await resp.json();
    for (let j = 0; j < batch.length; j++) out[i + j] = json.elevation[j];
    process.stdout.write(`  fetched ${Math.min(i + BATCH, points.length)}/${points.length}\r`);
  }
  console.log();
  return out;
}

const sampleCoords = sampledIndices.map((i) => coords[i]);
const elevations = await fetchElevations(sampleCoords);

// Build the elevation profile: [mile, elevationMetres] pairs
const profile = sampledIndices.map((idx, i) => [
  Math.round((cumulativeKm[idx] / KM_PER_MILE) * 100) / 100,
  Math.round(elevations[i]),
]);

// Compute cumulative ascent and descent across the full profile.
let totalAscentM = 0;
let totalDescentM = 0;
for (let i = 1; i < profile.length; i++) {
  const delta = profile[i][1] - profile[i - 1][1];
  if (delta > 0) totalAscentM += delta;
  else totalDescentM -= delta;
}
console.log(
  `  total ascent: ${Math.round(totalAscentM)} m (${Math.round(totalAscentM / M_PER_FT)} ft)`
);
console.log(
  `  total descent: ${Math.round(totalDescentM)} m (${Math.round(totalDescentM / M_PER_FT)} ft)`
);

const highest = profile.reduce((a, b) => (b[1] > a[1] ? b : a));
console.log(`  highest point: ${highest[1]} m at mile ${highest[0]}`);

// ─── Step 4: compute per-segment ascent/descent between consecutive villages ──
console.log("→ computing village-to-village segments");
function ascentBetween(m1, m2) {
  const [lo, hi] = m1 < m2 ? [m1, m2] : [m2, m1];
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < profile.length; i++) {
    const [pm, _] = profile[i];
    const [pmPrev, __] = profile[i - 1];
    if (pmPrev < lo || pm > hi) continue;
    const delta = profile[i][1] - profile[i - 1][1];
    if (delta > 0) ascent += delta;
    else descent -= delta;
  }
  return { ascentM: Math.round(ascent), descentM: Math.round(descent) };
}

const segments = [];
for (let i = 0; i < villages.length - 1; i++) {
  const a = villages[i];
  const b = villages[i + 1];
  const miles = Math.round((b.mile - a.mile) * 100) / 100;
  const { ascentM, descentM } = ascentBetween(a.mile, b.mile);
  segments.push({
    from: a.name,
    to: b.name,
    miles,
    km: Math.round(miles * KM_PER_MILE * 100) / 100,
    ascentM,
    descentM,
    ascentFt: Math.round(ascentM / M_PER_FT),
    descentFt: Math.round(descentM / M_PER_FT),
  });
}

// ─── Step 5: build a simplified polyline for fast client-side mile-snapping ──
// Ship every Nth coordinate plus its cumulative mile. 2000 points over 165 km
// ≈ one sample per 80 m, more than accurate enough to snap POIs/accommodations
// to a trail mile. We keep [lat, lng, mile] tuples, rounded for smaller JSON.
const TARGET_POLYLINE_POINTS = 2000;
const step = Math.max(1, Math.round(coords.length / TARGET_POLYLINE_POINTS));
const polyline = [];
for (let i = 0; i < coords.length; i += step) {
  const [lng, lat] = coords[i];
  const mile = cumulativeKm[i] / KM_PER_MILE;
  polyline.push([
    Math.round(lat * 1e5) / 1e5,
    Math.round(lng * 1e5) / 1e5,
    Math.round(mile * 100) / 100,
  ]);
}
// Ensure the final point is the true end of the trail.
if (polyline[polyline.length - 1][2] !== Math.round(totalMiles * 100) / 100) {
  const [lng, lat] = coords[coords.length - 1];
  polyline.push([
    Math.round(lat * 1e5) / 1e5,
    Math.round(lng * 1e5) / 1e5,
    Math.round(totalMiles * 100) / 100,
  ]);
}
console.log(`→ polyline: ${polyline.length} [lat, lng, mile] tuples (step ${step})`);

// ─── Step 6: write output ─────────────────────────────────────────────────
const output = {
  generatedAt: new Date().toISOString(),
  source: {
    geojson: "public/data/cotswold-way.geojson",
    elevation: "Open-Meteo elevation API (SRTM/COPERNICUS)",
  },
  trail: {
    totalMiles: Math.round(totalMiles * 100) / 100,
    totalKm: Math.round(totalKm * 100) / 100,
    totalAscentM: Math.round(totalAscentM),
    totalDescentM: Math.round(totalDescentM),
    totalAscentFt: Math.round(totalAscentM / M_PER_FT),
    totalDescentFt: Math.round(totalDescentM / M_PER_FT),
    highestPoint: { mile: highest[0], elevationM: highest[1] },
    pointCount: coords.length,
    polylinePoints: polyline.length,
  },
  villages,
  segments,
  elevationProfile: profile,
  polyline,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`✓ wrote ${OUTPUT_PATH}`);
console.log(`  ${villages.length} villages, ${segments.length} segments, ${profile.length} elevation points`);
