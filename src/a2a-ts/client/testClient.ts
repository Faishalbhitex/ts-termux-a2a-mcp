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
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TaskState,
  Artifact,
} from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

const WEATHER_AGENT_URL = process.env.WEATHER_AGENT_URL;
let agentDiscovery: Record<string, AgentCard> = {};
async function run() {
  const client = await A2AClient.fromCardUrl(`${WEATHER_AGENT_URL}/${AGENT_CARD_PATH}`);
  const card: AgentCard = await client.getAgentCard();
  const agentCapabilities: boolean = card.capabilities.streaming;
  const agentName: string = card.name;
  agentDiscovery[agentName] = card;
  console.log("Discovery Agent Available:", JSON.stringify(agentDiscovery, null, 2));

  let taskId: string | undefined;
  let contextId: string | undefined;
  let currentState: TaskState = "unknown";
  if (!agentCapabilities) {
    console.log(
      `[${agentName}] Non-Streaming response..`
    );
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
    const response = await client.sendMessage(sendParams);
    const dumpResponse = JSON.stringify(response, null, 2);
    console.log(`[${agentName}] Response: ${dumpResponse}\n`);
    if ("error" in response) {
      console.error("Error:", response.error.message);
    } else {
      const result = (response as SendMessageSuccessResponse).result;
      if (result.kind === "task") {
        const task = result as Task;
        const dumpTask = JSON.stringify(task, null, 2);
        taskId = task.id;
        contextId = task.contextId;
        currentState = task.status.state;
        console.log(`\n[${agentName}] Task: ${dumpTask}`);

        if (task.artifacts && task.artifacts.length > 0) {
          const artifacts = task.artifacts[0] as Artifact;
          const dumpArtifacts = JSON.stringify(artifacts, null, 2);
          console.log(`[${agentName}] Artifacts: ${dumpArtifacts}\n`);
        }
      } else {
        const message = result as Message;
        const dumpMesage = JSON.stringify(message, null, 2);
        taskId = result.taskId;
        contextId = result.contextId;
        console.log(`[${agentName}] Message: ${dumpMesage}\n`);
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
        taskId: currentState === "input-required" ? taskId : undefined, // new taskid generate bby server dsidee 
      },
    };

    const response2 = await client.sendMessage(sendParams2);
    if ("error" in response2) {
      console.error("Error:", response2.error.message);
    } else {
      const result2 = (response2 as SendMessageSuccessResponse).result;

      if (result2.kind === "task") {
        const task = result2 as Task;
        const dumpTask = JSON.stringify(task, null, 2);
        taskId = task.id;
        contextId = task.contextId;
        console.log(`\n[${agentName}] Task: ${dumpTask}`);

        if (task.artifacts && task.artifacts.length > 0) {
          const artifacts = task.artifacts[0] as Artifact;
          const dumpArtifacts = JSON.stringify(artifacts, null, 2);
          console.log(`[${agentName}] Artifacts: ${dumpArtifacts}`);
        }
      } else {
        const message = result2 as Message;
        const dumpMesage = JSON.stringify(message, null, 2);
        taskId = result2.taskId;
        contextId = result2.contextId;
        console.log(`[${agentName}] Message: ${dumpMesage}\n`);
      }
    }
  } else {
    console.log(
      `\n[${agentName}] Streaming response..\n`
    );
    const params: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "hai saya Faishal. bagaimana cuaca di samarinda?" }],
        kind: "message"
      },
    };

    const stream = client.sendMessageStream(params);
    for await (const event of stream) {
      const kind = event.kind;
      /*const dumpEvent = JSON.stringify(event, null, 2);
      console.log(
        `\n[${agentName}] Event: ${dumpEvent}`
      );
      */
      console.log(
        `\n[${agentName}] Kind: ${kind}`
      );
      if (kind === "task") {
        const task = event as Task;
        const dumpTask = JSON.stringify(task, null, 2);
        taskId = task.id;
        contextId = task.contextId;
        currentState = task.status.state;
        console.log(
          `[${agentName}] Current State: ${currentState}`
        );
        console.log(
          `[${agentName}] Task: ${dumpTask}`
        );
      } else if (kind === "status-update") {
        const taskUpdate = event as TaskStatusUpdateEvent;
        const dumpTaskUpdate = JSON.stringify(taskUpdate, null, 2);
        taskId = taskUpdate.taskId;
        contextId = taskUpdate.contextId;
        currentState = taskUpdate.status.state;
        console.log(
          `[${agentName}] Current State: ${currentState}`
        );
        console.log(
          `[${agentName}] Task Status Update: ${dumpTaskUpdate}`
        );
      } else if (kind === "artifact-update") {
        const artifactUpdate = event as TaskArtifactUpdateEvent;
        const dumpArtifactUpdate = JSON.stringify(artifactUpdate, null, 2);
        taskId = artifactUpdate.taskId;
        contextId = artifactUpdate.contextId;
        console.log(
          `[${agentName}] Artifact Status Update: ${dumpArtifactUpdate}`
        );
      } else {
        const message = event as Message;
        const dumpMesage = JSON.stringify(message, null, 2);
        taskId = message.taskId;
        contextId = message.contextId;
        console.log(
          `[${agentName}] Message: ${dumpMesage}`
        )
      } // end block kind condition 
    } // end block stream loop

    // Stream folowups 
    console.log(`\n[${agentName}] Stream folowups with taskId: ${taskId} or contextId: ${contextId}..`);
    let validTaskId: string | undefined;
    if (currentState === "completed") {
      console.log(
        `final state for task: ${taskId} is ${currentState}: immutable.\n You can use only contextId: ${contextId} for multi turn.`
      );
      validTaskId = undefined;
    } else if (currentState === "input-required") {
      console.log(
        `final state for task: ${taskId} is ${currentState}: immutable.\nSo you can use taskId for folowups task from contextId: ${contextId}
`
      );
      validTaskId = taskId;
    }
    const params2: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "bagaimana cuaca di balikpapan di bandingkan dengan kota sebeleumnya?" }],
        contextId: contextId,
        taskId: validTaskId,
        kind: "message",
      }
    }
    const stream2 = client.sendMessageStream(params2);
    for await (const event of stream2) {
      const dumpEvent = JSON.stringify(event, null, 2);
      console.log(`\n[${agentName}] Event: ${dumpEvent}`);
    }
  } // end block agentCapabilities condition
}

await run();
