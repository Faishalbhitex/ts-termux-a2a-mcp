import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentCard,
  Task,
  TaskState,
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
import { AIMessage, ToolMessage } from '@langchain/core/messages';

const WEATHER_AGENT_URL: string = process.env.WEATHER_AGENT_URL || "";
const capabilities: AgentCapabilities = {
  streaming: true,
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
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
    taskId: string,
    _eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
  };

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    const taskId = existingTask?.id || uuidv4();
    const contextId = userMessage.contextId || requestContext?.contextId || uuidv4();

    console.log(
      `[WeatherAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
    );

    if (!existingTask) {
      // State submitted
      const initialTask: Task = {
        kind: "task",
        id: taskId,
        contextId: contextId,
        status: {
          state: "submitted",
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
      };
      eventBus.publish(initialTask);
    }

    const inputs = { messages: [{ role: "user", content: this.convertPartA2AtoLangGraph(userMessage) }] };
    const config = { configurable: { thread_id: contextId } };
    let finalContent = "";
    let weatherAgentStructuredOutput: any = null;
    let finalState: TaskState = "completed";
    const stream = await agent.stream(
      inputs,
      {
        streamMode: "values",
        ...config,
      }
    );

    try {
      for await (const chunk of stream) {
        // State canceled 
        if (this.cancelledTasks.has(taskId)) {
          console.log(
            `[WeatherAgentExecutor] Request cancelled for task ${taskId}`,
          );

          const cancelledUpdate: TaskStatusUpdateEvent = {
            kind: "status-update",
            taskId: taskId,
            contextId: contextId,
            status: {
              state: "canceled",
              timestamp: new Date().toISOString(),
            },
            final: true,
          };
          eventBus.publish(cancelledUpdate);
          return;
        }

        const messages = chunk.messages || [];
        // State failed
        if (messages.length === 0) {
          console.warn(
            `[WeatherAgentExecutor] No valid text messages for task ${taskId}.`
          );
          const failureUpdate: TaskStatusUpdateEvent = {
            kind: "status-update",
            taskId: taskId,
            contextId: contextId,
            status: {
              state: "failed",
              message: {
                kind: "message",
                role: "agent",
                messageId: uuidv4(),
                parts: [{ kind: "text", text: "Tidak ada pesan untuk di proses." }],
                taskId: taskId,
                contextId: contextId,
              },
              timestamp: new Date().toISOString(),
            },
            final: true,
          };
          eventBus.publish(failureUpdate);
          return;
        }
        const lastMessage = messages[messages.length - 1];
        if (lastMessage instanceof AIMessage
          && lastMessage.tool_calls
          && lastMessage.tool_calls.length > 0
        ) {
          // State working-1  
          const workingStatusUpdate1: TaskStatusUpdateEvent = {
            kind: "status-update",
            taskId: taskId,
            contextId: contextId,
            status: {
              state: "working",
              message: {
                kind: "message",
                role: "agent",
                messageId: uuidv4(),
                parts: [{ kind: "text", text: "Mencari tool untuk check data cuaca di kaltim..." }],
                taskId: taskId,
                contextId: contextId,
              },
              timestamp: new Date().toISOString(),
            },
            final: false,
          };
          eventBus.publish(workingStatusUpdate1);
        } else if (lastMessage instanceof ToolMessage) {
          // State working-2 
          const workingStatusUpdate2: TaskStatusUpdateEvent = {
            kind: "status-update",
            taskId: taskId,
            contextId: contextId,
            status: {
              state: "working",
              message: {
                kind: "message",
                role: "agent",
                messageId: uuidv4(),
                parts: [{ kind: "text", text: "Mengambil data cauaca di kaltim..." }],
                taskId: taskId,
                contextId: contextId,
              },
              timestamp: new Date().toISOString(),
            },
            final: false,
          };
          eventBus.publish(workingStatusUpdate2);
        }

        // Catch final content ai message
        if (lastMessage instanceof AIMessage && typeof lastMessage.content === "string") {
          finalContent = lastMessage.content;
        }
        // Catch structured response
        if (chunk.structuredResponse) {
          weatherAgentStructuredOutput = chunk.structuredResponse;
        }
        if (weatherAgentStructuredOutput?.status === "butuh_informasi_tambahan") {
          finalState = "input-required";
        }
        console.log(
          `[WeatherAgentExecutor] Stream finished. Final state: ${finalState}`
        );

        const messageText = weatherAgentStructuredOutput?.content || finalState || "Proses selesai.";
        console.log(
          `[WeatherAgentExecutor] Response: ${messageText} for task ${taskId}`
        );
        const agentMessage: Message = {
          kind: "message",
          role: "agent",
          messageId: uuidv4(),
          parts: [{ kind: "text", text: messageText }],
          taskId: taskId,
          contextId: contextId,
        };
        const finalUpdateStatus: TaskStatusUpdateEvent = {
          kind: "status-update",
          taskId: taskId,
          contextId: contextId,
          status: {
            state: finalState,
            message: agentMessage,
            timestamp: new Date().toISOString(),
          },
          final: true,
        };
        eventBus.publish(finalUpdateStatus);

        console.log(
          `[WeatherAgentExecutor] Task ${taskId} finished with state: completed`
        );
      }
    } catch (err: unknown) {
      console.log(
        `[WeatherAgentExecutor] Error processing task ${taskId}:`,
        err
      );

      const errorMessage = err instanceof Error ? err.message : "Unknow error occurred";
      const errorUpdateStatus: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: taskId,
        contextId: contextId,
        status: {
          state: "failed",
          message: {
            kind: "message",
            role: "agent",
            messageId: uuidv4(),
            parts: [{ kind: "text", text: `Agent error: ${errorMessage}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdateStatus);
    }

  }

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
