import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {parseArgs} from "node:util";
import IterableService from "../../IterableService.ts";

async function execute(remainder: string, agent: Agent): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const parts = remainder.trim().split(/\s+/);
  const name = parts[0];
  if (!name || name.startsWith('--')) throw new CommandFailedError("Usage: /iterable define <name> --type <type> [options]");
  const args = parseArgs({ args: parts.slice(1), options: { type: {type: 'string'} }, strict: false, allowPositionals: true });
  const type = args.values.type;
  if (typeof type !== 'string') throw new CommandFailedError("Usage: /iterable define <name> --type <type> [options]");
  const provider = iterableService.getProvider(type);
  if (!provider) throw new CommandFailedError(`Unknown iterable type: ${type}`);
  const providerArgs = parseArgs({ args: parts.slice(1), options: { ...provider.getArgsConfig().options }, strict: false });
  const spec: Record<string, any> = {};
  for (const [key, value] of Object.entries(providerArgs.values)) {
    if (key !== 'type') spec[key] = value;
  }
  try {
    await iterableService.define(name, type, spec, agent);
    return `Defined iterable: @${name} (${type})`;
  } catch (error) {
    throw new CommandFailedError(`Failed to define iterable: ${error}`);
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
} satisfies TokenRingAgentCommand;
