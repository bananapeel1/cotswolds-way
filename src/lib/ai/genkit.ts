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
