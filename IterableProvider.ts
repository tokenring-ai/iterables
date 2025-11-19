import Agent from "@tokenring-ai/agent/Agent";

export interface IterableItem {
  value: any;
  variables: Record<string, any>;
}

export interface IterableSpec {
  [key: string]: any;
}

export interface IterableMetadata {
  name: string;
  type: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IterableProvider {
  readonly type: string;
  readonly description: string;

  getArgsConfig(): { options: Record<string, { type: 'string' | 'boolean', multiple?: boolean }> };

  generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem>;
}
