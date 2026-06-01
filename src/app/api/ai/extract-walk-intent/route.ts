import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractWalkIntentFlow } from "@/lib/ai/flows/extract-walk-intent";
import { COTSWOLDS_BBOX_STRING, isInsideCotswolds } from "@/lib/aonb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  text: z.string().min(1).max(2000),
});

/** Start point resolved from the intent's free-text place. Matches the `Place`
 *  shape consumed by RouteStartPicker so /walks can pre-fill the picker. */
interface ResolvedStart {
  label: string;
  context: string;
  lat: number;
  lng: number;
  type: string;
}

interface MapboxFeature {
  text: string;
  place_type?: string[];
  center: [number, number]; // [lng, lat]
  context?: { id: string; text: string }[];
}

/** Server-side Mapbox geocode, mirroring RouteStartPicker.searchMapbox but for
 *  a single best hit. Restricted to the AONB bbox + GB. Returns null on no hit
 *  or a hit that falls outside the Cotswolds bbox. */
async function geocode(place: string): Promise<ResolvedStart | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json` +
    `?access_token=${token}` +
    `&bbox=${COTSWOLDS_BBOX_STRING}` +
    `&country=gb` +
    `&types=place,postcode,locality,neighborhood,address` +
    `&limit=1` +
    `&language=en`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;

  const data = (await res.json()) as { features?: MapboxFeature[] };
  const f = data.features?.[0];
  if (!f) return null;

  const [lng, lat] = f.center;
  if (!isInsideCotswolds(lat, lng)) return null;

  const region = f.context?.find(
    (c) => c.id.startsWith("district") || c.id.startsWith("region"),
  );
  const country = f.context?.find((c) => c.id.startsWith("country"));
  return {
    label: f.text,
    context: [region?.text, country?.text].filter(Boolean).join(", "),
    lat,
    lng,
    type: f.place_type?.[0] ?? "place",
  };
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
    const { intent } = await extractWalkIntentFlow({ text: body.text });

    // Geocode the named place (if any) server-side. Surface a confirmable note
    // when the walker named a place we couldn't resolve inside the AONB, so the
    // UI can prompt them to pick a start manually rather than silently dropping it.
    let start: ResolvedStart | null = null;
    const ambiguities = [...intent.ambiguities];
    if (intent.startPlace) {
      start = await geocode(intent.startPlace);
      if (!start) {
        ambiguities.push(
          `couldn't find "${intent.startPlace}" in the Cotswolds — pick a start point`,
        );
      }
    } else {
      ambiguities.push("no start place mentioned — choose where to begin");
    }

    return NextResponse.json({
      intent: { ...intent, ambiguities },
      start,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("/api/ai/extract-walk-intent failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
