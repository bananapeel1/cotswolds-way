/**
 * Route narrative generation — calls Gemini 2.5 Flash directly via REST.
 *
 * We deliberately avoid importing the Genkit SDK here because Genkit's
 * telemetry/reflection-server initialization keeps the Node event loop alive
 * and causes Next.js API routes to hang. A direct fetch to the Gemini REST
 * endpoint has zero startup overhead.
 */

import type { Difficulty, LoopResult, LunchStop, Pace, Theme } from "@/lib/route-engine";

const GEMINI_REST_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

// Banned words list — Gemini gravitates to these without enforcement.
const BANNED_WORDS = [
  "charming",
  "picturesque",
  "stunning",
  "breathtaking",
  "nestled",
  "discover",
  "quintessential",
  "idyllic",
  "tucked away",
  "hidden gem",
];

const BANNED_PATTERNS = [
  "isn't just",
  "is not just",
  "more than just",
  "a journey through",
];

const NARRATE_SYSTEM = `You are writing a short blurb for a circular walking route in the Cotswolds. The walker is comparing three options and choosing one; help them decide fast.

Voice:
- Direct, warm, specific. Like a knowledgeable friend, not a tourist board.
- British English. Distances in km and miles together on first mention, km only after. Time in hours and minutes ("4h 15m").
- Short sentences mixed with longer ones. No semicolons used as fancy commas.
- No emojis. No headers beyond the literal labels below.

Output EXACTLY this format — five labelled bullets, blank line, then one paragraph.

- Shape: [10-15 words. Terrain character, off-road vs lanes, anything geographically distinctive.]
- Best for: [10-15 words. Who this walk suits — fitness level, group type, motivation.]
- Halfway: [15-25 words. The midpoint POI by name. If lunch is verified open, say so; if verified closed, tell them to bring food; if unverified, suggest calling ahead.]
- Heads up: [10-20 words. One practical note — mud after rain, exposure on the ridge, a stile to lift a dog over, a busy lane to cross, etc.]
- Verdict: [10-15 words. One-line summing up, no qualifiers.]

A single paragraph after the bullets, 60-90 words. The "feel" of the walk — the moment that makes it memorable, the back half, what the walker will remember. Voice and atmosphere, not facts.

Banned words — NEVER use any of these or close synonyms: ${BANNED_WORDS.join(", ")}.
Banned phrasings — NEVER use any of these patterns: ${BANNED_PATTERNS.join(", ")}.

Do not use em-dashes (—). Use commas, full stops, colons, or semicolons.
Do not invent facts about the POI beyond what you are told.
Do not promise the weather, the season, or who will be there.
Do not skip any bullet. Do not add a 6th bullet. Do not add a heading above the bullets or after them.`;

export interface NarrateRouteInput {
  loop: LoopResult;
  theme: Theme;
  startLabel?: string;
  /** Tunes the voice: easy = relaxed afternoon, strenuous = serious day out. */
  difficulty?: Difficulty;
  /** Tunes how durationMin is contextualised in the prose. */
  pace?: Pace;
  /** Tunes paragraph 2's treatment of the midpoint POI. */
  lunchStop?: LunchStop;
  /** The walker's free-text priority ("amazing views and a good pub"). When
   *  set, the blurb should speak to it directly. Empty → default voice. */
  emphasis?: string;
  /** Names of must-pass stops the walker dropped on the map, in order. When
   *  present, the route is built to go THROUGH these — the blurb should walk
   *  the reader past them. */
  waypointLabels?: string[];
}

// Per-difficulty voice nudge. Empty string for moderate (default voice).
const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  easy: "The walker has chosen 'easy'. Pitch this as a relaxed afternoon: gentle terrain, low effort, no need to rush. The Verdict bullet should reflect this — a walk to recharge on, not a challenge.",
  moderate: "",
  strenuous: "The walker has chosen 'strenuous'. Pitch this as a proper day out for fit walkers: emphasise the climb, the satisfaction of effort, and the views earned. The Verdict bullet should reflect this — a walk that asks something of you.",
};

// Per-pace pace nudge. Empty for steady.
const PACE_GUIDE: Record<Pace, string> = {
  leisurely: "Walking time is calculated for a leisurely pace with stops. Mention this once if it helps the walker plan their day.",
  steady: "",
  brisk: "Walking time is calculated for a brisk pace with minimal stops. Mention this once if it helps the walker plan their day.",
};

// Per-lunch-stop midpoint nudge. The default ("preferred") relies on the
// system prompt's standing instruction; required and none override it.
function lunchGuide(pref: LunchStop, midpointName: string): string {
  switch (pref) {
    case "required":
      return `The walker explicitly wants a lunch stop. ${midpointName} is the anchor of the day — in the Halfway bullet, lead with it concretely (what kind of place, what to expect). Do not hedge.`;
    case "none":
      return `The walker is NOT stopping for lunch on this route. Treat ${midpointName} as a moment to pause and look around in the Halfway bullet, not as a place to refuel. Do not mention ordering food.`;
    case "preferred":
    default:
      return "";
  }
}

