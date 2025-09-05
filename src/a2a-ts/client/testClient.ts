import "dotenv/config";
import {
  A2AClient,
} from "@a2a-js/sdk/client";
import {
  AgentCard,
  Message,
  AGENT_CARD_PATH,
  MessageSendParams,
  SendMessageSuccessResponse,
} from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

const WEATHER_AGENT_URL = process.env.WEATHER_AGENT_URL;
let agentDiscovery: Record<string, AgentCard> = {};
async function run() {
  const client = await A2AClient.fromCardUrl(`${WEATHER_AGENT_URL}/${AGENT_CARD_PATH}`);
  const card: AgentCard = await client.getAgentCard();
  const agentName: string = card.name;
  agentDiscovery[agentName] = card;
  console.log("Discovery Agent Available:", JSON.stringify(agentDiscovery, null, 2));
  const sendParams: MessageSendParams = {
    message: {
      messageId: uuidv4(),
      role: "user",
      parts: [
        {
          kind: "text",
          text: "Hai saya Faishal! Siapa anda?"
        }
      ],
      kind: "message",
    },
  };

  let taskId: string | undefined;
  let contextId: string | undefined;
  const response = await client.sendMessage(sendParams);

  if ("error" in response) {
    console.error("Error:", response.error.message);
  } else {
    const result = (response as SendMessageSuccessResponse).result as Message;
    const resultJson = JSON.stringify(result.parts[0], null, 2);
    taskId = result.taskId;
    contextId = result.contextId;
    console.log(`\n${agentName} response-1: ${resultJson}\n`);
  }
  console.log("Full response-1:", JSON.stringify(response, null, 2));

  const sendParams2: MessageSendParams = {
    message: {
      messageId: uuidv4(),
      role: "user",
      parts: [
        {
          kind: "text",
          text: "Ingat nama saya sebutkan nama saya jika anda ingat? bagaimana cuaca di kaltim samarinda?"
        }
      ],
      kind: "message",
      taskId: taskId,
      contextId: contextId,
    },
  };

  const response2 = await client.sendMessage(sendParams2);

  if ("error" in response2) {
    console.error("Error:", response2.error.message);
  } else {
    const result2 = (response2 as SendMessageSuccessResponse).result as Message;
    const resultJson2 = JSON.stringify(result2.parts[0], null, 2);
    taskId = result2.taskId;
    contextId = result2.contextId;
    console.log(`\n${agentName} response-2: ${resultJson2}\n`);
  }
  console.log("Full response-2:", JSON.stringify(response2, null, 2));

}

await run();
