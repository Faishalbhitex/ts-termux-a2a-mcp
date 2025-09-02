# ts-termux-a2a-mcp

TypeScript implementation of A2A (Agent-to-Agent) Protocol and MCP (Model Context Protocol) on Termux environment.

## Features

### A2A Implementation
- **Weather Agent**: AI agent for Kalimantan Timur weather information
- **LangGraph Integration**: Using Google Gemini 2.0 Flash model
- **Agent Discovery**: Standardized agent capability discovery
- **Message Exchange**: Context-aware conversation with memory
- **Express Server**: RESTful API with A2A protocol compliance

### Supported Locations
- Samarinda
- Balikpapan
- Bontang

## Quick Start

### Prerequisites
- Node.js 18+
- Google API Key for Gemini

### Installation

```bash
npm install
```

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Google API key:
```bash
GOOGLE_API_KEY=your_google_api_key_here
WEATHER_AGENT_URL=http://0.0.0.0:4000
WEATHER_AGENT_URL_IP=http://YOUR_DEVICE_IP:4000
```

### Running the Weather Agent

**Start Server:**
```bash
npm run a2a:weather-agent
```

**Test Client:**
```bash
npm run a2a:test-client
```

## Network Configuration

This project supports both **local** and **cross-device** testing scenarios:

### Local Development (Same Device)
```bash
WEATHER_AGENT_URL=http://0.0.0.0:4000
```
Use this when running both client and server on the same device.

### Cross-Device Testing (Different Devices)
```bash
WEATHER_AGENT_URL_IP=http://192.168.1.10:4000
```

This is useful when:
- **Dual-phone development**: Server on one phone, client on another
- **Desktop/Mobile testing**: Server on PC, client on mobile device
- **Network testing**: Testing real distributed agent communication

#### Setup for Cross-Device:

1. **Find your server device IP:**
   ```bash
   # On Termux/Linux
   ifconfig wlan0
   # or
   ip addr show wlan0
   ```

2. **Update client environment:**
   ```bash
   # In client device's .env
   WEATHER_AGENT_URL=http://YOUR_SERVER_IP:4000
   ```

3. **Ensure devices are on same WiFi network**

4. **Test connectivity:**
   ```bash
   # From client device
   curl http://YOUR_SERVER_IP:4000/agent-card
   ```

This approach enables real-world testing of A2A protocol across different devices and networks, simulating production deployment scenarios.

## Project Structure

```
src/
├── a2a-ts/
│   ├── client/         # A2A client implementation
│   ├── server/         # A2A server + LangGraph agent
│   └── weatherAgent.ts # Weather agent with tools
└── mcp-ts/
    └── server.ts       # MCP server implementation
```

## Technologies

- **A2A Protocol**: Agent-to-agent communication standard
- **LangGraph**: Multi-agent orchestration framework
- **Google Gemini**: 2.0 Flash model for AI reasoning
- **TypeScript**: Type-safe development
- **Express.js**: Web server framework

## Example Usage

```typescript
// Agent Discovery
const client = await A2AClient.fromCardUrl('http://localhost:4000/agent-card');
const card = await client.getAgentCard();

// Send Message
const response = await client.sendMessage({
  message: {
    messageId: uuidv4(),
    role: "user",
    parts: [{ kind: "text", text: "Bagaimana cuaca di Samarinda?" }],
    kind: "message"
  }
});
```

## Development Workflow

### Dual-Device Development:
1. **Server Device** (HP 1):
   ```bash
   git clone <repo>
   npm install
   npm run a2a:weather-agent
   ```

2. **Client Device** (HP 2):
   ```bash
   git clone <repo>
   npm install
   # Edit .env to use server IP
   npm run a2a:test-client
   ```

3. **Sync changes:**
   ```bash
   git add . && git commit -m "update" && git push
   git pull  # on other device
   ```

## License

MIT
