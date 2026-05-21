/**
 * Compact village catalogue passed to the LLM as system context during brief
 * extraction. The model uses it to (a) recognise canonical village names, and
 * (b) understand roughly what's available where.
 *
 * Kept small (~1k tokens) on purpose — the model should never need to choose a
 * property. Property selection is deterministic, downstream in plan-engine.
 */
import { VILLAGES, TRAIL_TOTAL_MILES } from "@/lib/plan-engine";
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/queries";

const properties = propertiesData as Property[];

interface VillageEntry {
  name: string;
  mile: number;
  offTrailKm: number;
  propertyCounts: Record<string, number>;
  totalProperties: number;
}

function buildEntries(): VillageEntry[] {
  return VILLAGES.map((v) => {
    const inVillage = properties.filter(
      (p) => p.village.toLowerCase() === v.name.toLowerCase(),
    );
    const counts: Record<string, number> = {};
    for (const p of inVillage) {
      counts[p.property_type] = (counts[p.property_type] || 0) + 1;
    }
    return {
      name: v.name,
      mile: v.mile,
      offTrailKm: v.offTrailKm,
      propertyCounts: counts,
      totalProperties: inVillage.length,
    };
  });
}

const ENTRIES = buildEntries();

function fmtCounts(counts: Record<string, number>): string {
  const parts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n} ${type}${n > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(", ") : "no listed stays";
}

/** Canonical village names — used to validate model output. */
export const CANONICAL_VILLAGES: string[] = ENTRIES.map((e) => e.name);

const CANONICAL_LOWER = new Set(CANONICAL_VILLAGES.map((v) => v.toLowerCase()));

/** Returns the canonical-case name if `candidate` matches a known village (case-insensitive), otherwise null. */
export function canonicaliseVillage(candidate: string): string | null {
  const lower = candidate.trim().toLowerCase();
  if (!CANONICAL_LOWER.has(lower)) return null;
  return CANONICAL_VILLAGES.find((v) => v.toLowerCase() === lower) ?? null;
}

/** The catalogue rendered as a markdown block for system prompts. */
export const VILLAGE_CATALOGUE_MARKDOWN: string = (() => {
  const lines = [
    `# Cotswold Way villages (total trail: ${TRAIL_TOTAL_MILES.toFixed(1)} miles, north→south)`,
    "",
    "Use these canonical names exactly when populating `mustVisit` or `avoidVillages`.",
    "",
  ];
  for (const e of ENTRIES) {
    const off = e.offTrailKm > 0.2 ? ` (${e.offTrailKm.toFixed(1)}km off-trail)` : "";
    lines.push(
      `- **${e.name}** — mile ${e.mile.toFixed(1)}${off}; ${fmtCounts(e.propertyCounts)}`,
    );
  }
  lines.push("");
  lines.push(
    "Trail endpoints: Chipping Campden (north) and Bath (south). All overnight stops must lie between them.",
  );
  return lines.join("\n");
})();
