import "dotenv/config";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { initChatModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { MemorySaver } from "@langchain/langgraph-checkpoint";


const googleApiKey = process.env.GOOGLE_API_KEY || "";
const MCP_WEATHER_URL = process.env.MCP_WEATHER_KALTIM_URL || "";
const checkpointer = new MemorySaver();

const weatherMcpClient = new MultiServerMCPClient({
  mcpServers: {
    "weather-kaltim": {
      url: MCP_WEATHER_URL,
      transport: "http",
    },
  }
});

const PROMPT: string = `
Kamu adalah agent cuaca di daerah provinsi Kalimantan timur hanya memberikan informasi seputar cuaca kota:
samrinda, balikpapan, bontang, tenggarong dan sangatta.
`
const llm = await initChatModel("google-genai:gemini-2.0-flash", {
  apiKey: googleApiKey,
});
const config = { configurable: { thread_id: "1" } };
export const agent = createReactAgent({
  llm: llm,
  tools: await weatherMcpClient.getTools(),
  checkpointer: checkpointer,
  prompt: PROMPT,
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



