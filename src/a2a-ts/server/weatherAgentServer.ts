import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentCard,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
  Message,
  AgentCapabilities,
  Part,
  TextPart,
} from '@a2a-js/sdk';
import {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import { agent } from './weatherAgent.js';

const WEATHER_AGENT_URL: string = process.env.WEATHER_AGENT_URL || "";
const capabilities: AgentCapabilities = {
  streaming: false,
};
const weatherAgentCard: AgentCard = {
  name: "Weather Agent",
  description: "Agent Cuaca di wilayah indonesia bagian kaltim",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: WEATHER_AGENT_URL,
  capabilities: capabilities,
  defaultInputModes: ["text", "text/plain"],
  defaultOutputModes: ["text", "text/plain"],
  skills: [
    {
      id: "Weather Agent Id",
      name: "Weather Kaltim",
      description: "Weather agent di daerah kalimantan timur (samarinda, balikpapan, bontang, tenggarong dan sangatta).",
      tags: [
        "cuaca",
        "kaltim",
        "samarinda"
      ]
    }
  ],
};


class WeatherAgentExecutor implements AgentExecutor {
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const userMsg = this.convertPartA2AtoLangGraph(requestContext.userMessage);
    const taskId = requestContext.taskId || uuidv4();
    const contextId = requestContext.contextId || uuidv4();
    const config = { configurable: { thread_id: contextId } };
    const weatherAgent = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: userMsg,
          },
        ],
      },
      config
    );
    console.log("Weather agent log:", JSON.stringify(weatherAgent, null, 2));
    const weatherAgentResponse = weatherAgent.messages[weatherAgent.messages.length - 1];

    const initialTask: Task = {
      kind: "task",
      id: taskId,
      contextId: contextId,
      status: {
        state: "submitted",
        timestamp: new Date().toISOString(),
      },
    };
    eventBus.publish(initialTask);

    const artifactUpdate: TaskArtifactUpdateEvent = {
      kind: "artifact-update",
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "weather_report",
        parts: [
          {
            kind: "text",
            text: weatherAgentResponse.content.toString(),
          }
        ],
      },
    };
    eventBus.publish(artifactUpdate);

    const finalUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: taskId,
      contextId: contextId,
      status: {
        state: "input-required",
        timestamp: new Date().toISOString()
      },
      final: true,
    };
    eventBus.publish(finalUpdate);
    eventBus.finished();
  }

  cancelTask = async (): Promise<void> => { };

  private convertPartA2AtoLangGraph(message: Message): string {
    const part: Part = message.parts[0];
    if (part.kind === "text" && !!(part as TextPart)) {
      return (part as TextPart).text;
    }
    return "";
  }

}


// Set and run serveer
const agentExecutor = new WeatherAgentExecutor();
const requestHandler = new DefaultRequestHandler(
  weatherAgentCard,
  new InMemoryTaskStore(),
  agentExecutor
);

const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express());

expressApp.listen(4000, '0.0.0.0', () => {
  console.log(`Weather agent server started on http://0.0.0.0:4000`);
})
