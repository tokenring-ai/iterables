import {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import * as chatCommands from "./chatCommands.ts";
import IterableService from "./IterableService.js";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    agentTeam.addChatCommands(chatCommands);
    agentTeam.addServices(new IterableService());
  },
};

export {default as IterableService} from "./IterableService.ts";
export type {IterableProvider, IterableItem, IterableSpec, IterableMetadata} from "./IterableProvider.ts";
