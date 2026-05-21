import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Either an outbound_click (the original shape — kept for back-compat with
 * existing trackOutboundClick callers) or a generic named event. Validated
 * separately so each can have its own constraints. */
const OutboundClickSchema = z.object({
  source: z.enum(["ai_plan", "planner", "search", "browse", "property", "trip_prep"]),
  target: z.string().url().max(2048),
  label: z.string().max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const NamedEventSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/, "name must be snake_case"),
  props: z.record(z.string(), z.unknown()).optional(),
});

const PayloadSchema = z.union([OutboundClickSchema, NamedEventSchema]);

export async function POST(req: NextRequest) {
  // sendBeacon serialises to text/plain; accept either text or JSON.
  let raw: unknown;
  try {
    const text = await req.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid event", issues: parsed.error.issues }, { status: 400 });
  }

  const referer = req.headers.get("referer") ?? "";

  // Stdout is captured by App Hosting → Cloud Logging. Single grep-able line
  // per event, keys ordered for awk/jq pipelines. Pipe to BigQuery via a
  // Cloud Logging sink when traffic justifies a dashboard.
  if ("name" in parsed.data) {
    const e = parsed.data;
    console.log(
      `[analytics] event=${e.name}` +
        (e.props ? ` props=${safeJSON(e.props)}` : "") +
        (referer ? ` referer=${referer}` : ""),
    );
  } else {
    const e = parsed.data;
    console.log(
      `[analytics] event=outbound_click source=${e.source} target=${e.target}` +
        (e.label ? ` label="${e.label.replace(/"/g, "'")}"` : "") +
        (e.meta ? ` meta=${safeJSON(e.meta)}` : "") +
        (referer ? ` referer=${referer}` : ""),
    );
  }

  // 204 keeps sendBeacon happy without a body roundtrip.
  return new NextResponse(null, { status: 204 });
}

function safeJSON(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return "<unserialisable>";
  }
}
