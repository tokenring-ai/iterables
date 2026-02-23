import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import {parseArgs} from "node:util";
import IterableService from "../IterableService.ts";

const description = "/iterable - Manage named iterables";

async function define(remainder: string, agent: Agent): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const parts = remainder.trim().split(/\s+/);
  const name = parts[0];

  if (!name || name.startsWith('--')) {
    throw new CommandFailedError("Usage: /iterable define <name> --type <type> [options]");
  }

  const args = parseArgs({
    args: parts.slice(1),
    options: {
      type: {type: 'string'},
    },
    strict: false,
    allowPositionals: true
  });

  const type = args.values.type;
  if (typeof type !== 'string') {
    throw new CommandFailedError("Usage: /iterable define <name> --type <type> [options]");
  }

  const provider = iterableService.getProvider(type);
  if (!provider) {
    throw new CommandFailedError(`Unknown iterable type: ${type}`);
  }

  const providerConfig = provider.getArgsConfig();
  const providerArgs = parseArgs({
    args: parts.slice(1),
    options: {
      ...providerConfig.options
    },
    strict: false
  });

  const spec: Record<string, any> = {};
  for (const [key, value] of Object.entries(providerArgs.values)) {
    if (key !== 'type') {
      spec[key] = value;
    }
  }

  try {
    await iterableService.define(name, type, spec, agent);
    return `Defined iterable: @${name} (${type})`;
  } catch (error) {
    throw new CommandFailedError(`Failed to define iterable: ${error}`);
  }
}

async function list(remainder: string, agent: Agent): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const iterables = iterableService.list(agent);
  if (iterables.length === 0) {
    return "No iterables defined";
  }

  const iterableItems = iterables.map(it => `@${it.name} = ${it.type}`);
  const lines: string[] = [
    "Available iterables:",
    markdownList(iterableItems)
  ];
  return lines.join("\n");
}

async function show(remainder: string, agent: Agent): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const name = remainder.trim().split(/\s+/)[0];
  if (!name) {
    throw new CommandFailedError("Usage: /iterable show <name>");
  }

  const iterable = iterableService.get(name, agent);
  if (!iterable) {
    throw new CommandFailedError(`Iterable not found: @${name}`);
  }

  const lines: string[] = [];
  lines.push(`Iterable: @${iterable.name}`);
  lines.push(`Type: ${iterable.type}`);
  lines.push(`Spec: ${JSON.stringify(iterable.spec, null, 2)}`);
  lines.push(`Created: ${iterable.createdAt.toISOString()}`);
  lines.push(`Updated: ${iterable.updatedAt.toISOString()}`);
  return lines.join("\n");
}

async function deleteIterable(remainder: string, agent: Agent): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const name = remainder.trim().split(/\s+/)[0];
  if (!name) {
    throw new CommandFailedError("Usage: /iterable delete <name>");
  }

  const deleted = iterableService.delete(name, agent);
  if (deleted) {
    return `Deleted iterable: @${name}`;
  } else {
    throw new CommandFailedError(`Iterable not found: @${name}`);
  }
}

const help: string = `# /iterable - Manage named iterables

Manage named iterables - collections of data that can be processed iteratively

## Usage

/iterable <command> [options]

## Commands

### define <name> --type <type> [options] [--description "..."]

Create a new iterable with specified type and configuration

**Examples:**
/iterable define files --type file --pattern "**/*.ts"
/iterable define projects --type json --file "projects.json" --description "My project list"

### list

Show all defined iterables with their types and descriptions

**Example:**
/iterable list

### show <name>

Display detailed information about a specific iterable

**Example:**
/iterable show files

### delete <name>

Remove a defined iterable permanently

**Example:**
/iterable delete old-projects

## Common iterable types

- **file**: Process files matching patterns
- **json**: Process items from JSON files
- **csv**: Process items from CSV files
- **api**: Process items from API endpoints

**Note:** Use \`/foreach @<iterable> <prompt>\` to process items in an iterable`;

const execute = createSubcommandRouter({
  define,
  list,
  show,
  delete: deleteIterable
});

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand
