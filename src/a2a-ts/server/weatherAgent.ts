import "dotenv/config";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph-checkpoint";

import { z } from "zod";

const apiKey = process.env.GOOGLE_API_KEY || "";
const checkpointer = new MemorySaver();

const indoWeather = tool(
  async ({ location }: { location: string }) => {
    const weatherData: Record<string, string> = {
      samarinda: "cerah",
      balikpapan: "hujan ",
      bontang: "hujan"
    };

    const city: string = location.toLowerCase();
    if (!(city in weatherData)) {
      return `Maaf, data cuaca untuk ${location} tidak ada.`;
    }

    const condition = weatherData[city];
    return `Cuaca di ${location}: ${condition}`;
  },
  {
    name: "indoWeather",
    description: "Cek cuaca di wilayah indonesia.",
    schema: z.object({
      location: z.string().describe("location kota wilayah indonesia untuk cek cuaca."),
    }),
  }
);


const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: apiKey,
});

const SYSTEM_INSTRUCTION = `
Kamu adalah agent cuaca di wilayah indonesia daerah provinsi kaltim.
Hanya bisa support kota ( samarinda, balikpapan, dan bontang ).
`

export const agent = createReactAgent({
  llm: model,
  tools: [indoWeather],
  checkpointer: checkpointer,
  prompt: SYSTEM_INSTRUCTION,
});


