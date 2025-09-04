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
export const agent = createReactAgent({
  llm: llm,
  tools: await weatherMcpClient.getTools(),
  checkpointer: checkpointer,
  prompt: PROMPT,
});
