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

export interface ResponseTaskAgentServer {
  isTask: boolean;
  name: string;
  taskResult: string;
  contextId: string;
  taskId: string;
  status: string;
  fromUrl: string;
}

export interface ResponseMessageAgentServer {
  isTask: boolean;
  name: string;
  message: string;
  contextId: string;
  taskId: string;
  fromUrl: string;
}

export type ResponseAgenServer = ResponseMessageAgentServer | ResponseTaskAgentServer;

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
  ): Promise<{ success: boolean; resp?: ResponseAgenServer; error?: string }> {
    try {
      let responseAgentServer: ResponseAgenServer;
      let taskResult = "Tasks not response";
      let messageResult = "Message not responnse";
      const client = await A2AClient.fromCardUrl(`${agentCardUrl}/${AGENT_CARD_PATH}`);
      const card: AgentCard = await client.getAgentCard();
      const agentName = card.name;

      const payload: Message = {
        messageId: uuidv4(),
        role: "user",
        parts: [
          {
            kind: "text",
            text: message
          }
        ],
        kind: "message"
      };

      if (taskId) {
        payload.taskId = taskId;
      }

      if (contextId) {
        payload.contextId = contextId;
      }
      const sendParams: MessageSendParams = {
        message: payload
      };

      const res = await client.sendMessage(sendParams);
      if ("error" in res) {
        return {
          success: false,
          error: res.error.message
        };
      } else {
        const result = (res as SendMessageSuccessResponse).result;
        if (result.kind === "task") {
          const task = result as Task;
          if (task.artifacts && task.artifacts.length > 0) {
            taskResult = JSON.stringify(task.artifacts[0].parts[0], null, 2);
          }
          responseAgentServer = {
            isTask: true,
            name: agentName,
            taskResult: taskResult,
            taskId: task.id,
            contextId: task.contextId,
            status: task.status.state,
            fromUrl: agentCardUrl,
          }
        } else {
          const msg = result as Message;
          messageResult = JSON.stringify(msg.parts[0], null, 2);

          responseAgentServer = {
            isTask: false,
            name: agentName,
            message: messageResult,
            taskId: msg.taskId,
            contextId: msg.contextId,
            fromUrl: agentCardUrl,
          }
        }
      }

      return {
        success: true,
        resp: responseAgentServer
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }


}
