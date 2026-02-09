import type {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import {IterableSpec} from "../IterableProvider.ts";

export interface StoredIterable {
  name: string;
  type: string;
  spec: IterableSpec;
  createdAt: Date;
  updatedAt: Date;
}

const serializationSchema = z.object({
  iterables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    spec: z.any(),
    createdAt: z.date(),
    updatedAt: z.date()
  }))
});

export class IterableState implements AgentStateSlice<typeof serializationSchema> {
  readonly name = "IterableState";
  serializationSchema = serializationSchema;
  iterables: Map<string, StoredIterable> = new Map();

  constructor({iterables = []}: { iterables?: StoredIterable[] } = {}) {
    this.iterables = new Map(iterables.map(i => [i.name, i]));
  }
  serialize(): z.output<typeof serializationSchema> {
    return {
      iterables: Array.from(this.iterables.values()),
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
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
