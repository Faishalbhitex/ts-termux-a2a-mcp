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
  Task,
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
    const result = (response as SendMessageSuccessResponse).result;
    console.log("Full result-1:", JSON.stringify(result, null, 2));

    if (result.kind === "task") {
      const task = result as Task;
      taskId = task.id;
      contextId = task.contextId;
      console.log("\nTask found: ", JSON.stringify(task, null, 2));

      if (task.artifacts && task.artifacts.length > 0) {
        const artifactsName = task.artifacts[0].name;
        const content = task.artifacts[0].parts[0];
        console.log("\nArtifacts found:", JSON.stringify(task.artifacts, null, 2));
        console.log("Artifact name:", artifactsName);
        console.log("Content:", JSON.stringify(content, null, 2));
      }
    } else {
      const message = result as Message;
      taskId = result.taskId;
      contextId = result.contextId;
      console.log("\nTask and Artifacts not found");
      console.log("Message:", JSON.stringify(message));
    }
  }

  const sendParams2: MessageSendParams = {
    message: {
      messageId: uuidv4(),
      role: "user",
      parts: [
        {
          kind: "text",
          text: "Ingat nama saya sebutkan nama saya jika anda ingat (wajib)? bagaimana cuaca di kaltim samarinda?"
        }
      ],
      kind: "message",
      contextId: contextId,
      taskId: taskId,
    },
  };

  const response2 = await client.sendMessage(sendParams2);
  if ("error" in response2) {
    console.error("Error:", response2.error.message);
  } else {
    const result2 = (response2 as SendMessageSuccessResponse).result;
    console.log("Full result-2:", JSON.stringify(result2, null, 2));

    if (result2.kind === "task") {
      const task = result2 as Task;
      taskId = task.id;
      contextId = task.contextId;
      console.log("\nTask found: ", JSON.stringify(task, null, 2));

      if (task.artifacts && task.artifacts.length > 0) {
        const artifactsName = task.artifacts[0].name;
        const content = task.artifacts[0].parts[0];
        console.log("\nArtifacts found:", JSON.stringify(task.artifacts, null, 2));
        console.log("Artifact name:", artifactsName);
        console.log("Content:", JSON.stringify(content, null, 2));
      }
    } else {
      const message = result2 as Message;
      taskId = result2.taskId;
      contextId = result2.contextId;
      console.log("\nTask and Artifacts not found");
      console.log("Message:", JSON.stringify(message));
    }
  }
  console.log("\n\nTask Id:", taskId);
  console.log("\n\nContext Id:", contextId);
}

await run();
