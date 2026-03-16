import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import IterableService from "../../IterableService.ts";

async function execute(remainder: string, agent: Agent): Promise<string> {
  const name = remainder.trim().split(/\s+/)[0];
  if (!name) throw new CommandFailedError("Usage: /iterable show <name>");
  const iterable = agent.requireServiceByType(IterableService).get(name, agent);
  if (!iterable) throw new CommandFailedError(`Iterable not found: @${name}`);
  return [
    `Iterable: @${iterable.name}`,
    `Type: ${iterable.type}`,
    `Spec: ${JSON.stringify(iterable.spec, null, 2)}`,
    `Created: ${iterable.createdAt.toISOString()}`,
    `Updated: ${iterable.updatedAt.toISOString()}`,
  ].join("\n");
}

export default {
  name: "iterable show",
  description: "Show details of an iterable",
  help: `# /iterable show <name>

Display detailed information about a specific iterable.

## Example

/iterable show files`,
  execute,
} satisfies TokenRingAgentCommand;
