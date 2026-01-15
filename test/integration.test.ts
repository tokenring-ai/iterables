import Agent from '@tokenring-ai/agent/Agent';
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {IterableItem, IterableProvider, IterableSpec} from '../IterableProvider';
import IterableService from '../IterableService';
import {IterableState} from '../state/iterableState';

class FileIterableProvider implements IterableProvider {
  readonly type = 'file';
  readonly description = 'File-based iterable provider';
  
  getArgsConfig() {
    return {
      options: {
        pattern: { type: 'string' as const },
        directory: { type: 'string' as const },
        recursive: { type: 'boolean' as const }
      }
    };
  }

  async *generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
    const pattern = spec.pattern as string || '*.txt';
    const directory = spec.directory as string || '.';
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    
    for (let i = 0; i < files.length; i++) {
      yield {
        value: `${directory}/${files[i]}`,
        variables: {
          file: `${directory}/${files[i]}`,
          index: i,
          pattern,
          directory
        }
      };
    }
  }
}

class JsonIterableProvider implements IterableProvider {
  readonly type = 'json';
  readonly description = 'JSON file iterable provider';
  
  getArgsConfig() {
    return {
      options: {
        file: { type: 'string' as const },
        arrayPath: { type: 'string' as const }
      }
    };
  }
  
  async *generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
    const file = spec.file as string || 'data.json';
    const arrayPath = spec.arrayPath as string || 'items';
    const items = [
      { id: 1, name: 'Item 1', value: 'value1' },
      { id: 2, name: 'Item 2', value: 'value2' },
      { id: 3, name: 'Item 3', value: 'value3' }
    ];
    
    for (let i = 0; i < items.length; i++) {
      yield {
        value: items[i],
        variables: {
          item: items[i],
          index: i,
          file,
          arrayPath
        }
      };
    }
  }
}

