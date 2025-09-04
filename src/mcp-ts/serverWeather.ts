import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import cors from 'cors';
import { WeatherKaltimTools } from "./weatherTools.js";


const weatherKaltimTools = new WeatherKaltimTools();
const getServer = () => {
  const server = new McpServer(
    {
      name: "weather-kaltim-tools",
      version: "1.0.0",
    },
    { capabilities: { logging: {} } }
  );

  server.registerTool("weatherKaltim",
    {
      title: "Kaltim weather information",
      description: "information weather in Kalimantan Timur (kaltim)",
      inputSchema: {
        city: z.string().describe("Name city in Kaliamantan Timur")
      },
    },
    async ({ city }) => await weatherKaltimTools.getWeatherKaltim(city)
  );

  return server;
}

const app = express();
app.use(express.json());

app.use(cors({
  origin: "*",
  exposedHeader: ['Mcp-Session-Id']
}));

app.post("/mcp/weather/kaltim", async (req: Request, res: Response) => {
  const server = getServer();
  try {
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      console.log("Request closed");
      transport.close();
      server.close();
    });
  } catch (err) {
    console.error("Error handling MCP request:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp/weather/kaltim", async (req: Request, res: Response) => {
  console.log("Recivied GET MCP request");
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete("/mcp/weather/kaltim", async (req: Request, res: Response) => {
  console.log("Recivied DELETE MCP request");
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});


// Start server MCP Weather Kaltim
const PORT = 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, (err) => {
  if (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
  console.log(`MCP Weather Kaltim Stateless Streamable HTTP server listening on http://${HOST}:${PORT}/mcp/weather/kaltim`);
});

// Hnadle server shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  process.exit(0);
});
