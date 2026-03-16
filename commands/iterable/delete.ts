import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import IterableService from "../../IterableService.ts";

const inputSchema = {
  args: {},
  positionals: [{
    name: "name",
    description: "The iterable name to delete",
    required: true,
  }],
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({positionals: { name }, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const deleted = agent.requireServiceByType(IterableService).delete(name, agent);
  if (!deleted) throw new CommandFailedError(`Iterable not found: @${name}`);
  return `Deleted iterable: @${name}`;
}

export default {
  name: "iterable delete",
  description: "Delete an iterable",
  inputSchema,
  execute,
  help: `Remove a defined iterable permanently.

## Example

/iterable delete old-projects`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
