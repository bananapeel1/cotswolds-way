import { z } from "zod";
import { ai } from "../genkit";
import { TripBriefSchema, type TripBrief } from "../schemas/trip-brief";
import {
  CANONICAL_VILLAGES,
  VILLAGE_CATALOGUE_MARKDOWN,
  canonicaliseVillage,
} from "../village-catalogue";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const ExtractBriefInputSchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

export const ExtractBriefOutputSchema = z.object({
  brief: TripBriefSchema,
  /** Validation errors from the canonicalisation pass. Empty when clean. */
  validationNotes: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are a trip-planning assistant for the Cotswold Way, a 102-mile UK National Trail between Chipping Campden (north) and Bath (south).

Your one job in this turn is to read the conversation and extract a structured TripBrief. You do NOT design itineraries, choose accommodations, or invent villages — a downstream planner does all of that. You ONLY fill in the schema.

${VILLAGE_CATALOGUE_MARKDOWN}

## How to extract

- **days**: prefer an explicit number ("5 days"). For vague phrases ("a week" → 7) infer reasonably. If the user gave no day cue at all, omit days entirely and let the system derive from fitness.
- **direction**: default north_to_south. Set south_to_north only if the user mentions starting in Bath or ending in Chipping Campden.
- **fitness**: map cues. "We walk most weekends" → moderate. "We're hikers" → fit. "It's our first big walk" → relaxed.
- **budgetTier**: "cheap", "tight" → shoestring. Mid-range, "~£100/night" → comfort. "Treat", "splurge", "anniversary" → treat-yourself. Omit if no signal.
- **budgetTotalGBP**: only when the user states a whole-trip total. Don't compute from tier.
- **propertyVibes**: extract from explicit cues. "No chains" or "character" → character-led. "Pub every night" → pub-with-rooms. Empty array if no cues — do not invent.
- **mustVisit / avoidVillages**: ONLY use canonical village names from the catalogue above. If the user names something not in the catalogue, omit it and note it in ambiguities.
- **ambiguities**: list anything you guessed or couldn't determine confidently. Be specific — "fitness: assumed moderate from 'we walk most weekends'", not "unsure".

Return only the schema. Do not narrate, do not explain.`;

const RETRY_GUIDANCE = (notes: string[]) =>
  `Your previous output contained invalid village names: ${notes.join("; ")}. The canonical list is in the catalogue above. Re-emit the brief with corrected names, or move them to ambiguities if they don't match any canonical village.`;

function transcript(messages: { role: "user" | "assistant"; content: string }[]): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
}

/** Coerce a raw model output into a fully-populated TripBrief.
 *
 * Why this exists: Genkit's structured-output mode doesn't reliably apply
 * Zod `.default([])` clauses when the LLM omits a field — the generated JSON
 * schema sent to Gemini doesn't carry the default through, and Genkit's
 * parsing step doesn't re-run Zod with default-filling. Result: `mustVisit`
 * et al. come back as `undefined` and the next `for...of` over them throws
 * "X is not iterable". Re-running TripBriefSchema.parse() fills the defaults
 * cleanly. */
function normalizeBrief(raw: unknown): TripBrief {
  return TripBriefSchema.parse(raw);
}

function validateBrief(brief: TripBrief): { brief: TripBrief; notes: string[] } {
  const notes: string[] = [];
  const mustVisit: string[] = [];
  for (const v of brief.mustVisit ?? []) {
    const canon = canonicaliseVillage(v);
    if (canon) mustVisit.push(canon);
    else notes.push(`mustVisit "${v}" not a canonical village`);
  }
  const avoidVillages: string[] = [];
  for (const v of brief.avoidVillages ?? []) {
    const canon = canonicaliseVillage(v);
    if (canon) avoidVillages.push(canon);
    else notes.push(`avoidVillages "${v}" not a canonical village`);
  }
  return { brief: { ...brief, mustVisit, avoidVillages }, notes };
}

export const extractBriefFlow = ai.defineFlow(
  {
    name: "extractBrief",
    inputSchema: ExtractBriefInputSchema,
    outputSchema: ExtractBriefOutputSchema,
  },
  async ({ messages }) => {
    const userTurns = messages.filter((m) => m.role === "user");
    if (userTurns.length === 0) {
      throw new Error("extractBrief requires at least one user message");
    }

    const baseRequest = {
      system: SYSTEM_PROMPT,
      prompt: `Conversation so far:\n\n${transcript(messages)}\n\nExtract the TripBrief now.`,
      output: { schema: TripBriefSchema },
      config: { temperature: 0.2 },
    };

    const result = await ai.generate(baseRequest);
    if (!result.output) {
      throw new Error("extractBrief: model returned no structured output");
    }
    const brief = normalizeBrief(result.output);

    let { brief: cleaned, notes } = validateBrief(brief);

    // One-shot retry when the model invented village names.
    if (notes.length > 0) {
      const retry = await ai.generate({
        ...baseRequest,
        prompt: `${baseRequest.prompt}\n\n${RETRY_GUIDANCE(notes)}`,
      });
      if (retry.output) {
        const retryBrief = normalizeBrief(retry.output);
        const revalidated = validateBrief(retryBrief);
        cleaned = revalidated.brief;
        notes = revalidated.notes;
      }
    }

    return { brief: cleaned, validationNotes: notes };
  },
);

export { CANONICAL_VILLAGES };
