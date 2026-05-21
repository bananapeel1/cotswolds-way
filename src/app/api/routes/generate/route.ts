import { NextRequest } from "next/server";
import { z } from "zod";
import { findOrGenerate, setNarrative, type Theme } from "@/lib/route-engine";
import { narrateRoute } from "@/lib/ai/flows/narrate-route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  km: z.number().min(3).max(40),
  theme: z.enum(["ridge", "valley", "woodland"]),
  startLabel: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `invalid request: ${message}` }, { status: 400 });
  }

  const loop = await findOrGenerate({
    startLat: body.lat,
    startLng: body.lng,
    targetKm: body.km,
    theme: body.theme as Theme,
  });

  if (!loop) {
    return Response.json(
      { error: "no_loop_found", message: "Could not generate a loop matching those constraints in this area." },
      { status: 404 },
    );
  }

  // Generate narrative on cache miss. We do this AFTER returning route data
  // is not an option here (it's a single request), so narration adds 2-4s
  // on the first request for a given (postcode, distance, theme) combo.
  let narrative = loop.narrative;
  if (!narrative) {
    try {
      narrative = await narrateRoute({
        loop,
        theme: body.theme as Theme,
        startLabel: body.startLabel,
      });
      // Fire-and-forget persistence — don't block response on the DB write.
      setNarrative(loop.cacheKey, narrative).catch((err) => {
        console.warn("[/api/routes/generate] failed to persist narrative:", err);
      });
    } catch (err) {
      console.warn("[/api/routes/generate] narration failed:", err);
      narrative = null;
    }
  }

  return Response.json({
    cacheKey: loop.cacheKey,
    cached: loop.cached,
    geometry: loop.geometry,
    actualKm: loop.actualKm,
    ascentM: loop.ascentM,
    durationMin: loop.durationMin,
    midpointPoi: loop.midpointPoi,
    score: loop.score,
    narrative,
  });
}
