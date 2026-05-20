import { NextRequest, NextResponse } from "next/server";
import { healthFlow } from "@/lib/ai/flows/health";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") || "walker";
  try {
    const result = await healthFlow({ name });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("AI health flow error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
