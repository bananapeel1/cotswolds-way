import { z } from "zod";

// Structured walk parameters extracted from a free-text description on /walks
// ("an easy 3-hour walk near Painswick with a pub lunch"). Mirrors the engine's
// LoopRequest customisation fields so the result can pre-fill the form directly.
//
// Every field is `.default()`-ed on purpose: Genkit's structured-output mode
// doesn't reliably apply Zod defaults when the model omits a field, so we
// re-parse the raw output through this schema to fill them (see
// extract-walk-intent.ts → normalizeIntent). Without that, an omitted field
// comes back `undefined` and downstream code breaks.

export const WalkThemeSchema = z.enum(["ridge", "valley", "woodland", "mixed"]);
export const WalkDifficultySchema = z.enum(["easy", "moderate", "strenuous"]);
export const WalkPaceSchema = z.enum(["leisurely", "steady", "brisk"]);
export const WalkLunchStopSchema = z.enum(["required", "preferred", "none"]);

export const WalkIntentSchema = z.object({
  theme: WalkThemeSchema.default("mixed").describe(
    "'views'/'ridge'/'hilltop' → ridge. 'river'/'valley'/'water' → valley. " +
      "'woods'/'forest'/'shade' → woodland. Ambiguous or 'a bit of everything' → mixed.",
  ),
  targetKm: z
    .number()
    .min(3)
    .max(40)
    .default(12)
    .describe(
      "Loop length in km. Derive from duration via pace: '3 hours' steady ≈ 12, " +
        "leisurely ≈ 10, brisk ≈ 14. 'all day' → 20, 'short'/'quick' → 8, " +
        "'half day' → 12. If they give km/miles directly, use that (1 mi = 1.61 km). " +
        "Log the assumption in ambiguities when you infer from time.",
    ),
  difficulty: WalkDifficultySchema.default("moderate").describe(
    "'flat'/'gentle'/'nothing steep'/'easy' → easy. 'challenging'/'proper hike'/" +
      "'hilly' → strenuous. Otherwise moderate.",
  ),
  pace: WalkPaceSchema.default("steady").describe(
    "'leisurely'/'relaxed'/'stroll' → leisurely. 'brisk'/'fast'/'workout' → brisk. " +
      "Otherwise steady.",
  ),
  lunchStop: WalkLunchStopSchema.default("preferred").describe(
    "'lunch pub'/'stop for food'/'picnic spot' → required. 'no stops'/'just walking' → " +
      "none. Otherwise preferred.",
  ),
  startPlace: z
    .string()
    .optional()
    .describe(
      "The place name or UK postcode the walker wants to start from, copied " +
        "VERBATIM from their text (e.g. 'Painswick', 'GL54 1AB'). Do NOT invent " +
        "coordinates — the server geocodes this. Omit if they named no place.",
    ),
  emphasis: z
    .string()
    .default("")
    .describe(
      "A short free-text summary of what the walker most cares about, in their " +
        "own words where possible ('amazing views and a good pub', 'flat and quiet'). " +
        "Used to re-weight scoring and steer the narrative. Empty if no clear priority.",
    ),
  ambiguities: z
    .array(z.string())
    .default([])
    .describe(
      "Anything you inferred or guessed, specific enough to confirm back to the " +
        "walker. e.g. 'distance: assumed ~12 km from \"3 hours\"'. Empty if all clear.",
    ),
});

export type WalkIntent = z.infer<typeof WalkIntentSchema>;
