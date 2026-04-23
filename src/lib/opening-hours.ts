/**
 * Lightweight OSM opening_hours probe. NOT a full parser (the real spec is
 * baroque — if you need strict correctness use the `opening_hours` npm package,
 * but that adds ~200 KB). This handles the common rural-pub patterns:
 *
 *   "Mo-Fr 09:00-17:00"
 *   "Tu-Su 12:00-23:00"              (Monday closed)
 *   "We-Mo 12:00-23:00"              (Tuesday closed)
 *   "Mo-Su 12:00-23:00"              (always open)
 *   "Mo off; Tu-Su 12:00-23:00"      (Monday explicit)
 *   "24/7"
 *   "closed Mondays"                 (informal)
 *
 * Returns one of `"open" | "closed" | "unknown"` for a given Date. "unknown"
 * means we can't confidently say from the rule — render no warning.
 */

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type OpeningStatus = "open" | "closed" | "unknown";

function dayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sunday
}

function expandRange(from: string, to: string): Set<string> {
  const start = DAY_NAMES.indexOf(from);
  const end = DAY_NAMES.indexOf(to);
  if (start < 0 || end < 0) return new Set();
  const out = new Set<string>();
  let i = start;
  // Walk forward allowing wrap-around (e.g. Fr-Mo → Fr, Sa, Su, Mo).
  for (let step = 0; step < 8; step++) {
    out.add(DAY_NAMES[i]);
    if (i === end) break;
    i = (i + 1) % 7;
  }
  return out;
}

/** Pulls the set of days where the venue has explicit open-hours rules. */
function openDaysFromRule(rule: string): Set<string> | null {
  const trimmed = rule.trim();
  if (!trimmed) return null;

  // "24/7" — always open
  if (/^24\/7/i.test(trimmed)) return new Set(DAY_NAMES);

  // Extract the leading day selector: "Mo-Fr", "Tu-Su", "Mo,We,Fr", "Mo"
  // The rest is time; we only need to know which days this rule applies to.
  const m = trimmed.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*[-,]\s*(Mo|Tu|We|Th|Fr|Sa|Su))*/);
  if (!m) return null;

  const prefix = m[0].trim();
  const openDays = new Set<string>();
  // Split on commas for day lists: "Mo,We,Fr"
  for (const part of prefix.split(",").map((s) => s.trim())) {
    const range = part.split("-").map((s) => s.trim());
    if (range.length === 1 && DAY_NAMES.includes(range[0])) {
      openDays.add(range[0]);
    } else if (range.length === 2) {
      for (const d of expandRange(range[0], range[1])) openDays.add(d);
    }
  }
  // If the rule body says "off" / "closed", this rule is actually a closure, not open.
  if (/\b(off|closed)\b/i.test(trimmed.slice(prefix.length))) {
    return null;
  }
  return openDays.size > 0 ? openDays : null;
}

/**
 * Best-effort check of whether a venue is open on `date`.
 * Concatenated rules (separated by `;`) are aggregated: any rule that opens
 * on that day makes the whole thing "open".
 */
export function isOpenOn(openingHours: string | undefined | null, date: Date): OpeningStatus {
  if (!openingHours) return "unknown";
  const str = openingHours.trim();
  if (!str) return "unknown";
  if (/^24\/7/i.test(str)) return "open";

  const dayKey = DAY_NAMES[dayOfWeek(date)];

  // Handle informal "closed Mondays" patterns that sometimes slip into OSM.
  const informalClosed = /closed (Mo|Tu|We|Th|Fr|Sa|Su|Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:days?)?/i.exec(str);
  if (informalClosed) {
    const abbr = informalClosed[1].slice(0, 2);
    if (abbr === dayKey) return "closed";
  }

  const rules = str.split(";").map((r) => r.trim()).filter(Boolean);
  if (rules.length === 0) return "unknown";

  const seenDayRules: Set<string> = new Set();
  for (const rule of rules) {
    const openDays = openDaysFromRule(rule);
    if (!openDays) continue;
    for (const d of openDays) seenDayRules.add(d);
    if (openDays.has(dayKey)) return "open";
  }
  // If we parsed rules and none apply to this day, we can say closed.
  if (seenDayRules.size > 0) return "closed";
  return "unknown";
}
