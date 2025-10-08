# A2A + MCP Multi-Agent System

Implementasi eksperimental **Agent-to-Agent (A2A) Protocol** dengan **Model Context Protocol (MCP)** menggunakan TypeScript, LangGraph, dan Genkit.

> ⚠️ **Status: MVP/Experimental** - Project ini adalah proof-of-concept untuk learning dan eksperimen dengan protokol A2A dan MCP terbaru.

## 🌟 Fitur Utama

### A2A Implementation
- **Agent Discovery**: Registry terpusat untuk menemukan agent yang tersedia
- **Multi-turn Conversations**: Manajemen context dan state preservation
- **Streaming Support**: Real-time progress updates via Server-Sent Events
- **Protocol Compliance**: Mengikuti spesifikasi A2A v0.3.0

### MCP Implementation  
- **Streamable HTTP Transport**: Implementasi MCP protocol terbaru (bukan SSE)
- **Stateless Design**: Setiap request independen untuk skalabilitas
- **Tool Integration**: Weather tools via MCP untuk agent consumption

### Genkit Orchestrator
- **Intelligent Routing**: Agent client yang mengorkestrasi komunikasi dengan multiple agents
- **Context Management**: Multi-turn conversation dengan memory preservation
- **Natural Language Interface**: CLI interaktif dengan Gemini 2.0 Flash

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│              User (Terminal CLI)                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│    Genkit A2A Client Agent (Orchestrator)               │
│    - Discovery agents                                   │
│    - Health checks                                      │
│    - Route & manage conversations                       │
└────────────────┬────────────────────────────────────────┘
                 │ A2A Protocol
                 ▼
┌─────────────────────────────────────────────────────────┐
│         Agent Registry (Go + SQLite)                    │
│         - Agent registration                            │
│         - Discovery endpoint                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│      Weather Agent Server (A2A + LangGraph)             │
│      - Task lifecycle management                        │
│      - Context preservation                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│      MCP Weather Server (Streamable HTTP)               │
│      - Weather data untuk Kaltim                        │
│      - Dummy data (Samarinda, Balikpapan, dll)         │
└─────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- **Node.js**: v18 atau lebih baru
- **Go**: v1.25+ (untuk agent registry)
- **Google API Key**: Untuk Gemini 2.0 Flash model
- **Git**: Untuk clone repositories

## 🚀 Setup & Installation

### 1. Clone Repository Utama

```bash
git clone https://github.com/Faishalbhitex/ts-termux-a2a-mcp.git
cd ts-termux-a2a-mcp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit file `.env`:

```bash
# Google Gemini API Key
# Dapatkan dari: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_api_key_here

# A2A Server Agent URLs
WEATHER_AGENT_URL=http://0.0.0.0:4000

# MCP Server Configuration
MCP_WEATHER_KALTIM_URL=http://0.0.0.0:3000/mcp/weather/kaltim

# Agent Registry (Go Service)
AGENT_REGISTER_URL=http://localhost:8080
```

### 4. Setup Agent Registry (Separate Repository)

Agent Registry adalah service terpisah yang ditulis dalam Go.

```bash
# Di direktori terpisah
cd ..
git clone https://github.com/Faishalbhitex/agent-register-go.git
cd agent-register-go

# Install dependencies
go mod tidy

# Buat database (otomatis saat pertama run)
# agents.db akan dibuat secara otomatis
```

## 🎯 Running the System

Sistem ini membutuhkan **4 services** yang running bersamaan. Buka 4 terminal terpisah:

### Terminal 1: MCP Weather Server

```bash
npm run mcp:weather
```

Output expected:
```
MCP Weather Kaltim Stateless Streamable HTTP server listening on http://0.0.0.0:3000/mcp/weather/kaltim
```

### Terminal 2: A2A Weather Agent Server

```bash
npm run a2a:weather-agent
```

Output expected:
```
Weather agent server started on http://0.0.0.0:4000
```

### Terminal 3: Agent Registry (Go Service)

```bash
# Di direktori agent-register-go
go run main.go
```

Output expected:
```
Agent register service started on http://localhost:8080
```

### Terminal 4: Register Agent & Start CLI

**Register Weather Agent ke Registry:**

```bash
curl -X POST http://localhost:8080/agents \
  -H "Content-Type: application/json" \
  -d '{"url": "http://0.0.0.0:4000"}'
