import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand,} from "@tokenring-ai/agent/types";
import IterableService from "../../IterableService.ts";

const inputSchema = {
  args: {},
  positionals: [
    {
      name: "name",
      description: "The iterable name to show",
      required: true,
    },
  ],
} as const satisfies AgentCommandInputSchema;

function execute({
                   positionals: {name},
                   agent,
                 }: AgentCommandInputType<typeof inputSchema>): string {
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
  inputSchema,
  execute,
  help: `Display detailed information about a specific iterable.

## Example

/iterable show files`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
