import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EventSchema = z.object({
  source: z.enum(["ai_plan", "search", "browse", "property", "trip_prep"]),
  target: z.string().url().max(2048),
  label: z.string().max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  // sendBeacon serialises to text/plain; accept either text or JSON.
  let raw: unknown;
  try {
    const text = await req.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = EventSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid event", issues: parsed.error.issues }, { status: 400 });
  }

  const ev = parsed.data;
  const referer = req.headers.get("referer") ?? "";

  // Stdout is captured by App Hosting logs; this gives us a single grep-able
  // line per event until a persistence backend is wired up.
  console.log(
    `[analytics] outbound_click source=${ev.source} target=${ev.target}` +
      (ev.label ? ` label="${ev.label.replace(/"/g, "'")}"` : "") +
      (referer ? ` referer=${referer}` : ""),
  );

  // 204 keeps sendBeacon happy without a body roundtrip.
  return new NextResponse(null, { status: 204 });
}
