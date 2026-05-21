/** Origin label for an outbound click — lets us A/B layouts, prompts, and
 * tiers by where the user clicked from. */
export type OutboundSource =
  | "ai_plan"
  | "planner"     // /plan Step 2 day card — manual or post-AI-handoff
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

/** In-product event names. snake_case, present-tense. Keep this list short
 * and meaningful — every new event adds maintenance cost and noise. */
export type EventName =
  | "plan_created"        // AI or stepper produced a new plan
  | "plan_modified"       // replan mutation applied, pace changed, etc.
  | "plan_shared"         // user generated a /plans/[id] share link
  | "plan_opened_shared"  // visitor landed on a /plans/[id] page
  | "pace_changed"        // user toggled global pace archetype/pack
  | "tier_applied";       // budget tier swap pushed to plan

/** Server endpoint that accepts both shapes. */
const ANALYTICS_URL = "/api/analytics";

function send(payload: string): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(ANALYTICS_URL, blob);
      return;
    }
    void fetch(ANALYTICS_URL, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    // ignore — analytics must never break UX
  }
}

/** Fire-and-forget event for an outbound link click. */
export function trackOutboundClick(ev: OutboundClick): void {
  send(JSON.stringify(ev));
}

/** Fire-and-forget event for an in-product action. Use sparingly — only
 * events that materially help understand the funnel (created, modified,
 * shared, opened). One canonical funnel beats fifty noisy events. */
export function trackEvent(name: EventName, props?: Record<string, unknown>): void {
  send(JSON.stringify({ name, props }));
}
