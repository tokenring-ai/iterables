import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import IterableService from "../../IterableService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

function execute({ agent }: AgentCommandInputType<typeof inputSchema>): string {
  const iterables = agent.requireServiceByType(IterableService).list(agent);
  if (iterables.length === 0) return "No iterables defined";
  return `Available iterables:\n${markdownList(iterables.map(it => `@${it.name} = ${it.type}`))}`;
}

export default {
  name: "iterable list",
  description: "List all defined iterables",
  inputSchema,
  execute,
  help: `Show all defined iterables with their types.

## Example

/iterable list`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
