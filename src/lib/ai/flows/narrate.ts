import { ai } from "../genkit";
import type { PlanRationale, TripBrief } from "../schemas/trip-brief";
import type { PlanState, DayStop } from "@/lib/plan-engine";

const NARRATE_SYSTEM = `You are a Cotswold Way trip-planning assistant explaining a freshly-built itinerary back to the user.

Style:
- Direct and warm, not florid. Short paragraphs (2-4 sentences).
- No bullet points unless explicitly listing 3+ items. No headers.
- British English. Distances in miles. Prefer concrete names ("the Lygon Arms in Broadway") over generic ones ("a charming inn").
- Do not invent properties, villages, or facts. Only describe what's in the plan.

Output structure (3-4 paragraphs):
1. **Overall shape**: 1-2 sentences naming days, direction, total miles, and the feel (relaxed / steady / demanding).
2. **Day-by-day highlights**: pick out 2-3 notable days — the hardest, the most scenic, an anchor village. Do NOT list every day.
3. **Honest trade-offs**: surface any \`unmet\` constraints and \`constraint-relaxed\` events ("Painswick has no shoestring option, so I picked a comfort B&B there"). Lead with these if there are any. Be specific.
4. **One forward-looking sentence**: invite the user to tweak the plan or open it in the planner. Don't ask multiple questions.

When unmet[] is non-empty, lead the response with the trade-off honestly. Do not bury it.`;

function describeDay(stop: DayStop): string {
  const accom = stop.accommodation
    ? ` overnight at ${stop.accommodation.name} (${stop.accommodation.propertyType})`
    : " no overnight chosen";
  return `Day ${stop.day} — ${stop.village}: ${stop.miles}mi, ${stop.difficulty}, walkScore ${stop.walkScore}/10${accom}`;
}

export function buildNarratePrompt(args: {
  planState: PlanState;
  brief: TripBrief;
  rationale: PlanRationale;
}): { system: string; prompt: string } {
  const { planState, brief, rationale } = args;

  const daysSummary = planState.stops.map(describeDay).join("\n");

  const eventLines = rationale.events.length === 0
    ? "(none — clean run)"
    : rationale.events
        .map(
          (e) =>
            `[${e.kind}] day=${e.day ?? "-"} village=${e.village ?? "-"} reason=${e.reason}${
              e.detail ? ` detail=${JSON.stringify(e.detail)}` : ""
            }`,
        )
        .join("\n");

  const unmetLines = rationale.unmet.length === 0 ? "(none)" : rationale.unmet.join(", ");

  const briefBits: string[] = [];
  if (brief.budgetTier) briefBits.push(`tier=${brief.budgetTier}`);
  if (brief.dogFriendly) briefBits.push("dog-friendly");
  if (brief.diningPreference !== "any") briefBits.push(`dining=${brief.diningPreference}`);
  if (brief.propertyVibes.length > 0) briefBits.push(`vibes=${brief.propertyVibes.join("/")}`);
  if (brief.mustVisit.length > 0) briefBits.push(`mustVisit=${brief.mustVisit.join("/")}`);

  const prompt = `Plan to narrate:

Direction: ${planState.direction}, ${planState.days} days, ${planState.stops.length} stops.
Brief: ${briefBits.join(", ") || "no strong constraints"}
${brief.ambiguities.length > 0 ? `Ambiguities the user might want to confirm: ${brief.ambiguities.join("; ")}` : ""}

Days:
${daysSummary}

Rationale events (from the planner — translate these to plain English):
${eventLines}

Unmet constraints: ${unmetLines}

Now write the 3-4 paragraph narration. Lead with unmet constraints if any.`;

  return { system: NARRATE_SYSTEM, prompt };
}

/** Server-side helper that streams narration as text chunks. Returns the
 * AsyncIterable + final-response promise from Genkit's generateStream. */
export function streamNarration(args: Parameters<typeof buildNarratePrompt>[0]) {
  const { system, prompt } = buildNarratePrompt(args);
  return ai.generateStream({
    system,
    prompt,
    config: { temperature: 0.6 },
  });
}