describe('Integration Tests', () => {
  let service: IterableService;
  let app: TokenRingApp;
  let agent: Agent;
  let fileProvider: FileIterableProvider;
  let jsonProvider: JsonIterableProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    app = createTestingApp();
    agent = createTestingAgent(app);
    
    service = new IterableService();
    app.addServices(service);

    service.attach(agent);
    
    fileProvider = new FileIterableProvider();
    jsonProvider = new JsonIterableProvider();

    service.registerProvider('file', fileProvider);
    service.registerProvider('json', jsonProvider);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Iterable Workflow', () => {
    it('should handle full lifecycle from definition to generation', async () => {
      // Register providers
      service.registerProvider('file', fileProvider);
      service.registerProvider('json', jsonProvider);

      // Define iterables
      await service.define('files', 'file', {
        pattern: '*.ts',
        directory: 'src'
      }, agent);

      await service.define('items', 'json', {
        file: 'items.json',
        arrayPath: 'data'
      }, agent);

      // Verify definition
      const filesIterable = service.get('files', agent);
      const itemsIterable = service.get('items', agent);

      expect(filesIterable?.name).toBe('files');
      expect(filesIterable?.type).toBe('file');
      expect(itemsIterable?.name).toBe('items');
      expect(itemsIterable?.type).toBe('json');

      // Test generation
      const fileItems = [];
      for await (const item of service.generate('files', agent)) {
        fileItems.push(item);
      }

      expect(fileItems).toHaveLength(3);
      expect(fileItems[0].value).toBe('src/file1.txt');

      const itemItems = [];
      for await (const item of service.generate('items', agent)) {
        itemItems.push(item);
      }

      expect(itemItems).toHaveLength(3);
      expect(itemItems[0].value).toEqual({ id: 1, name: 'Item 1', value: 'value1' });

      // Test listing
      const iterables = service.list(agent);
      expect(iterables).toHaveLength(2);

      // Test deletion
      const deleted = service.delete('files', agent);
      expect(deleted).toBe(true);

      const remaining = service.list(agent);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('items');
    });

    it('should handle error scenarios gracefully', async () => {
      service.registerProvider('file', fileProvider);
      await service.attach(agent);

      // Try to generate non-existent iterable
      await expect(async () => {
        for await (const _ of service.generate('nonexistent', agent)) {
          // Should not reach here
        }
      }).rejects.toThrow('Iterable not found: nonexistent');

      // Try to define with unknown provider
      await expect(
        service.define('test', 'unknown', {}, undefined, agent)
      ).rejects.toThrow('Unknown iterable type: unknown');

      // Try to delete non-existent iterable
      const result = service.delete('nonexistent', agent);
      expect(result).toBe(false);
    });
  });

  describe('State Persistence Integration', () => {
    it('should maintain state across operations', () => {
      agent.mutateState(IterableState, state => {
        state.iterables.clear();
        state.iterables.set('persisted', {
          name: 'persisted',
          type: 'file',
          spec: {pattern: '*.js'},
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      // Verify state persistence
      const iterables = service.list(agent);
      expect(iterables).toHaveLength(1);
      expect(iterables[0].name).toBe('persisted');

      // Test serialization/deserialization
      const serialized = agent.getState(IterableState).serialize();
      expect(serialized.iterables).toHaveLength(1);

      const newState = new IterableState();
      newState.deserialize(serialized);
      
      const reSerialized = newState.serialize();
      expect(reSerialized.iterables[0].name).toBe('persisted');
    });

    it('should handle complex nested specifications', () => {
      const complexSpec = {
        pattern: '**/*.ts',
        exclude: ['node_modules', 'dist'],
        options: {
          recursive: true,
          ignoreCase: false
        },
        nested: {
          deep: {
            config: {
              timeout: 5000
            }
          }
        }
      };

      const state = new IterableState({
        iterables: [{
          name: 'complex',
          type: 'file',
          spec: complexSpec,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const serialized = state.serialize();
      expect(serialized.iterables[0].spec).toEqual(complexSpec);

      const newState = new IterableState();
      newState.deserialize(serialized);
      
      const retrieved = newState.iterables.get('complex');
      expect(retrieved?.spec).toEqual(complexSpec);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent generations', async () => {
      service.registerProvider('file', fileProvider);
      service.registerProvider('json', jsonProvider);
      
      await service.define('files1', 'file', { pattern: '*.ts' },  agent);
      await service.define('files2', 'file', { pattern: '*.js' }, agent);
      await service.define('items1', 'json', { file: 'data1.json' }, agent);

      // Generate from multiple iterables concurrently
      const promises = [
        service.generate('files1', agent),
        service.generate('files2', agent),
        service.generate('items1', agent)
      ];

      const results = await Promise.all(
        promises.map(async (generator) => {
          const items = [];
          for await (const item of generator) {
            items.push(item);
          }
          return items;
        })
      );

      expect(results[0]).toHaveLength(3);
      expect(results[1]).toHaveLength(3);
      expect(results[2]).toHaveLength(3);
    });

    it('should handle large numbers of iterables', async () => {
      service.registerProvider('file', fileProvider);
      
      // Create 50 iterables
      for (let i = 0; i < 50; i++) {
        await service.define(`iterable-${i}`, 'file', { pattern: `pattern-${i}.txt` }, agent);
      }

      const iterables = service.list(agent);
      expect(iterables).toHaveLength(50);

      // Verify each can be retrieved
      for (let i = 0; i < 50; i++) {
        const iterable = service.get(`iterable-${i}`, agent);
        expect(iterable?.name).toBe(`iterable-${i}`);
        expect(iterable?.spec.pattern).toBe(`pattern-${i}.txt`);
      }
    });
  });

  describe('Error Recovery and Cleanup', () => {
    it('should cleanup after generation errors', async () => {
      service.registerProvider('file', fileProvider);
      await service.define('failing', 'file', {}, agent);

      // Mock provider to throw error during generation
      const failingProvider: IterableProvider = {
        type: 'failing',
        description: 'Failing provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* () {
          yield { value: 'before-error', variables: {} };
          throw new Error('Generation failed');
        }
      };

      service.registerProvider('failing', failingProvider);

      // Update the iterable to use failing provider
      service.define('failing', 'failing', {},  agent);

      let errorCaught = false;
      try {
        for await (const _ of service.generate('failing', agent)) {
          // First item should work
        }
      } catch (error) {
        errorCaught = true;
        expect(error.message).toBe('Generation failed');
      }

      expect(errorCaught).toBe(true);

      // Verify service is still functional
      const result = service.delete('failing', agent);
      expect(result).toBe(true);
    });

    it('should handle provider errors during definition', async () => {
      const errorProvider: IterableProvider = {
        type: 'error',
        description: 'Error provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* () {
          yield { value: 'item', variables: {} };
        }
      };

      service.registerProvider('error', errorProvider);

      // This should work fine
      await expect(
        service.define('test', 'error', {},  agent)
      ).resolves.not.toThrow();

      // But getting a non-existent provider should fail
      await expect(
        service.define('test2', 'nonexistent', {}, agent)
      ).rejects.toThrow('Unknown iterable type: nonexistent');
    });
  });
});