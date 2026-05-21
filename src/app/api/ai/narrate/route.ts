import { NextRequest } from "next/server";
import { z } from "zod";
import { streamNarration } from "@/lib/ai/flows/narrate";
import {
  TripBriefSchema,
  PlanRationaleSchema,
} from "@/lib/ai/schemas/trip-brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const RequestSchema = z.object({
  planState: PlanStateSchema,
  brief: TripBriefSchema,
  rationale: PlanRationaleSchema,
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: `invalid request: ${message}` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { stream: chunks, response } = streamNarration(body);
        for await (const chunk of chunks) {
          const text = typeof chunk === "string" ? chunk : chunk?.text ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        await response;
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("/api/ai/narrate failed:", message);
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
