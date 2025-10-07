import "dotenv/config";
import { ClientA2aTools } from "./clientA2aTools.js";
import {
  Task,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  Artifact,
  Message,
  TaskState
} from "@a2a-js/sdk";
import type { EventKind } from "./clientA2aTools.ts";

const AGENT_REGISTER_URL = process.env.AGENT_REGISTER_URL || "";
const client = new ClientA2aTools(AGENT_REGISTER_URL);

// ✅ Type Guard Functions
function isTask(event: EventKind): event is Task {
  return 'kind' in event && event.kind === "task";
}

function isTaskStatusUpdate(event: EventKind): event is TaskStatusUpdateEvent {
  return 'kind' in event && event.kind === "status-update";
}

function isTaskArtifactUpdate(event: EventKind): event is TaskArtifactUpdateEvent {
  return 'kind' in event && event.kind === "artifact-update";
}

function isMessage(event: EventKind): event is Message {
  return 'kind' in event && event.kind === "message";
}

async function testClientA2aTools() {
  let contextId: string | undefined;
  let taskId: string | undefined;
  let currentState: TaskState = "unknown";

  // 1. Discovery agent server/remote on url agent register go
  console.log("Discover agent..");
  const discovery = await client.discoveryAgents();

  if (!discovery.success) {
    console.error("Discovery failed:", discovery.error);
    return;
  }
  console.log("Agent available on register:", JSON.stringify(discovery, null, 2));

  const weatherAgent = discovery.data?.find(agent =>
    agent.skills.includes("cuaca") ||
    agent.skills.includes("kaltim")
  );

  if (!weatherAgent) {
    console.log("NO weather agent found");
    return;
  }
  console.log("Found weather agent:", weatherAgent.name);

  const result = await client.sendMessage(
    weatherAgent.url,
    "Hai, saya Faishal. Bagaimana cuaca samarinda?",
    undefined,
    undefined,
  );

  console.log(`Result: ${JSON.stringify(result, null, 2)}`);

  // 2. Check agent server if online or offline
  const checkAgentsHealth = await client.checkHealthAgentServer();
  console.log("Agent Status:", checkAgentsHealth);

  const checkAgentsHealthByName = await client.checkHealthAgentServer(
    {
      agentNames: [weatherAgent.name, "Agent not available in register"],
      limits: 5
    }
  );
  console.log("Agent Status (ByName):", checkAgentsHealthByName);

  // ✅ Extract from events with Type Guards
  const events = result.result;

  if (!events || events.length === 0) {
    console.log("No events received");
    return;
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // ✅ Type-safe event handling
    if (isTask(event)) {
      console.log(`Kind: task`);
      taskId = event.id;
      contextId = event.contextId;
      currentState = event.status.state || "unknown";
      console.log(`task: ${taskId} for context id: ${contextId}, state: ${currentState}`);
    }
    else if (isTaskStatusUpdate(event)) {
      console.log(`Kind: status-update`);
      currentState = event.status.state;
      console.log(`Status updated to: ${currentState}`);
    }
    else if (isTaskArtifactUpdate(event)) {
      console.log(`Kind: artifact-update`);
      console.log(`Artifact update received`);
    }
    else if (isMessage(event)) {
      console.log(`Kind: message`);
      console.log(`Message received`);
    }
  }

  console.log(`\nExtracted context:`);
  console.log(`- taskId: ${taskId}`);
  console.log(`- contextId: ${contextId}`);
  console.log(`- state: ${currentState}`);

  // Determine if should use taskId for next turn
  const FINAL_STATES: TaskState[] = ["completed", "failed", "canceled", "rejected"];
  const shouldUseTaskId = currentState && !FINAL_STATES.includes(currentState);

  console.log(`\nFor next turn: Use taskId? ${shouldUseTaskId}`);

  // Second message (multi-turn)
  const result2 = await client.sendMessage(
    weatherAgent.url,
    "Bagaimana cuaca di bontang dibanding kota sebelumnya?",
    shouldUseTaskId ? taskId : undefined,
    contextId
  );

  console.log(`\nResult 2: ${JSON.stringify(result2, null, 2)}`);
}

await testClientA2aTools();
