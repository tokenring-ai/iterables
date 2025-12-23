import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import type {AgentStateSlice} from "@tokenring-ai/agent/types";
import {IterableSpec} from "../IterableProvider.ts";

export interface StoredIterable {
  name: string;
  type: string;
  spec: IterableSpec;
  createdAt: Date;
  updatedAt: Date;
}

export class IterableState implements AgentStateSlice {
  name = "IterableState";
  iterables: Map<string, StoredIterable> = new Map();

  constructor({iterables = []}: { iterables?: StoredIterable[] } = {}) {
    this.iterables = new Map(iterables.map(i => [i.name, i]));
  }

  reset(what: ResetWhat[]): void {
    // Iterables persist across resets
  }

  serialize(): object {
    return {
      iterables: Array.from(this.iterables.values()),
    };
  }

  deserialize(data: any): void {
    this.iterables = new Map(
      (data.iterables || []).map((i: any) => [
        i.name,
        {
          ...i,
          createdAt: new Date(i.createdAt),
          updatedAt: new Date(i.updatedAt),
        }
      ])
    );
  }

  show(): string[] {
    return [
      `Iterables: ${this.iterables.size}`,
      ...Array.from(this.iterables.values()).map(i => `  - ${i.name} (${i.type})`)
    ];
  }
}
