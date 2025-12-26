import {AgentCommandService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import chatCommands from "./chatCommands.ts";
import IterableService from "./IterableService.js";
import packageJSON from './package.json' with {type: 'json'};

const packageConfigSchema = z.object({});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
    app.addServices(new IterableService());
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
