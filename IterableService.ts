import Agent from "@tokenring-ai/agent/Agent";

import {TokenRingService} from "@tokenring-ai/app/types";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import type {IterableItem, IterableProvider, IterableSpec} from "./IterableProvider.ts";
import {IterableState, StoredIterable} from "./state/iterableState.ts";

export default class IterableService implements TokenRingService {
  name = "IterableService";
  description = "Manages named iterables for batch operations";

  private providers = new KeyedRegistry<IterableProvider>();
  registerProvider = this.providers.register;
  getProvider = this.providers.getItemByName;

  async attach(agent: Agent): Promise<void> {
    agent.initializeState(IterableState, {});
  }

  async define(name: string, type: string, spec: IterableSpec, description: string | undefined, agent: Agent): Promise<void> {
    const provider = this.providers.getItemByName(type);
    if (!provider) {
      throw new Error(`Unknown iterable type: ${type}`);
    }

    const now = new Date();
    const iterable: StoredIterable = {
      name,
      type,
      spec,
      description,
      createdAt: now,
      updatedAt: now,
    };

    agent.mutateState(IterableState, (state: IterableState) => {
      state.iterables.set(name, iterable);
    });
  }

  get(name: string, agent: Agent): StoredIterable | undefined {
    const state = agent.getState(IterableState);
    return state.iterables.get(name);
  }

  list(agent: Agent): StoredIterable[] {
    const state = agent.getState(IterableState);
    return Array.from(state.iterables.values());
  }

  delete(name: string, agent: Agent): boolean {
    const state = agent.getState(IterableState);
    if (!state.iterables.has(name)) {
      return false;
    }

    agent.mutateState(IterableState, (state: IterableState) => {
      state.iterables.delete(name);
    });

    return true;
  }

  async* generate(name: string, agent: Agent): AsyncGenerator<IterableItem> {
    const iterable = this.get(name, agent);
    if (!iterable) {
      throw new Error(`Iterable not found: ${name}`);
    }

    const provider = this.providers.getItemByName(iterable.type);
    if (!provider) {
      throw new Error(`Provider not found for type: ${iterable.type}`);
    }

    yield* provider.generate(iterable.spec, agent);
  }
}
