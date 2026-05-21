import { z } from "zod";
import { ai } from "../genkit";
import {
  ReplanMutationSchema,
  type ReplanMutation,
} from "../schemas/trip-brief";
import {
  canonicaliseVillage,
  VILLAGE_CATALOGUE_MARKDOWN,
} from "../village-catalogue";
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/queries";

const properties = propertiesData as Property[];
const PROPERTY_SLUGS = new Set(properties.map((p) => p.slug));

const StopSchema = z.object({
  day: z.number(),
  village: z.string(),
  miles: z.number(),
  cumulative: z.number(),
  difficulty: z.enum(["easy", "moderate", "strenuous"]),
  walkScore: z.number(),
  transfer: z.boolean().optional(),
  restDay: z.boolean().optional(),
  note: z.string().optional(),
  accommodation: z
    .object({
      slug: z.string(),
      name: z.string(),
      village: z.string(),
      propertyType: z.string(),
      image: z.string().optional(),
    })
    .optional(),
});

const PlanStateSchema = z.object({
  direction: z.enum(["north_to_south", "south_to_north"]),
  days: z.number(),
  month: z.number(),
  startDate: z.string().optional(),
  dogFriendly: z.boolean(),
  stops: z.array(StopSchema),
});

export const ReplanInputSchema = z.object({
  planState: PlanStateSchema,
  message: z.string().min(1),
  lockedDays: z.array(z.number()).default([]),
});

export const ReplanOutputSchema = z.object({
  mutation: ReplanMutationSchema,
  /** Human-readable preview the UI shows alongside Apply/Discard. */
  summary: z.string(),
  validationNotes: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are a Cotswold Way trip-planning assistant. The user has an existing day-by-day itinerary and wants to adjust it. Translate their natural-language request into exactly one of the typed mutations below.

${VILLAGE_CATALOGUE_MARKDOWN}

## Mutation types

- **shorten-day** \`{ day, newOvernight }\` — split a long day by adding an earlier overnight. \`newOvernight\` must be a canonical village.
- **lengthen-day** \`{ day, removeOvernight }\` — combine two days by removing an overnight. \`removeOvernight\` must be a village currently in the plan.
- **insert-rest-day** \`{ afterDay, village }\` — add a zero-mile rest day. Village should match an adjacent stop.
- **swap-accommodation** \`{ day, newPropertySlug }\` — change just the stay for a given day. \`newPropertySlug\` must be a real property slug.
- **change-start-date** \`{ startDate }\` — ISO yyyy-mm-dd.
- **change-direction** \`{}\` — flip N↔S.
- **clarify** \`{ question }\` — when the request is ambiguous, ask one short question.
- **decline** \`{ reason }\` — when the requested change would touch a locked day, or is impossible. Explain in one sentence.

## Rules

1. **Locked days are sacred.** If the request would change a locked day (the user has already chosen a stay there), return \`decline\` with a clear reason — never silently overwrite.
2. **One mutation per turn.** If the request implies multiple, pick the most important and ask via \`clarify\` for the rest.
3. **Canonical names only.** Use the village catalogue above. If unsure, return \`clarify\`.
4. **Don't invent.** If you don't know a property slug for swap-accommodation, return \`clarify\` and ask the user to name it.

Return only the structured output. Also write a one-sentence \`summary\` the UI can show next to Apply/Discard ("Insert a rest day after Painswick on day 4.").`;

function describeStop(stop: z.infer<typeof StopSchema>, locked: boolean): string {
  const accom = stop.accommodation ? `stay: ${stop.accommodation.name}` : "no stay";
  const lockTag = locked ? " [LOCKED]" : "";
  return `Day ${stop.day}: ${stop.village}, ${stop.miles}mi, ${stop.difficulty}, ${accom}${lockTag}`;
}

function validateMutation(mutation: ReplanMutation): { mutation: ReplanMutation; notes: string[] } {
  const notes: string[] = [];

  switch (mutation.type) {
    case "shorten-day": {
      const canon = canonicaliseVillage(mutation.newOvernight);
      if (!canon) {
        notes.push(`unknown village "${mutation.newOvernight}"`);
      } else {
        return { mutation: { ...mutation, newOvernight: canon }, notes };
      }
      break;
    }
    case "lengthen-day": {
      const canon = canonicaliseVillage(mutation.removeOvernight);
      if (!canon) notes.push(`unknown village "${mutation.removeOvernight}"`);
      else return { mutation: { ...mutation, removeOvernight: canon }, notes };
      break;
    }
    case "insert-rest-day": {
      const canon = canonicaliseVillage(mutation.village);
      if (!canon) notes.push(`unknown village "${mutation.village}"`);
      else return { mutation: { ...mutation, village: canon }, notes };
      break;
    }
    case "swap-accommodation": {
      if (!PROPERTY_SLUGS.has(mutation.newPropertySlug)) {
        notes.push(`unknown property slug "${mutation.newPropertySlug}"`);
      }
      break;
    }
  }

  return { mutation, notes };
}

export const replanFlow = ai.defineFlow(
  {
    name: "replan",
    inputSchema: ReplanInputSchema,
    outputSchema: ReplanOutputSchema,
  },
  async ({ planState, message, lockedDays }) => {
    const lockedSet = new Set(lockedDays);
    const planSummary = planState.stops.map((s) => describeStop(s, lockedSet.has(s.day))).join("\n");

    const prompt = `Current itinerary (${planState.direction}, ${planState.days} days):

${planSummary}

Locked days (can't be touched): ${lockedDays.length > 0 ? lockedDays.join(", ") : "none"}

User request: "${message}"

Decide the single mutation. Return the structured output.`;

    const baseRequest = {
      system: SYSTEM_PROMPT,
      prompt,
      output: { schema: ReplanOutputSchema },
      config: { temperature: 0.2 },
    };

    const result = await ai.generate(baseRequest);
    const output = result.output;
    if (!output) {
      throw new Error("replan: model returned no structured output");
    }

    const validated = validateMutation(output.mutation);

    // If validation failed, downgrade to a clarify so the user sees a clean ask.
    if (validated.notes.length > 0) {
      const fallback: ReplanMutation = {
        type: "clarify",
        question: `I couldn't match that — ${validated.notes.join("; ")}. Could you rephrase using one of the villages on the trail?`,
      };
      return {
        mutation: fallback,
        summary: "Need clarification on village or property name.",
        validationNotes: validated.notes,
      };
    }

    return {
      mutation: validated.mutation,
      summary: output.summary,
      validationNotes: [],
    };
  },
);
