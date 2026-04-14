import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {ChatService} from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import IterableService from "../IterableService.ts";

const description = "Run a prompt on each item in an iterable";

const inputSchema = {
  args: {},
  positionals: [
    {name: "iterable", description: "@<iterable> name", required: true},
  ],
  remainder: {
    name: "prompt",
    description: "Prompt template to run for each item",
    required: true,
  },
} as const satisfies AgentCommandInputSchema;

function interpolate(template: string, variables: Record<string, any>): string {
  return template.replace(
    /\{([^}:]+)(?::([^}]*))?}/g,
    (match, key, defaultValue) => {
      const value = getNestedProperty(variables, key);
      return value !== undefined ? String(value) : defaultValue || match;
    },
  );
}

function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, prop) => current?.[prop], obj);
}

const help: string = `Process each item in an iterable with a custom prompt.

## Usage

/foreach @<iterable> <prompt>

## Example

/foreach @files Add comments to {file}
/foreach @users Welcome {name} from {city}`;

async function execute({
                         positionals,
                         remainder,
                         agent,
                       }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const iterableName = positionals.iterable.replace(/^@/, "");

  const checkpoint = agent.generateCheckpoint();

  try {
    let count = 0;
    for await (const item of iterableService.generate(iterableName, agent)) {
      count++;
      const interpolatedPrompt = interpolate(remainder, item.variables);
      const chatService = agent.requireServiceByType(ChatService);
      const chatConfig = chatService.getChatConfig(agent);
      try {
        await runChat({input: interpolatedPrompt, chatConfig, agent});
      } catch (error: unknown) {
        throw new CommandFailedError(`Error processing item ${count}`, { cause: error as Error },
        );
      }
      agent.restoreState(checkpoint.state);
    }
    return `Processed ${count} items`;
  } finally {
    agent.restoreState(checkpoint.state);
  }
}

export default {
  name: "foreach",
  description,
  inputSchema,
  execute,
  help,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
