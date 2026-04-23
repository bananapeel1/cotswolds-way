#!/usr/bin/env node
/**
 * Quick smoke test: load the trail data, run a 7-day autoStops equivalent in
 * plain JS, verify distances + ascent + descent all reconcile.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/trail-accurate.json"), "utf8")
);

console.log("Trail total miles:", data.trail.totalMiles);
console.log("Trail total ascent:", data.trail.totalAscentM, "m /", data.trail.totalAscentFt, "ft");
console.log("Trail total descent:", data.trail.totalDescentM, "m /", data.trail.totalDescentFt, "ft");
console.log("Highest:", data.trail.highestPoint);
console.log();

// Sum segments — should equal total miles (±rounding) and total ascent
let segMiles = 0;
let segAscent = 0;
let segDescent = 0;
for (const s of data.segments) {
  segMiles += s.miles;
  segAscent += s.ascentM;
  segDescent += s.descentM;
}
console.log("Consecutive segments sum:");
console.log("  miles:   ", segMiles.toFixed(2), "(expect ~", data.trail.totalMiles, ")");
console.log("  ascentM: ", segAscent, "(expect ~", data.trail.totalAscentM, ")");
console.log("  descentM:", segDescent, "(expect ~", data.trail.totalDescentM, ")");
console.log();

// Walk-time check with Tobler
const KM_PER_MILE = 1.609344;
function toblerHours(miles, ascentM, descentM) {
  const km = miles * KM_PER_MILE;
  if (km <= 0) return 0;
  const up = km / 2;
  const down = km / 2;
  const slopeUp = up > 0 ? ascentM / 1000 / up : 0;
  const slopeDown = down > 0 ? -descentM / 1000 / down : 0;
  const vUp = 6 * Math.exp(-3.5 * Math.abs(slopeUp + 0.05));
  const vDown = 6 * Math.exp(-3.5 * Math.abs(slopeDown + 0.05));
  return up / vUp + down / vDown;
}

console.log("Stage walk-time (Tobler estimate, single day between villages):");
for (const s of data.segments) {
  const t = toblerHours(s.miles, s.ascentM, s.descentM);
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  console.log(
    `  ${s.from.padEnd(22)} → ${s.to.padEnd(22)} ` +
    `${s.miles.toFixed(1).padStart(5)}mi  +${s.ascentM.toString().padStart(4)}m  -${s.descentM.toString().padStart(4)}m  ` +
    `${h}h${m.toString().padStart(2, "0")}`
  );
}
console.log();

// Rough sanity: the whole trail should take roughly 30-40h of walking
const totalHours = toblerHours(data.trail.totalMiles, data.trail.totalAscentM, data.trail.totalDescentM);
console.log("Whole-trail Tobler estimate:", totalHours.toFixed(1), "hours (typical guides cite 30–40h walking)");
