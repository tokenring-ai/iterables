import {AgentCommandService} from "@tokenring-ai/agent";
import type {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import agentCommands from "./commands.ts";
import IterableService from "./IterableService.ts";
import packageJSON from "./package.json" with {type: "json"};

const packageConfigSchema = z.object({});

export default {
  name: packageJSON.name,
  displayName: "Batch Iterables",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, _config) {
    app.waitForService(AgentCommandService, (agentCommandService) =>
      agentCommandService.addAgentCommands(agentCommands),
    );
    app.addServices(new IterableService());
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
