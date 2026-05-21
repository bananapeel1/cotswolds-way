import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractBriefFlow } from "@/lib/ai/flows/extract-brief";
import {
  applyBriefToStops,
  autoStops,
  countListingsByVillage,
  daysFromFitness,
  type PlanState,
} from "@/lib/plan-engine";
import { TripBriefSchema, type TripBrief } from "@/lib/ai/schemas/trip-brief";
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MessagesSchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  )
  .min(1)
  .max(20);

const RequestSchema = z
  .object({
    /** Chat history — passed to the LLM extractor when briefOverride absent. */
    messages: MessagesSchema.optional(),
    /** Skip the LLM and use this brief directly — used by the editable-chips
     * flow on /plan/ai so a chip change re-runs the planner instantly,
     * deterministically, and at zero LLM cost. */
    briefOverride: TripBriefSchema.optional(),
  })
  .refine(
    (b) => b.messages !== undefined || b.briefOverride !== undefined,
    { message: "either messages or briefOverride must be provided" },
  );

const properties = propertiesData as Property[];
const listingsPerVillage = countListingsByVillage(properties);

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `invalid request: ${message}` }, { status: 400 });
  }

  try {
    let brief: TripBrief;
    let validationNotes: string[] = [];
    if (body.briefOverride) {
      brief = body.briefOverride;
    } else {
      const extracted = await extractBriefFlow({ messages: body.messages! });
      brief = extracted.brief;
      validationNotes = extracted.validationNotes;
    }

    // User said N days, we produce N days. No silent stretching — agency
    // beats paternalism. The UI can surface a non-blocking suggestion if
    // the plan looks tough, but it never overrides the explicit ask.
    const days = brief.days ?? daysFromFitness(brief.fitness);
    const direction = brief.direction ?? "north_to_south";
    const stops = autoStops(days, direction, listingsPerVillage);
    const { stops: enrichedStops, rationale } = applyBriefToStops(stops, brief, properties);

    const planState: PlanState = {
      direction,
      days,
      month: brief.startDate ? new Date(brief.startDate).getUTCMonth() : 4,
      startDate: brief.startDate,
      dogFriendly: brief.dogFriendly,
      stops: enrichedStops,
    };

    return NextResponse.json({ brief, planState, rationale, validationNotes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("/api/ai/plan failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
