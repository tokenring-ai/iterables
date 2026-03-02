import Agent from "@tokenring-ai/agent/Agent";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import IterableService from "../../IterableService.ts";

async function execute(remainder: string, agent: Agent): Promise<string> {
  const name = remainder.trim().split(/\s+/)[0];
  if (!name) throw new CommandFailedError("Usage: /iterable delete <name>");
  const deleted = agent.requireServiceByType(IterableService).delete(name, agent);
  if (!deleted) throw new CommandFailedError(`Iterable not found: @${name}`);
  return `Deleted iterable: @${name}`;
}

export default {
  name: "iterable delete",
  description: "/iterable delete - Delete an iterable",
  help: `# /iterable delete <name>

Remove a defined iterable permanently.

## Example

/iterable delete old-projects`,
  execute,
} satisfies TokenRingAgentCommand;
