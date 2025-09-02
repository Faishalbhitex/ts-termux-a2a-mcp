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

const config = { configurable: { thread_id: "1" } };
export const agent = createReactAgent({
  llm: model,
  tools: [indoWeather],
  checkpointer: checkpointer,
});

const resp = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Hai! nama saya Faishal. Bagaimana cuaca di balikpapan sekarang?",
      },
    ],
  },
  config
);
console.log("Agent Invoke:", resp.messages[resp.messages.length - 1].content);

/*
const resp2 = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "siapa tadi nama saya?",
      },
    ],
  },
  config);
console.log("\nAgent Invoke2:", resp2);
*/

const resp3Stream = await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "Sebut nama saya jika anda ingat? dan bagaiman cuaca di samarinda.",
      },
    ],
  },
  { streamMode: "updates", ...config }
);

console.log("\nAgent Stream");
for await (const chunk of resp3Stream) {
  console.log(chunk);
  console.log("\n");
}



