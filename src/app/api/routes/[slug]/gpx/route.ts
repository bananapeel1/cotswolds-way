import { NextRequest } from "next/server";
import { findCached } from "@/lib/route-engine";
import { slugToCacheKey } from "@/lib/share-slug";
import { buildGpx } from "@/lib/gpx";

export const dynamic = "force-dynamic";

/**
 * GET /api/routes/[slug]/gpx
 *
 * Streams a GPX 1.1 file for the cached route at this slug. 404s for any
 * slug that doesn't decode to a known cache key. Cache-Control: 1 hour —
 * GPX files for the same route are byte-identical (no per-request
 * customisation goes into the file).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cacheKey = slugToCacheKey(slug);
  const route = await findCached(cacheKey);

  if (!route) {
    return new Response("Route not found", { status: 404 });
  }

  const km = route.actualKm.toFixed(1);
  const name = `Cotswolds ${km} km loop via ${route.midpointPoi.name}`;
  // First paragraph of the narrative (when present) makes a sensible GPX
  // description — short enough to display in a GPS device's metadata view.
  const description = route.narrative
    ? route.narrative.split(/\n\n+/)[0]?.slice(0, 200)
    : undefined;

  const gpx = buildGpx({
    name,
    description,
    coords: route.geometry.coordinates as [number, number][],
  });

  // Sanitise the km for filename use (no decimal point in download names).
  const filenameKm = km.replace(".", "p");

  return new Response(gpx, {
    status: 200,
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="cotswolds-${filenameKm}km-loop.gpx"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
