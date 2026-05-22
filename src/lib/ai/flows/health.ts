import { z } from "zod";
import { ai, generate } from "../genkit";

// Minimal flow used to verify Vertex AI auth and connectivity end-to-end.
// Replace or delete once the trip-planner flow lands.
export const healthFlow = ai.defineFlow(
  {
    name: "health",
    inputSchema: z.object({ name: z.string().default("walker") }),
    outputSchema: z.object({ reply: z.string(), model: z.string() }),
  },
  async ({ name }) => {
    const { text } = await generate({
      prompt: `In one short sentence, greet a Cotswold Way ${name} and mention one thing the trail is famous for.`,
    });
    return { reply: text, model: "gemini-2.5-flash" };
  },
);
