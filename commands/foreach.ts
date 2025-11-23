import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import runChat from "@tokenring-ai/chat/runChat";
import IterableService from "../IterableService.ts";

const description = "/foreach @<iterable> <prompt> - Run a prompt on each item in an iterable";

async function execute(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);

  if (!remainder || !remainder.trim()) {
    agent.errorLine("Usage: /foreach @<iterable> <prompt>");
    return;
  }

  // Parse: @iterable-name "prompt" or @iterable-name prompt
  const trimmed = remainder.trim();
  if (!trimmed.startsWith('@')) {
    agent.errorLine("Usage: /foreach @<iterable> <prompt>");
    return;
  }

  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace === -1) {
    agent.errorLine("Usage: /foreach @<iterable> <prompt>");
    return;
  }

  const iterableName = trimmed.substring(1, firstSpace);
  const prompt = trimmed.substring(firstSpace + 1).trim().replace(/^["']|["']$/g, '');

  if (!prompt) {
    agent.errorLine("Usage: /foreach @<iterable> <prompt>");
    return;
  }

  const checkpoint = agent.generateCheckpoint();

  try {
    let count = 0;
    for await (const item of iterableService.generate(iterableName, agent)) {
      count++;
      agent.infoLine(`Processing item ${count}...`);

      const interpolatedPrompt = interpolate(prompt, item.variables);

      try {
        await runChat({input: interpolatedPrompt}, agent);
      } catch (error) {
        agent.errorLine(`Error processing item ${count}: ${error}`);
      }

      agent.restoreCheckpoint(checkpoint);
    }

    agent.infoLine(`Processed ${count} items`);
  } finally {
    agent.restoreCheckpoint(checkpoint);
  }
}

function interpolate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{([^}:]+)(?::([^}]*))?\}/g, (match, key, defaultValue) => {
    const value = getNestedProperty(variables, key);
    return value !== undefined ? String(value) : (defaultValue || match);
  });
}

function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

export function help() {
  return [
    "/foreach @<iterable> <prompt>",
    "  - Run a prompt on each item in a named iterable",
    "  - Use {variable} syntax in prompt to interpolate item values",
    '  - Example: /foreach @ts-files "Add comments to {file}"',
  ];
}
export default {
  description,
  execute,
  help,
} as TokenRingAgentCommand