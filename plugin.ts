import {AgentCommandService} from "@tokenring-ai/agent";
import TokenRingApp from "@tokenring-ai/app";
import {TokenRingPlugin} from "@tokenring-ai/app";
import chatCommands from "./chatCommands.ts";
import IterableService from "./IterableService.js";
import packageJSON from './package.json' with {type: 'json'};


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(chatCommands)
    );
    app.addServices(new IterableService());
  },
} satisfies TokenRingPlugin;
