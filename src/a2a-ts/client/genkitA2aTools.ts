import { ClientA2aTools } from "./clientA2aTools.js";
import { z, ai } from "./genkit.js";

const client = new ClientA2aTools(process.env.AGENT_REGISTER_URL || '');

export const discoveryAgents = ai.defineTool(
  {
    name: 'discoveryAgents',
    description: 'Discovery available remote/server agents from register.',
  },
  async () => {
    return await client.discoveryAgents();
  }
);

export const checkAgentHealth = ai.defineTool(
  {
    name: "checkAgentHealth",
    description: "Check health status of registered agents  if agent is online or offline",
    inputSchema: z.object({
      agentNames: z.array(z.string()).optional().describe('Agent names available on register'),
      limits: z.number().optional().default(10).describe('Max agents to check on register'),
    })
  },
  async (input) => {
    return client.checkHealthAgentServer({ agentNames: input.agentNames, limits: input.limits });
  }
);

export const sendToAgent = ai.defineTool(
  {
    name: "sendToAgent",
    description: "Send message or task to specific remote/server agent",
    inputSchema: z.object({
      agentUrl: z.string().describe('The URL of the target agent server/remote'),
      message: z.string().describe('Message or task to send to the agent server/remote'),
      taskId: z.string().optional().describe('Multi turn to send message or task from previous taskId'),
      contextId: z.string().optional().describe('Multi turn to send message or task from previous contextId'),
    })
  },
  async (input) => {
    return await client.sendMessage(input.agentUrl, input.message, input.taskId, input.contextId);
  }
);


