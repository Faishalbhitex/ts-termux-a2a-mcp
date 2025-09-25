import type { Message } from 'genkit';
import { createInterface } from 'node:readline';
import { ai } from './genkit.js';
import { clientAgentA2A } from './clientAgent.js';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ANSI colors for better terminal output
const COLORS = {
  AGENT: '\x1b[32m',  // Green for agent responses
  PROMPT: '\x1b[36m', // Cyan for prompts  
  ERROR: '\x1b[31m',  // Red for errors
  TOOLS: '\x1b[33m',  // Yellow for tools
  RESET: '\x1b[0m',
};

function printColored(prefix: string, text: string, color: string) {
  console.log(`${color}${prefix}>${COLORS.RESET}`, text);
}

// Get greeting from agent
async function getGreeting() {
  const { text } = await ai.generate(
    'Give a short friendly greeting as an A2A Client Agent that helps users interact with registered agents. Mention you can discover agents and route queries.'
  );
  return text;
}

// Handle streaming response
async function handleChatResponse(
  stream: AsyncIterable<{ text: string }>,
  response: Promise<any>,
  startMessageCount: number
) {
  console.log();
  process.stdout.write(`${COLORS.AGENT}a2a-agent>${COLORS.RESET} `);

  // Stream the response
  for await (const chunk of stream) {
    process.stdout.write(chunk.text);
  }

  // Show tools used
  const toolsUsed = (await response).messages
    .slice(startMessageCount)
    .filter((m: Message) => m.role === 'model')
    .flatMap((m: Message) =>
      m.content
        .filter((p) => !!p.toolRequest)
        .map((p) => `${p.toolRequest?.name}(${JSON.stringify(p.toolRequest?.input)})`)
    )
    .filter((t) => !!t);

  if (toolsUsed.length > 0) {
    console.log(`\n${COLORS.TOOLS}Tools Used:${COLORS.RESET}`, toolsUsed.join(', '));
  }
}

// User input handler
async function handleUserInput(chat: any): Promise<void> {
  return new Promise((resolve) => {
    rl.question(`\n${COLORS.PROMPT}you>${COLORS.RESET} `, async (input) => {
      const cmdExit = ["q", "quit", "exit"];
      if (cmdExit.includes(input.toLowerCase())) {
        console.log('Goodbye!');
        process.exit(0);
      }

      try {
        const startMessageCount = chat.messages.length;
        const { stream, response } = await chat.sendStream(input);
        await handleChatResponse(stream, response, startMessageCount);
        resolve();
      } catch (e) {
        printColored('error', `${e}`, COLORS.ERROR);
        resolve();
      }
    });
  });
}

async function main() {
  const session = ai.createSession({
    initialState: { availableAgents: [] }
  });

  const chat = session.chat(clientAgentA2A);

  const greeting = await getGreeting();
  console.log();
  printColored('a2a-agent', greeting, COLORS.AGENT);
  console.log(`${COLORS.TOOLS}Commands: Type your query, or 'exit'/'quit'/'q' to stop${COLORS.RESET}`);

  while (true) {
    await handleUserInput(chat);
  }
}

setTimeout(main, 0);
