import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import {ChatService} from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import IterableService from "../IterableService.ts";

const description = "/foreach - Run a prompt on each item in an iterable";

async function execute(remainder: string, agent: Agent) {
  const iterableService = agent.requireServiceByType(IterableService);

  if (!remainder || !remainder.trim()) {
    agent.chatOutput(help);
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

      const chatService = agent.requireServiceByType(ChatService);
      const chatConfig = chatService.getChatConfig(agent);

      try {
        await runChat(interpolatedPrompt, chatConfig, agent);
      } catch (error) {
        agent.errorLine(`Error processing item ${count}: ${error}`);
      }

      agent.restoreState(checkpoint.state);
    }

    agent.infoLine(`Processed ${count} items`);
  } finally {
    agent.restoreState(checkpoint.state);
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

const help: string = `# /foreach @<iterable> <prompt>

Process each item in an iterable with a custom prompt

## Usage

/foreach @<iterable> <prompt>

## Arguments

- **@<iterable>** - Name of the iterable to process (prefixed with @)
- **<prompt>** - Template prompt to execute for each item

## Prompt Template Variables

- Use {variable} syntax to access item properties
- Use {variable:default} for fallback values
- Support nested access with dot notation: {user.name}

## Examples

/foreach @files "Add comments to {file}"
  # Processes each file in the 'files' iterable
  # {file} contains the file path

/foreach @users "Welcome {name} from {city}"
  # Processes each user in the 'users' iterable
  # {name} and {city} are user properties

/foreach @projects "Review {name}: {description:No description}"
  # Processes each project with fallback for missing descriptions

/foreach @data "Process {nested.value:default}"
  # Access nested properties with fallback

## Common Use Cases

- Code analysis and refactoring across multiple files
- Data processing and transformation
- Content generation for multiple items
- Batch operations on structured data

**Note:** The command maintains checkpoint state between iterations and restores it after processing each item.`;

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand