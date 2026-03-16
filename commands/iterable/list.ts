import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import IterableService from "../../IterableService.ts";

async function execute(_remainder: string, agent: Agent): Promise<string> {
  const iterables = agent.requireServiceByType(IterableService).list(agent);
  if (iterables.length === 0) return "No iterables defined";
  return `Available iterables:\n${markdownList(iterables.map(it => `@${it.name} = ${it.type}`))}`;
}

export default {
  name: "iterable list",
  description: "List all defined iterables",
  help: `# /iterable list

Show all defined iterables with their types.

## Example

/iterable list`,
  execute,
} satisfies TokenRingAgentCommand;
