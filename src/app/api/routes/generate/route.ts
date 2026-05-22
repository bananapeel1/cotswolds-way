import { NextRequest } from "next/server";
import { z } from "zod";
import {
  findOrGenerate,
  pingGraphHopper,
  setNarrative,
  ENGINE_VERSION,
  type LoopResult,
  type Theme,
} from "@/lib/route-engine";
import { isInsideCotswolds } from "@/lib/aonb";
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

/**
 * Single-line structured log for Cloud Logging / Vercel ingestion. Matches
 * the `[analytics] key=value` convention in src/app/api/analytics/route.ts
 * so the same grep/jq pipelines work across both feeds. One line per request,
 * keys ordered, no JSON — quotes only used for values with spaces.
 */
function logMetric(
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    const needsQuotes = typeof v === "string" && v.includes(" ");
    parts.push(`${k}=${needsQuotes ? `"${v.replace(/"/g, "'")}"` : v}`);
  }
  console.log(`[routes-engine] ${parts.join(" ")}`);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // ─── Request parsing ──────────────────────────────────────────────────────
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logMetric({
      outcome: "invalid",
      total_ms: Date.now() - t0,
      engine_version: ENGINE_VERSION,
      detail: message.slice(0, 120),
    });
    return Response.json(
      { error: `invalid request: ${message}` },
      { status: 400 },
    );
  }

  // ─── AONB bbox guard ──────────────────────────────────────────────────────
  // Reject obviously out-of-scope starts before doing any expensive work.
  // The bbox is generous (includes a margin); precise polygon checking is a
  // Milestone D improvement.
  if (!isInsideCotswolds(body.lat, body.lng)) {
    logMetric({
      outcome: "outside_aonb",
      lat: body.lat.toFixed(4),
      lng: body.lng.toFixed(4),
      total_ms: Date.now() - t0,
      engine_version: ENGINE_VERSION,
    });
    return Response.json(
      {
        error: "outside_aonb",
        message:
          "Start point is outside the Cotswolds AONB. Try a village inside the area — Stow-on-the-Wold, Painswick, Chipping Campden, or Bourton-on-the-Water are good starting points.",
      },
      { status: 400 },
    );
  }

  // ─── GraphHopper liveness ─────────────────────────────────────────────────
  // 500ms timeout: Cloud Run intra-region calls land in <50ms, so half a second
  // is comfortable headroom. On miss we return a structured 503 instead of
  // letting findOrGenerate fail opaquely as a 404 "no loop found".
  //
  // Cost on the happy path: ~30ms even on cache hits. Worth it — the
  // alternative is users seeing "no loop in this area" during a GH outage,
  // which masks the real failure mode.
  const ghAlive = await pingGraphHopper(500);
  if (!ghAlive) {
    logMetric({
      outcome: "degraded",
      reason: "graphhopper_unreachable",
      theme: body.theme,
      km: body.km,
      total_ms: Date.now() - t0,
      engine_version: ENGINE_VERSION,
    });
    return Response.json(
      {
        error: "service_degraded",
        message:
          "Route generation is temporarily unavailable while the routing service restarts. Try again in 30 seconds.",
      },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  // ─── Generate or fetch from cache ─────────────────────────────────────────
  let loop: LoopResult | null;
  try {
    loop = await findOrGenerate({
      startLat: body.lat,
      startLng: body.lng,
      targetKm: body.km,
      theme: body.theme as Theme,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[routes-engine] findOrGenerate threw:", err);
    logMetric({
      outcome: "error",
      theme: body.theme,
      km: body.km,
      total_ms: Date.now() - t0,
      engine_version: ENGINE_VERSION,
      detail: detail.slice(0, 200),
    });
    return Response.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred while generating the route.",
      },
      { status: 500 },
    );
  }

  if (!loop) {
    logMetric({
      outcome: "not_found",
      theme: body.theme,
      km: body.km,
      total_ms: Date.now() - t0,
      engine_version: ENGINE_VERSION,
    });
    return Response.json(
      {
        error: "no_loop_found",
        message:
          "No loop matching those constraints in this area. Try a different theme, a different distance, or a nearby start point.",
      },
      { status: 404 },
    );
  }

  // ─── Narrate on cache miss ────────────────────────────────────────────────
  // Failures here are non-fatal: we still return the route so the user gets
  // a usable result. The narrative just renders as null in the UI and the
  // background re-queue (Milestone D) can backfill later.
  let narrative = loop.narrative;
  let narrateMs: number | undefined;
  if (!narrative) {
    const tNarrate = Date.now();
    try {
      narrative = await narrateRoute({
        loop,
        theme: body.theme as Theme,
        startLabel: body.startLabel,
      });
      // Awaited so the DB write completes before Next.js tears down the
      // serverless context. Pre-fix, the fire-and-forget version was racing
      // with saveRoute and losing.
      await setNarrative(loop.cacheKey, narrative).catch((err) => {
        console.warn("[routes-engine] failed to persist narrative:", err);
      });
    } catch (err) {
      console.warn("[routes-engine] narration failed:", err);
      narrative = null;
    }
    narrateMs = Date.now() - tNarrate;
  }

  logMetric({
    outcome: loop.cached ? "cached" : "generated",
    theme: body.theme,
    km: body.km,
    actual_km: loop.actualKm.toFixed(1),
    score: loop.score.toFixed(2),
    cache_key: loop.cacheKey,
    total_ms: Date.now() - t0,
    narrate_ms: narrateMs,
    narrative_chars: narrative?.length ?? 0,
    engine_version: ENGINE_VERSION,
  });

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
