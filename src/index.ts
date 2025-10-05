import "dotenv/config";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { initChatModel } from "langchain/chat_models/universal";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { AIMessage } from "@langchain/core/messages";

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

const config = { configurable: { thread_id: "1" } };
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

console.log("Waiting agent response..\n");

const resp = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Hai! nama saya Faishal. Bagaimana cuaca di Kaltim sekarang?",
      },
    ],
  },
  config
);

console.log("Agent response-1 (Invoke):", resp);
console.log(
  `\nAgent response-1 structured output: ${JSON.stringify(resp.structuredResponse, null, 2)}`
);
console.log(
  `
Status: ${resp.structuredResponse.status}
Content: ${resp.structuredResponse.content}\n
`
);

const resp2Stream = await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "Sebut nama saya jika anda ingat? dan bagaiman cuaca di samarinda.",
      },
    ],
  },
  { streamMode: "values", ...config }
);

console.log("\nAgent response-2 (stream):");
let fullResponse = "";
let structuredResponse2 = {};
for await (const chunk of resp2Stream) {
  console.log(chunk);
  console.log("\n");
  const lastMessage: any = chunk.messages[chunk.messages.length - 1] || [];
  structuredResponse2 = chunk.structuredResponse;
  if (lastMessage instanceof AIMessage) {
    fullResponse = lastMessage.content || "";
  }
}

console.log(
  `Agent response-2 structured output: ${JSON.stringify(structuredResponse2, null, 2)}`
);
console.log(
  `
Status: ${structuredResponse2.status}
Content: ${structuredResponse2.content}\n
`
);
console.log(
  `Full response-2 (stream): ${fullResponse}\n`
);


const resp3EventStrem = agent.streamEvents(
  { messages: [{ role: "user", content: "bagaiman dengan bontang di bandingkan kota sebelumnnya?" }] },
  {
    version: "v2",
    ...config
  }
);

for await (const event of resp3EventStrem) {
  const kind = event.event;
  const name = event.name;
  const data = JSON.stringify(event.data, null, 2);
  console.log(
    `
\n${kind}: ${name}`
  );
}