export function buildNarrateRoutePrompt(input: NarrateRouteInput): {
  system: string;
  prompt: string;
} {
  const {
    loop,
    theme,
    startLabel,
    difficulty = "moderate",
    pace = "steady",
    lunchStop = "preferred",
    emphasis = "",
    waypointLabels = [],
  } = input;

  const km = loop.actualKm.toFixed(1);
  const miles = (loop.actualKm * 0.6214).toFixed(1);
  const h = Math.floor(loop.durationMin / 60);
  const m = loop.durationMin % 60;
  const time = `${h}h ${m.toString().padStart(2, "0")}m`;

  const themeDescriptions: Record<Theme, string> = {
    ridge: "high ground with longer views",
    valley: "lower paths through farmland and watercourses",
    woodland: "tree-covered tracks and shaded paths",
    mixed: "a blend of high ground, valley paths, and tree cover — the engine picked the best-scoring midpoint without filtering by terrain class",
  };

  // Pace-aware framing of walking time in the prompt itself. The narrative
  // text the user reads still says "your steady pace" / "brisk pace" / etc.
  // when it makes sense.
  const paceLabel: Record<Pace, string> = {
    leisurely: "leisurely pace with stops",
    steady: "steady pace",
    brisk: "brisk pace with minimal stops",
  };

  const midpoint = loop.midpointPoi;
  // Tell Gemini the truth about whether the loop's polyline actually reaches
  // the POI's door (viaPoi=true) or just passes within walking distance of
  // it (viaPoi=false). The system prompt forbids inventing facts, so this is
  // the cue that keeps "via" honest in the prose.
  const onRouteFact = midpoint.id === -1
    ? "" // synthetic midpoint — neither claim applies
    : midpoint.viaPoi
      ? "The walking route is built to pass its door — the loop genuinely goes via this POI."
      : "The route passes within walking distance of this POI (a few hundred metres) but does not go through it. Say 'near' or 'a short detour from', never 'via' or 'past'.";
  // Day+time-aware open-status verdict from the walker's chosen walkDate.
  // Surfaced here so paragraph 2 can either confidently describe the stop
  // ("open") or hedge ("call ahead" / "closed that day").
  const openingFact = midpoint.isLunchStop
    ? midpoint.openingStatus === "open"
      ? "Opening hours: verified open at lunchtime on the walker's chosen date."
      : midpoint.openingStatus === "closed"
        ? "Opening hours: VERIFIED CLOSED at lunchtime on the walker's chosen date. Tell the walker to bring food or pick a different date — do not describe ordering lunch."
        : "Opening hours: unverified for the walker's date. Suggest they call ahead before counting on it."
    : "";
  const midpointFacts: string[] = [
    `Name: ${midpoint.name}`,
    `Type: ${midpoint.type}`,
    midpoint.isLunchStop ? "Suitable as a lunch stop." : "Not a designated lunch stop.",
    midpoint.terrainClass ? `Sits in ${midpoint.terrainClass} terrain.` : "",
    `Scenic score: ${midpoint.scenicScore}/10.`,
    onRouteFact,
    openingFact,
  ].filter(Boolean);

  // Assemble only the customisation guidance that's non-default. Keeps the
  // prompt short on the common path and gives Gemini sharp signal when the
  // walker actually deviates.
  const emphasisGuide = emphasis.trim()
    ? `What the walker most wants from this walk, in their words: "${emphasis.trim()}". Make the blurb speak to this — lead with it where it fits naturally. Never invent facts to satisfy it.`
    : "";

  const stops = waypointLabels.filter(Boolean);
  const waypointGuide =
    stops.length > 0
      ? `The walker chose specific places this route must pass through, in order: ${stops.join(", ")}. The loop is built to go through them — in the Halfway bullet, name them in route order. These are the heart of the walk; don't treat them as incidental.`
      : "";

  const customisation = [
    DIFFICULTY_GUIDE[difficulty],
    PACE_GUIDE[pace],
    // A chosen stop overrides the generic lunch guidance.
    stops.length > 0 ? "" : lunchGuide(lunchStop, midpoint.name),
    emphasisGuide,
    waypointGuide,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Route to narrate:

Start${startLabel ? ` (${startLabel})` : ""}: lat ${(loop.geometry.coordinates[0][1] as number).toFixed(5)}, lng ${(loop.geometry.coordinates[0][0] as number).toFixed(5)}.
Theme: ${theme} (${themeDescriptions[theme]}).
Distance: ${km} km (${miles} miles), closed loop returning to start.
Total ascent: ${loop.ascentM} m.
Walking time at a ${paceLabel[pace]}: ${time}.
Difficulty: ${difficulty}.

Midpoint POI (must be named in the Halfway bullet):
${midpointFacts.map((f) => `- ${f}`).join("\n")}
${
  customisation
    ? `\nWalker preferences (adjust your voice accordingly):\n${customisation}\n`
    : ""
}
Now write the five labelled bullets followed by ONE atmosphere paragraph. Follow the format exactly. Do not break the voice rules. Do not skip any bullet.`;

  return { system: NARRATE_SYSTEM, prompt };
}

/** One-shot narrative generation via the Gemini REST API. */
export async function narrateRoute(input: NarrateRouteInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const { system, prompt } = buildNarrateRoutePrompt(input);

  const url = `${GEMINI_REST_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: {
      parts: [{ text: system }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      // Gemini 2.5 Flash defaults to 8192 thinking tokens, which consumed the
      // entire output budget at 1024. thinkingBudget:0 disables thinking;
      // maxOutputTokens:8192 gives enough room for 3 paragraphs.
      maxOutputTokens: 8192,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  // Retry on rate-limit (429) and transient server errors (>=500). Batch
  // seeding (concurrency 4) routinely hit 429s with no retry, which left
  // ~90% of routes with a null narrative. Other 4xx (bad request, auth) are
  // permanent — fail fast. Honour Retry-After when present, else 1s/2s/4s.
  const MAX_ATTEMPTS = 3;
  let res: Response | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) break;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delayMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  if (!res || !res.ok) {
    const text = res ? await res.text().catch(() => "") : "";
    throw new Error(
      `Gemini API error ${res?.status ?? "no response"}: ${text.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };

  if (json.error) throw new Error(`Gemini error: ${json.error.message}`);

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");

  return text.trim();
}
