import { NextRequest, NextResponse } from "next/server";
import { replanFlow, ReplanInputSchema } from "@/lib/ai/flows/replan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let parsed: ReturnType<typeof ReplanInputSchema.parse>;
  try {
    parsed = ReplanInputSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `invalid request: ${message}` }, { status: 400 });
  }

  try {
    const result = await replanFlow(parsed);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("/api/ai/replan failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
