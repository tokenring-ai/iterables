import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import {parseArgs} from "node:util";
import IterableService from "../IterableService.ts";

const description = "/iterable - Manage named iterables";

async function define(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);
  const parts = remainder.trim().split(/\s+/);
  const name = parts[0];

  if (!name || name.startsWith('--')) {
    agent.errorLine("Usage: /iterable define <name> --type <type> [options]");
    return;
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
    agent.errorLine("Usage: /iterable define <name> --type <type> [options]");
    return;
  }

  const provider = iterableService.getProvider(type);
  if (!provider) {
    agent.errorLine(`Unknown iterable type: ${type}`);
    return;
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
    agent.infoLine(`Defined iterable: @${name} (${type})`);
  } catch (error) {
    agent.errorLine(`Failed to define iterable: ${error}`);
  }
}

async function list(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);
  const iterables = iterableService.list(agent);
  if (iterables.length === 0) {
    agent.infoLine("No iterables defined");
    return;
  }

  agent.infoLine("Available iterables:");
  iterables.forEach(it => {
    agent.infoLine(`  @${it.name} = ${it.type}`);
  });
}

async function show(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);
  const name = remainder.trim().split(/\s+/)[0];
  if (!name) {
    agent.errorLine("Usage: /iterable show <name>");
    return;
  }

  const iterable = iterableService.get(name, agent);
  if (!iterable) {
    agent.errorLine(`Iterable not found: @${name}`);
    return;
  }

  agent.infoLine(`Iterable: @${iterable.name}`);
  agent.infoLine(`Type: ${iterable.type}`);
  agent.infoLine(`Spec: ${JSON.stringify(iterable.spec, null, 2)}`);
  agent.infoLine(`Created: ${iterable.createdAt.toISOString()}`);
  agent.infoLine(`Updated: ${iterable.updatedAt.toISOString()}`);
}

async function deleteIterable(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);
  const name = remainder.trim().split(/\s+/)[0];
  if (!name) {
    agent.errorLine("Usage: /iterable delete <name>");
    return;
  }

  const deleted = iterableService.delete(name, agent);
  if (deleted) {
    agent.infoLine(`Deleted iterable: @${name}`);
  } else {
    agent.errorLine(`Iterable not found: @${name}`);
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