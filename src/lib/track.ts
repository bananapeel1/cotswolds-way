/** Origin label for an outbound click — lets us A/B layouts, prompts, and
 * tiers by where the user clicked from. */
export type OutboundSource =
  | "ai_plan"
  | "search"
  | "browse"
  | "property"
  | "trip_prep";

export interface OutboundClick {
  source: OutboundSource;
  target: string;
  label?: string;
  meta?: Record<string, unknown>;
}

/** Fire-and-forget event for an outbound link click. Uses sendBeacon when
 * available so the request survives navigation; falls back to keepalive
 * fetch. Silently no-ops on failure — analytics must never break UX. */
export function trackOutboundClick(ev: OutboundClick): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(ev);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
      return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    // ignore — analytics must never break UX
  }
}
