import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {parseArgs} from "node:util";
import IterableService from "../IterableService.ts";

const description = "/iterable - Manage named iterables";

async function execute(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);

  if (!remainder?.trim()) {
    agent.chatOutput(help)
    return;
  }

  const parts = remainder.trim().split(/\s+/);
  const operation = parts[0];

  switch (operation) {
    case "define": {
      const name = parts[1];
      if (!name || name.startsWith('--')) {
        agent.errorLine("Usage: /iterable define <name> --type <type> [options]");
        return;
      }

      const args = parseArgs({
        args: parts.slice(2),
        options: {
          type: {type: 'string'},
          description: {type: 'string'}
        },
        strict: false,
        allowPositionals: true
      });

      const type = args.values.type as string;
      if (!type) {
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
        args: parts.slice(2),
        options: {
          type: {type: 'string'},
          description: {type: 'string'},
          ...providerConfig.options
        },
        strict: false
      });

      const spec: Record<string, any> = {};
      for (const [key, value] of Object.entries(providerArgs.values)) {
        if (key !== 'type' && key !== 'description') {
          spec[key] = value;
        }
      }

      try {
        await iterableService.define(name, type, spec, args.values.description as string, agent);
        agent.infoLine(`Defined iterable: @${name} (${type})`);
      } catch (error) {
        agent.errorLine(`Failed to define iterable: ${error}`);
      }
      break;
    }

    case "list": {
      const iterables = iterableService.list(agent);
      if (iterables.length === 0) {
        agent.infoLine("No iterables defined");
        return;
      }

      agent.infoLine("Available iterables:");
      iterables.forEach(it => {
        const desc = it.description ? ` - ${it.description}` : "";
        agent.infoLine(`  @${it.name} (${it.type})${desc}`);
      });
      break;
    }

    case "show": {
      const name = parts[1];
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
      if (iterable.description) {
        agent.infoLine(`Description: ${iterable.description}`);
      }
      agent.infoLine(`Created: ${iterable.createdAt.toISOString()}`);
      agent.infoLine(`Updated: ${iterable.updatedAt.toISOString()}`);
      break;
    }

    case "delete": {
      const name = parts[1];
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
      break;
    }

    default:
      agent.chatOutput(help);
      break;
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

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand