/**
 * Route narrative generation — calls Gemini 2.5 Flash directly via REST.
 *
 * We deliberately avoid importing the Genkit SDK here because Genkit's
 * telemetry/reflection-server initialization keeps the Node event loop alive
 * and causes Next.js API routes to hang. A direct fetch to the Gemini REST
 * endpoint has zero startup overhead.
 */

import type { LoopResult, Theme } from "@/lib/route-engine";

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

const NARRATE_SYSTEM = `You are writing a short blurb for a circular walking route in the Cotswolds. The walker is choosing whether to spend their day on this loop; you have three paragraphs to help them decide.

Voice:
- Direct, warm, specific. Like a knowledgeable friend, not a tourist board.
- British English. Distances in km and miles together on first mention, km only after. Time in hours and minutes ("4h 15m").
- Short sentences mixed with longer ones. No semicolons used as fancy commas.
- No bullet points. No headers. No emojis.
- Mention the midpoint POI by name in paragraph 2.

Structure (3 paragraphs, ~80-120 words each):
1. **The shape of the walk.** What kind of terrain, the overall character, who it suits. State the distance, ascent, and rough walking time in this paragraph.
2. **The lunch stop and the middle of the day.** Centre on the midpoint POI. Why people stop there, what's around it, what to look for on the approach.
3. **The return and the verdict.** What the back half is like, any practical note (muddy after rain, bring a windproof for the ridge, etc.), and a one-sentence summing-up.

Banned words — NEVER use any of these or close synonyms: ${BANNED_WORDS.join(", ")}.
Banned phrasings — NEVER use any of these patterns: ${BANNED_PATTERNS.join(", ")}.

Do not use em-dashes (—). Use commas, full stops, or semicolons.
Do not invent facts about the POI beyond what you are told.
Do not promise the weather, the season, or who will be there.`;

export interface NarrateRouteInput {
  loop: LoopResult;
  theme: Theme;
  startLabel?: string;
}

export function buildNarrateRoutePrompt(input: NarrateRouteInput): {
  system: string;
  prompt: string;
} {
  const { loop, theme, startLabel } = input;

  const km = loop.actualKm.toFixed(1);
  const miles = (loop.actualKm * 0.6214).toFixed(1);
  const h = Math.floor(loop.durationMin / 60);
  const m = loop.durationMin % 60;
  const time = `${h}h ${m.toString().padStart(2, "0")}m`;

  const themeDescriptions: Record<Theme, string> = {
    ridge: "high ground with longer views",
    valley: "lower paths through farmland and watercourses",
    woodland: "tree-covered tracks and shaded paths",
  };

  const midpoint = loop.midpointPoi;
  const midpointFacts: string[] = [
    `Name: ${midpoint.name}`,
    `Type: ${midpoint.type}`,
    midpoint.isLunchStop ? "Suitable as a lunch stop." : "Not a designated lunch stop.",
    midpoint.terrainClass ? `Sits in ${midpoint.terrainClass} terrain.` : "",
    `Scenic score: ${midpoint.scenicScore}/10.`,
  ].filter(Boolean);

  const prompt = `Route to narrate:

Start${startLabel ? ` (${startLabel})` : ""}: lat ${(loop.geometry.coordinates[0][1] as number).toFixed(5)}, lng ${(loop.geometry.coordinates[0][0] as number).toFixed(5)}.
Theme: ${theme} (${themeDescriptions[theme]}).
Distance: ${km} km (${miles} miles), closed loop returning to start.
Total ascent: ${loop.ascentM} m.
Walking time at a steady pace: ${time}.

Midpoint POI (mention by name in paragraph 2):
${midpointFacts.map((f) => `- ${f}`).join("\n")}

Now write the 3-paragraph blurb. Follow the structure exactly. Do not break the voice rules.`;

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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 200)}`);
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
