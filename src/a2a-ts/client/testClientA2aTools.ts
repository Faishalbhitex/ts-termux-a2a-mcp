import "dotenv/config";
import { ClientA2aTools } from "./clientA2aTools.js";

const AGENT_REGISTER_URL = process.env.AGENT_REGISTER_URL || "";
const WEATHER_AGENT_URL = process.env.WEATHER_AGENT_URL;
const client = new ClientA2aTools(AGENT_REGISTER_URL);

async function testClientA2aTools() {
  // 1. Discovery agent server/remote on url agent register go 
  console.log("Discover agent..");
  const discovery = await client.discoveryAgents();

  if (!discovery.success) {
    console.error("Discovery failed:", discovery.error);
  }
  console.log("Agent available on register:", JSON.stringify(discovery, null, 2));

  // 2. Send message to agent server base on their url in agent register
  const weatherAgent = discovery.data?.find(agent =>
    agent.skills.includes("cuaca") ||
    agent.skills.includes("kaltim")
  );

  if (!weatherAgent) {
    console.log("NO weather agent found");
    return;
  }
  console.log("Found weather agent:", weatherAgent.name);

  const msg1 = await client.sendMessage(
    weatherAgent.url,
    "Hai, saya Faishal. Bagaimana cuaca samarinda?"
  );

  if (msg1.success) {
    console.log("Response 1:", msg1.resp?.message);

    const msg2 = await client.sendMessage(
      weatherAgent.url,
      "Masih ingat nama saya? Dan bagaimana cuaca di balikpapan di bandingkan kota sebelumnnya yang saya katakan tadi?",
      msg1.resp?.taskId,
      msg1.resp?.contextId,
    );

    console.log("Response 2:", msg2.resp?.message);
  }
}

await testClientA2aTools();