```

Response:
```json
{
  "message": "Agent registered successfully",
  "agent": {
    "id": 1,
    "name": "Weather Agent",
    "skills": ["cuaca", "kaltim", "samarinda"],
    "description": "Agent Cuaca di wilayah indonesia bagian kaltim",
    "url": "http://0.0.0.0:4000"
  }
}
```

**Start A2A Client CLI:**

```bash
npm run a2a:client-agent-cli
```

## 💬 Contoh Interaksi

```
a2a-agent> Hi there! 👋 I'm your A2A Orchestrator Agent...

you> hai, apa kemampuan kamu?

a2a-agent> Saya adalah orchestrator yang menghubungkan Anda dengan agen spesialis.
Biarkan saya periksa agen apa saja yang tersedia...

Saat ini tersedia:
• Weather Agent - Informasi cuaca Kalimantan Timur

Ada yang bisa saya bantu?

you> bagaimana cuaca di samarinda?

a2a-agent> Saya akan hubungkan Anda dengan Weather Agent...
Cuaca di Samarinda saat ini cerah dengan suhu 32°C.

you> bagaimana di bontang?

a2a-agent> Cuaca di Bontang hujan ringan dengan suhu 27°C - 
berbeda dengan Samarinda yang cerah.

you> exit
```

## 🧪 Testing

### Test A2A Client Tools

```bash
npm run a2a:client-tools
```

Test ini akan:
1. Discover agents dari registry
2. Check health status
3. Send message ke weather agent
4. Test multi-turn conversation

### Test Direct A2A Client

```bash
npm run a2a:client-test
```

Test low-level A2A protocol tanpa orchestrator.

## 📁 Struktur Project

```
ts-termux-a2a-mcp/
├── src/
│   ├── a2a-ts/
│   │   ├── client/
│   │   │   ├── clientA2aTools.ts      # Core A2A client logic
│   │   │   ├── clientAgent.ts         # Genkit orchestrator prompt
│   │   │   ├── genkitA2aTools.ts      # Genkit tool definitions
│   │   │   ├── terminal.ts            # Interactive CLI
│   │   │   ├── testClient.ts          # A2A protocol tests
│   │   │   └── testClientA2aTools.ts  # Client tools tests
│   │   └── server/
│   │       └── weather-agent/
│   │           ├── weatherAgent.ts         # LangGraph agent
│   │           └── weatherAgentServer.ts   # A2A server
│   └── mcp-ts/
│       ├── serverWeather.ts           # MCP Streamable HTTP server
│       └── weatherTools.ts            # Weather data & tools
├── .env.example                       # Environment template
├── package.json
└── README.md
```

## 🛠️ Tech Stack

### Protocols & Standards
- **A2A Protocol v0.3.0**: Agent-to-agent communication
- **MCP Streamable HTTP**: Tool/resource access protocol
- **Well-Known URI**: Agent discovery via `/.well-known/agent-card.json`

### AI Frameworks
- **LangGraph**: Agent orchestration & state management
- **Genkit**: Google's AI framework untuk tool calling
- **Google Gemini 2.0 Flash**: LLM untuk reasoning

### Backend
- **TypeScript**: Type-safe development
- **Express.js**: Web server untuk A2A & MCP
- **Go + SQLite**: Agent registry service
- **Zod**: Schema validation

### Libraries
- `@a2a-js/sdk`: Official A2A JavaScript SDK
- `@modelcontextprotocol/sdk`: Official MCP SDK
- `@langchain/langgraph`: LangGraph framework
- `@genkit-ai/google-genai`: Genkit Google AI plugin

## 🎓 Konsep Penting

### A2A Task Lifecycle

```
submitted → working → working → completed
                         ↓
                   input-required
