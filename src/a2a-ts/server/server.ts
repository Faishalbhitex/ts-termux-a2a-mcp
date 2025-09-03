import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentCard,
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

const SERVER_HOST = process.env.SERVER_HOST || "0.0.0.0";
const SERVER_PORT = process.env.SERVER_PORT || "4000";

const capabilities: AgentCapabilities = {
  streaming: false,
};
const weatherAgentCard: AgentCard = {
  name: "Weather Agent",
  description: "Agent Cuaca di wilayah indonesia bagian kaltim",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: `http://${SERVER_HOST}:${SERVER_PORT}/`,
  capabilities: capabilities,
  defaultInputModes: ["text", "text/plain"],
  defaultOutputModes: ["text", "text/plain"],
  skills: [
    {
      id: "Weather Agent Id",
      name: "Weather Kaltim",
      description: "Weather agent di daerah kalimantan timur (samarinda, balikpapan, bontang).",
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
    const weatherAgentResponse = weatherAgent.messages[weatherAgent.messages.length - 1];
    const respMsg: Message = {
      kind: "message",
      messageId: uuidv4(),
      role: "agent",
      parts: [
        {
          kind: "text",
          text: weatherAgentResponse.content.toString()
        }
      ],
      contextId: contextId,
    }

    eventBus.publish(respMsg);
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
