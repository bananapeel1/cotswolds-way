/**
 * Temporary diagnostic endpoint — REMOVE after debugging the GH ping issue.
 * Returns env vars and a live GH health check result.
 * Not linked anywhere; just for prod debugging.
 */
import { pingGraphHopper } from "@/lib/route-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const ghUrl = process.env.GRAPHHOPPER_URL ?? "(not set)";
  const kService = process.env.K_SERVICE ?? "(not set)";

  let pingResult: boolean | string = "error";
  try {
    pingResult = await pingGraphHopper(3000);
  } catch (e) {
    pingResult = String(e);
  }

  return Response.json({
    GRAPHHOPPER_URL: ghUrl,
    K_SERVICE: kService,
    pingGraphHopper: pingResult,
    ts: new Date().toISOString(),
  });
}
