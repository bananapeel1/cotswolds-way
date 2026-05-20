import { genkit } from "genkit";
import { vertexAI, gemini } from "@genkit-ai/vertexai";

// Genkit instance with Vertex AI plugin.
// Authentication: Application Default Credentials.
//   - Cloud Run (App Hosting): metadata server, automatic.
//   - Local dev: run `gcloud auth application-default login` once.
//
// Region must match where Vertex models are deployed for your project.
// europe-west4 has Gemini 2.5 Flash available and matches the App Hosting backend.
export const ai = genkit({
  plugins: [
    vertexAI({
      location: "europe-west4",
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "cw-website-48e46",
    }),
  ],
  model: gemini("gemini-2.5-flash"),
});
