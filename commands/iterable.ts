import Agent from "@tokenring-ai/agent/Agent";
import {parseArgs} from "node:util";
import IterableService from "../IterableService.ts";

export const description = "/iterable [define|list|show|delete] - Manage named iterables";

export async function execute(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);
  
  if (!remainder?.trim()) {
    help().forEach(line => agent.infoLine(line));
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
      help().forEach(line => agent.infoLine(line));
      break;
  }
}

export function help() {
  return [
    "/iterable [define|list|show|delete]",
    "  - define <name> --type <type> [type-specific-options] [--description \"...\"]",
    "  - list: shows all defined iterables",
    "  - show <name>: shows details of an iterable",
    "  - delete <name>: removes an iterable",
  ];
}