```

- **submitted**: Task baru diterima
- **working**: Agent sedang proses
- **input-required**: Butuh info tambahan dari user
- **completed**: Task selesai
- **failed/canceled/rejected**: Task terminated

### Multi-turn Context Management

**ContextId**: Preserves conversation memory
**TaskId**: Tied to specific task execution

**Rules:**
- First message: No IDs (server generates)
- Active task (input-required): Use both IDs
- Completed task, same topic: Use contextId only
- New topic: No IDs (fresh start)

### MCP Streamable HTTP

MCP terbaru menggunakan **single endpoint** (`/mcp`) dibanding dual-endpoint SSE approach lama:

```
Old (SSE):  /sse + /sse/messages
New (HTTP): /mcp (bidirectional)
```

Benefits:
- Simpler connection model
- Better error handling
- Dynamic upgrade untuk streaming
- Stateless design

## ⚠️ Known Limitations (MVP)

- ❌ No authentication/authorization
- ❌ No data persistence (in-memory only untuk agent)
- ❌ No retry logic untuk failed requests
- ❌ No rate limiting
- ❌ Weather data adalah dummy (hardcoded)
- ❌ Single registry (no federation)
- ❌ No conversation history persistence
- ❌ Minimal error handling

## 🔮 Future Enhancements

- [ ] Add authentication via OAuth 2.0
- [ ] Real weather API integration
- [ ] Conversation history persistence
- [ ] Multiple agent types (calculator, translator, etc.)
- [ ] Web UI dashboard
- [ ] Agent health monitoring & metrics
- [ ] Retry logic dengan exponential backoff
- [ ] Rate limiting & request throttling
- [ ] Federation support untuk multi-registry

## 🐛 Troubleshooting

### Agent Registry Connection Failed
```bash
# Pastikan Go service running
curl http://localhost:8080/health

# Restart jika perlu
cd agent-register-go
go run main.go
```

### Weather Agent Offline
```bash
# Check agent running
curl http://0.0.0.0:4000/.well-known/agent-card.json

# Restart jika perlu
npm run a2a:weather-agent
```

### MCP Connection Failed
```bash
# Check MCP server
curl http://0.0.0.0:3000/mcp/weather/kaltim

# Restart
npm run mcp:weather
```

### "Task is in terminal state" Error

Error ini terjadi saat mencoba reuse taskId yang sudah completed. Agent seharusnya auto-recovery, tapi jika persist:

- Restart CLI: `npm run a2a:client-agent-cli`
- Mulai fresh conversation tanpa contextId lama

## 📚 Resources

### Protocols
- [A2A Protocol Spec](https://a2aproject.github.io/A2A/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Streamable HTTP Blog](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)

### Frameworks
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [Genkit Docs](https://firebase.google.com/docs/genkit)
- [Gemini API](https://ai.google.dev/)

### SDKs
- [A2A JavaScript SDK](https://github.com/a2aproject/a2a-js)
- [A2A Go SDK](https://github.com/a2aproject/a2a-go)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## 👤 Author

**Faishal**
- GitHub: [@Faishalbhitex](https://github.com/Faishalbhitex)
- Project: Experimental A2A + MCP Implementation

## 📄 License

MIT License - Feel free to use this for learning and experimentation.

## 🙏 Acknowledgments

- Google untuk A2A Protocol specification
- Anthropic untuk MCP Protocol
- LangChain untuk LangGraph framework
- Community contributors di A2A & MCP discussions

---

**Note**: Project ini adalah proof-of-concept untuk learning purposes. Tidak recommended untuk production use tanpa proper security, error handling, dan testing.
