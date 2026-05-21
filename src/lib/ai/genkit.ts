import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

// Genkit instance using the Gemini Developer API (Google AI Studio).
// Authentication: API key via GEMINI_API_KEY env var.
//   - Local dev: set GEMINI_API_KEY in .env.local (get key at https://aistudio.google.com/apikey).
//   - Production (Firebase App Hosting): wired in apphosting.yaml as a Secret Manager secret.
//
// We chose the AI Studio API over Vertex AI to avoid GCP IAM setup. The same
// `@genkit-ai/google-genai` plugin can be repointed at Vertex AI later if we
// need EU data residency or enterprise quotas — change the import to its
// `vertexAI` export, no application-code changes required.
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model("gemini-2.5-flash"),
});

function isTransient503(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("Service Unavailable") ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE")
  );
}

// Wraps ai.generate with exponential-backoff retries for transient 503s from
// the Gemini API. Three attempts: immediate, +1 s, +2 s, +4 s.
export async function generate(
  ...args: Parameters<typeof ai.generate>
): ReturnType<typeof ai.generate> {
  const delays = [1_000, 2_000, 4_000];
  let lastErr: unknown;
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await ai.generate(...args);
    } catch (err) {
      lastErr = err;
      if (i === delays.length || !isTransient503(err)) throw err;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
  throw lastErr;
}
