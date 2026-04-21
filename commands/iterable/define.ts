import { parseArgs } from "node:util";
import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import IterableService from "../../IterableService.ts";

const inputSchema = {
  args: {
    type: {
      type: "string",
      required: true,
      description: "The iterable type",
    },
  },
  positionals: [
    {
      name: "name",
      description: "Name for the iterable",
      required: true,
    },
  ],
  remainder: { name: "options", description: "Options for the iterable" },
} as const satisfies AgentCommandInputSchema;

async function execute({ positionals: { name }, remainder, args, agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const type = args.type;

  const provider = iterableService.getProvider(type);
  if (!provider) throw new CommandFailedError(`Unknown iterable type: ${type}`);

  const parts = remainder?.split(/\s+/) ?? [];
  const providerArgs = parseArgs({
    args: parts,
    options: { ...provider.getArgsConfig().options },
    strict: false,
  });

  try {
    await iterableService.define(name, type, providerArgs.values, agent);
    return `Defined iterable: @${name} (${type})`;
  } catch (error: unknown) {
    throw new CommandFailedError("Failed to define iterable:", { cause: error as Error });
  }
}

export default {
  name: "iterable define",
  description: "/iterable define - Create a new iterable",
  help: `# /iterable define <name> --type <type> [options]

Create a new named iterable with the specified type and configuration.

## Example

/iterable define files --type file --pattern "**/*.ts"
/iterable define projects --type json --file "projects.json"`,
  execute,
  inputSchema,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
