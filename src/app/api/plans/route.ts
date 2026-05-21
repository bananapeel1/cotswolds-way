import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

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
  accommodation: z.object({
    slug: z.string(),
    name: z.string(),
    village: z.string(),
    propertyType: z.string(),
    image: z.string().optional(),
    websiteUrl: z.string().nullable().optional(),
    relaxedConstraints: z.array(z.string()).optional(),
  }).optional(),
});

const PlanStateSchema = z.object({
  direction: z.enum(["north_to_south", "south_to_north"]),
  days: z.number(),
  month: z.number(),
  startDate: z.string().optional(),
  dogFriendly: z.boolean(),
  stops: z.array(StopSchema).min(1),
  paceOverride: z.enum(["casual", "steady", "strong", "athletic"]).optional(),
  requestedDays: z.number().optional(),
});

const RequestSchema = z.object({
  planState: PlanStateSchema,
  brief: z.record(z.string(), z.unknown()).optional(),
  source: z.enum(["ai_plan", "stepper"]).default("ai_plan"),
});

/** 12-char base62 slug. ~62^12 ≈ 3e21 unique values — collision risk is
 * negligible at any realistic scale. Generated server-side using crypto. */
function generateSlug(): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % 62];
  return out;
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `invalid request: ${message}` }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const id = generateSlug();
    const { error } = await supabase.from("shared_plans").insert({
      id,
      plan: body.planState,
      brief: body.brief ?? null,
      source: body.source,
    });
    if (error) {
      console.error("/api/plans insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const url = `${origin}/plans/${id}`;
    return NextResponse.json({ id, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("/api/plans failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
