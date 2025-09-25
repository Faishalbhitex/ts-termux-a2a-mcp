import { googleAI } from "@genkit-ai/google-genai";
import { genkit } from "genkit/beta";

export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model(
    "gemini-2.0-flash",
    {
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.5,
    },
  )
});

export { z } from "genkit";
