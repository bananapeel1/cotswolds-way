import { z } from "zod";
import { ai, generate } from "../genkit";
import { WalkIntentSchema, type WalkIntent } from "../schemas/walk-intent";

// Free-text → structured walk parameters. Sibling of extract-brief.ts (which
// does the same for multi-day trip planning); this one targets a single
// day-walk on /walks. The model ONLY fills the schema — geocoding the named
// place and generating the route happen downstream.

export const ExtractWalkIntentInputSchema = z.object({
  text: z.string().min(1),
});

export const ExtractWalkIntentOutputSchema = z.object({
  intent: WalkIntentSchema,
});

const SYSTEM_PROMPT = `You help walkers describe a circular day-walk in the Cotswolds (an Area of Outstanding Natural Beauty in England). The walker types a free-text description; your one job is to extract a structured set of walk parameters. You do NOT design the route, pick a lunch stop, or geocode anything — downstream code does all of that. You ONLY fill in the schema.

## How to extract

- **theme**: 'views'/'ridge'/'hilltop'/'escarpment' → ridge. 'river'/'valley'/'water'/'stream' → valley. 'woods'/'forest'/'bluebells'/'shade' → woodland. Vague or "a bit of everything" → mixed.
- **targetKm**: derive from duration using pace. A steady walker covers ~4 km/h, so "3 hours" ≈ 12 km, leisurely ≈ 10, brisk ≈ 14. "all day" → 20, "short"/"quick"/"leg-stretch" → 8, "half day" → 12. If they give a distance directly (km or miles — 1 mile = 1.61 km), use it. Always note in ambiguities when you infer distance from time.
- **difficulty**: "flat"/"gentle"/"nothing steep"/"easy on the knees" → easy. "challenging"/"proper hike"/"hilly"/"strenuous" → strenuous. Otherwise moderate.
- **pace**: "leisurely"/"relaxed"/"amble"/"stroll" → leisurely. "brisk"/"fast"/"get the heart going" → brisk. Otherwise steady.
- **lunchStop**: "lunch"/"pub stop"/"stop for food"/"picnic spot"/"somewhere to eat" → required. "no stops"/"just want to walk"/"no need to stop" → none. Otherwise preferred.
- **startPlace**: copy the place name or UK postcode VERBATIM from their text ("Painswick", "near Stow", "GL54 1AB"). Strip filler like "near" / "from" / "starting at". Do NOT invent coordinates. Omit entirely if they named no place.
- **emphasis**: a short phrase capturing what they most care about, in their words ("amazing views and a good pub", "flat and quiet", "somewhere the dog can run"). Empty string if there's no clear priority.
- **ambiguities**: list anything you guessed. Be specific — 'distance: assumed ~12 km from "3 hours"', not "unsure". Empty if everything was explicit.

Return only the schema. Do not narrate, do not explain.`;

/** Re-parse raw model output through the schema to fill Zod defaults that
 *  Genkit's structured-output mode drops when the model omits a field. Same
 *  rationale as extract-brief.ts's normalizeBrief. */
function normalizeIntent(raw: unknown): WalkIntent {
  return WalkIntentSchema.parse(raw);
}

export const extractWalkIntentFlow = ai.defineFlow(
  {
    name: "extractWalkIntent",
    inputSchema: ExtractWalkIntentInputSchema,
    outputSchema: ExtractWalkIntentOutputSchema,
  },
  async ({ text }) => {
    const baseRequest = {
      system: SYSTEM_PROMPT,
      prompt: `Walker's description:\n\n"${text}"\n\nExtract the walk parameters now.`,
      output: { schema: WalkIntentSchema },
      config: { temperature: 0.2 },
    };

    let result = await generate(baseRequest);
    // One-shot retry if the model returned no structured output at all.
    if (!result.output) {
      result = await generate(baseRequest);
    }
    if (!result.output) {
      throw new Error("extractWalkIntent: model returned no structured output");
    }

    return { intent: normalizeIntent(result.output) };
  },
);
