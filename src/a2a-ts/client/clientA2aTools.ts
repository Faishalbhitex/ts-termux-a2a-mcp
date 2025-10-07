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
  Artifact,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";


export interface AgentInfo {
  id: number;
  name: string;
  skills: string[];
  description: string;
  url: string;
  create_at?: string;
}

export interface AgentHealth {
  name: string;
  url: string;
  status: "online" | "offline";
}

export type EventKind =
  | Task
  | TaskStatusUpdateEvent
  | TaskArtifactUpdateEvent
  | Artifact
  | Message;
export interface SendMessageResult {
  success: boolean;
  result?: EventKind[];
  error?: string;
}

export class ClientA2aTools {
  private registerUrl: string;

  constructor(registerUrl: string) {
    this.registerUrl = registerUrl;
  }

  async discoveryAgents(): Promise<{ success: boolean; data?: AgentInfo[]; error?: string }> {
    try {
      const res = await fetch(`${this.registerUrl}/agents`);
      const json = await res.json();
      return {
        success: true,
        data: json.agents
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  async checkHealthAgentServer(
    params?: {
      agentNames?: string[];
      limits?: number;
    }
  ): Promise<{ success: boolean, health?: AgentHealth[], totalAgentServer?: number, error?: string }> {
    const { agentNames, limits = 10 } = params || {};

    const discovery = await this.discoveryAgents();
    if (!discovery.success || !discovery.data) {
      return {
        success: false,
        error: "Agent resgiser is empty"
      };
    }

    let agents = discovery.data;
    const totalAgentServer = agents.length;

    if (agentNames && agentNames.length > 0) {
      agents = agents.filter(a => agentNames.includes(a.name));
    }

    agents = agents.slice(0, limits);

    const results: AgentHealth[] = [];
    for (const agent of agents) {
      try {
        const client = await A2AClient.fromCardUrl(`${agent.url}/${AGENT_CARD_PATH}`);
        results.push({
          name: agent.name,
          url: agent.url,
          status: "online"
        });
      } catch {
        results.push({
          name: agent.name,
          url: agent.url,
          status: "offline"
        });
      }
    }
    return {
      success: true,
      health: results,
      totalAgentServer: totalAgentServer
    }
  }

  async sendMessage(
    agentCardUrl: string,
    message: string,
    taskId?: string,
    contextId?: string,
  ): Promise<SendMessageResult> {
    try {
      const client = await A2AClient.fromCardUrl(`${agentCardUrl}/${AGENT_CARD_PATH}`);
      const card: AgentCard = await client.getAgentCard();
      const agentName = card.name;
      const agentCapabilities = card.capabilities.streaming;

      const messageParams: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: message }],
      };

      if (contextId) {
        messageParams.contextId = contextId;
      }
      if (taskId) {
        messageParams.taskId = taskId;
      }

      const params: MessageSendParams = {
        message: messageParams,
      };

      if (!agentCapabilities) {
        const response = await client.sendMessage(params);
        if ("error" in response) {
          return {
            success: false,
            error: response.error.message,
          };
        } else {
          const result = (response as SendMessageSuccessResponse).result;

          return {
            success: true,
            result: [result],
          };
        }
      } else {
        const stream = client.sendMessageStream(params);
        const events: (Task | TaskArtifactUpdateEvent | TaskStatusUpdateEvent | Message)[] = [];

        for await (const event of stream) {
          events.push(event);
        }

        return {
          success: true,
          result: events
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }


}
