import { z } from "zod";

export const DirectionSchema = z.enum(["north_to_south", "south_to_north"]);

export const FitnessSchema = z.enum(["relaxed", "moderate", "fit", "very-fit"]);

export const BudgetTierSchema = z.enum(["shoestring", "comfort", "treat-yourself"]);

export const PropertyVibeSchema = z.enum([
  "character-led",
  "pub-with-rooms",
  "boutique",
  "rural-quiet",
  "town-centre",
]);

export const DiningPreferenceSchema = z.enum(["pub-nightly", "fine-dining-occasional", "any"]);

export const TripBriefSchema = z.object({
  days: z
    .number()
    .int()
    .min(3)
    .max(14)
    .optional()
    .describe("Total walk days, 3-14. Omit when the user is vague ('a week') and derive from fitness."),
  direction: DirectionSchema
    .optional()
    .describe("Default north_to_south unless the user mentions starting in Bath."),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("ISO yyyy-mm-dd. Omit if not explicitly mentioned."),

  fitness: FitnessSchema
    .default("moderate")
    .describe("'We walk most weekends' → moderate. 'We're hikers' → fit. 'A walking holiday' with no fitness hint → relaxed."),
  budgetTier: BudgetTierSchema
    .optional()
    .describe("Map 'cheap'/'tight budget' → shoestring; '~£100/night'/'mid' → comfort; 'splash out'/'special' → treat-yourself."),
  budgetTotalGBP: z
    .number()
    .int()
    .optional()
    .describe("Only set when the user gives a specific total amount, not when they describe a tier."),
  propertyVibes: z
    .array(PropertyVibeSchema)
    .default([])
    .describe("Extract from cues. 'No chains' / 'character' → character-led. 'Pub every night' → pub-with-rooms."),
  diningPreference: DiningPreferenceSchema.default("any"),
  dogFriendly: z.boolean().default(false),
  accessible: z.boolean().default(false),

  mustVisit: z
    .array(z.string())
    .default([])
    .describe("Village names the user explicitly demanded as overnights. Use canonical names from the village catalogue."),
  avoidVillages: z
    .array(z.string())
    .default([])
    .describe("Village names to skip. Canonical names only."),

  ambiguities: z
    .array(z.string())
    .default([])
    .describe("Things you guessed at. e.g. 'fitness: assumed moderate from \"we walk most weekends\"'. Shown back to user for confirmation."),
});

export type TripBrief = z.infer<typeof TripBriefSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export type Fitness = z.infer<typeof FitnessSchema>;
export type BudgetTier = z.infer<typeof BudgetTierSchema>;
export type PropertyVibe = z.infer<typeof PropertyVibeSchema>;
export type DiningPreference = z.infer<typeof DiningPreferenceSchema>;

export const RationaleEventSchema = z.object({
  kind: z.enum([
    "village-chosen",
    "village-rejected",
    "property-chosen",
    "property-rejected",
    "constraint-relaxed",
    "deal-breaker-violation",
  ]),
  day: z.number().optional(),
  village: z.string().optional(),
  propertySlug: z.string().optional(),
  reason: z.string(),
  detail: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const PlanRationaleSchema = z.object({
  briefSummary: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  events: z.array(RationaleEventSchema),
  unmet: z.array(z.string()),
});

export type RationaleEvent = z.infer<typeof RationaleEventSchema>;
export type PlanRationale = z.infer<typeof PlanRationaleSchema>;

export const ReplanMutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("shorten-day"), day: z.number().int().min(1), newOvernight: z.string() }),
  z.object({ type: z.literal("lengthen-day"), day: z.number().int().min(1), removeOvernight: z.string() }),
  z.object({ type: z.literal("insert-rest-day"), afterDay: z.number().int().min(1), village: z.string() }),
  z.object({ type: z.literal("swap-accommodation"), day: z.number().int().min(1), newPropertySlug: z.string() }),
  z.object({ type: z.literal("change-start-date"), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ type: z.literal("change-direction") }),
  z.object({ type: z.literal("clarify"), question: z.string() }),
  z.object({ type: z.literal("decline"), reason: z.string() }),
]);

export type ReplanMutation = z.infer<typeof ReplanMutationSchema>;
