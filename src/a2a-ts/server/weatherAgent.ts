import "dotenv/config";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { initChatModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";

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

const ResponseSchema = z.object({
  status: z.enum(["butuh_informasi_tambahan", "selesai"]),
  content: z.string(),
});

const PROMPT: string = `
Kamu adalah agent cuaca di daerah provinsi Kalimantan timur hanya memberikan informasi seputar cuaca kota:
samrinda, balikpapan, bontang, tenggarong dan sangatta.
`;


const FORMAT_PROMPT = `
Set status butuh_informasi_tambahan jika konteks yang diberikan user butuh lebih informasi atau diluar konteks dari tugas anda untuk melanjutkan tugasnya.
Set status selesai jika anda tidak butuh konteks tambahan untuk mengerjakan tugasnnya dan menyelesaikannya.
`;

const llm = await initChatModel("google-genai:gemini-2.0-flash", {
  apiKey: googleApiKey,
});
export const agent = createReactAgent({
  llm: llm,
  tools: await weatherMcpClient.getTools(),
  checkpointer: checkpointer,
  prompt: PROMPT,
  responseFormat: {
    prompt: FORMAT_PROMPT,
    schema: ResponseSchema,
  }
});
