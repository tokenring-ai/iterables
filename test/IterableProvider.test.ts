import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IterableProvider, IterableItem, IterableSpec } from '../IterableProvider';
import Agent from '@tokenring-ai/agent/Agent';

// Mock the agent dependencies
vi.mock('@tokenring-ai/agent/Agent');

describe('IterableProvider Interface', () => {
  let mockAgent: Agent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent = {} as Agent;
  });

  describe('Provider Contract', () => {
    it('should define the required interface properties', () => {
      const provider: IterableProvider = {
        type: 'test',
        description: 'Test provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* () {}
      };

      expect(provider).toHaveProperty('type');
      expect(provider).toHaveProperty('description');
      expect(provider).toHaveProperty('getArgsConfig');
      expect(provider).toHaveProperty('generate');
    });

    it('should have proper method signatures', () => {
      const provider: IterableProvider = {
        type: 'test',
        description: 'Test provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* (spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
          yield { value: 'test', variables: {} };
        }
      };

      expect(typeof provider.getArgsConfig).toBe('function');
      expect(typeof provider.generate).toBe('function');
    });
  });

  describe('IterableItem Structure', () => {
    it('should have value and variables properties', () => {
      const item: IterableItem = {
        value: 'test-value',
        variables: {
          key1: 'value1',
          key2: 42
        }
      };

      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('variables');
      expect(item.value).toBe('test-value');
      expect(item.variables).toEqual({
        key1: 'value1',
        key2: 42
      });
    });

    it('should handle different value types', () => {
      const stringItem: IterableItem = {
        value: 'string-value',
        variables: {}
      };

      const numberItem: IterableItem = {
        value: 42,
        variables: {}
      };

      const objectItem: IterableItem = {
        value: { key: 'value' },
        variables: {}
      };

      expect(stringItem.value).toBe('string-value');
      expect(numberItem.value).toBe(42);
      expect(objectItem.value).toEqual({ key: 'value' });
    });
  });

  describe('IterableSpec Structure', () => {
    it('should handle flexible specification objects', () => {
      const spec: IterableSpec = {
        count: '10',
        pattern: '*.ts',
        source: 'api://data',
        nested: {
          deep: {
            value: 'nested'
          }
        }
      };

      expect(spec).toHaveProperty('count');
      expect(spec).toHaveProperty('pattern');
      expect(spec).toHaveProperty('source');
      expect(spec).toHaveProperty('nested');
      expect(spec.nested.deep.value).toBe('nested');
    });

    it('should handle empty specifications', () => {
      const emptySpec: IterableSpec = {};
      expect(emptySpec).toEqual({});

      const nullSpec: IterableSpec = {};
      expect(nullSpec).toEqual({});
    });
  });

  describe('IterableMetadata Structure', () => {
    it('should define metadata structure', () => {
      const metadata = {
        name: 'test-iterable',
        type: 'file',
        description: 'Test file iterable',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('type');
      expect(metadata).toHaveProperty('createdAt');
      expect(metadata).toHaveProperty('updatedAt');
      expect(metadata.name).toBe('test-iterable');
      expect(metadata.type).toBe('file');
    });
  });

  describe('Provider Implementation Patterns', () => {
    it('should support different argument configurations', () => {
      const stringOptions = {
        options: {
          file: { type: 'string' as const },
          count: { type: 'string' as const }
        }
      };

      const booleanOptions = {
        options: {
          recursive: { type: 'boolean' as const },
          verbose: { type: 'boolean' as const }
        }
      };

      const mixedOptions = {
        options: {
          file: { type: 'string' as const },
          recursive: { type: 'boolean' as const },
          limit: { type: 'string' as const, multiple: true }
        }
      };

      expect(stringOptions.options.file.type).toBe('string');
      expect(booleanOptions.options.verbose.type).toBe('boolean');
      expect(mixedOptions.options.limit.multiple).toBe(true);
    });

    it('should handle generator patterns', async () => {
      let generatorCalled = false;
      const testProvider: IterableProvider = {
        type: 'test',
        description: 'Test provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* (spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
          generatorCalled = true;
          yield { value: 'item1', variables: {} };
          yield { value: 'item2', variables: {} };
        }
      };

      const generator = testProvider.generate({}, mockAgent);
      const items = [];
      
      for await (const item of generator) {
        items.push(item);
      }

      expect(generatorCalled).toBe(true);
      expect(items).toHaveLength(2);
      expect(items[0].value).toBe('item1');
      expect(items[1].value).toBe('item2');
    });
  });

  describe('Error Handling', () => {
    it('should handle generation errors gracefully', async () => {
      const failingProvider: IterableProvider = {
        type: 'failing',
        description: 'Failing provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* () {
          yield { value: 'before-error', variables: {} };
          throw new Error('Generation failed');
        }
      };

      const generator = failingProvider.generate({}, mockAgent);
      
      let errorCaught = false;
      try {
        for await (const item of generator) {
          if (item.value === 'before-error') {
            // First item should work
          } else {
            // Should not reach here due to error
            throw new Error('Should not reach here');
          }
        }
      } catch (error) {
        errorCaught = true;
        expect(error.message).toBe('Generation failed');
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle empty generators', async () => {
      const emptyProvider: IterableProvider = {
        type: 'empty',
        description: 'Empty provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* () {
          // Generator with no yields
        }
      };

      const generator = emptyProvider.generate({}, mockAgent);
      const items = [];
      
      for await (const item of generator) {
        items.push(item);
      }

      expect(items).toHaveLength(0);
    });
  });
});