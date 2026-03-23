import {Agent} from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {beforeEach, describe, expect, it, vi} from 'vitest';
import commands from '../commands.js';
import {IterableItem, IterableProvider, IterableSpec} from "../IterableProvider.js";
import IterableService from '../IterableService.js';

class StaticIterableProvider implements IterableProvider {
  readonly type = 'static';
  readonly description = 'Static iterable provider';

  getArgsConfig(): { options: Record<string, { type: "string" | "boolean"; multiple?: boolean }> } {
    return {
      options: {}
    }
  }

  async * generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
    yield { value: spec.value, variables: spec.variables};
  }
}

describe('Iterable Commands', () => {
  let app: TokenRingApp;
  let agent: Agent;
  let iterableService: IterableService;

  beforeEach(() => {
    vi.clearAllMocks();

    app = createTestingApp();
    agent = createTestingAgent(app);
    iterableService = new IterableService();
    app.addServices(iterableService);

    iterableService.attach(agent);
  });

  describe('Iterable Define Command', () => {
    it('should handle define command with valid arguments', async () => {
      // Mock provider
      const mockProvider = {
        type: 'test',
        description: 'Test provider',
        getArgsConfig: () => ({ options: {} }),
        generate: async function* () {}
      };
      iterableService.registerProvider('test', mockProvider as IterableProvider);

      // Find the define command
      const defineCommand = commands.find(cmd => cmd.name === 'iterable define');
      const result = await defineCommand!.execute({
        positionals: {name: 'test-iterable'},
        args: {'--type': 'test'},
        remainder: 'count 5',
        agent
      } as any);

      expect(result).toBe('Defined iterable: @test-iterable (test)');
    });

    it('should handle define command with missing name', async () => {
      const defineCommand = commands.find(cmd => cmd.name === 'iterable define');
      
      await expect(async () => {
        await defineCommand!.execute({
          positionals: {},
          args: {'--type': 'test'},
          remainder: '',
          agent
        } as any);
      }).rejects.toThrow();
    });

    it('should handle define command with missing type', async () => {
      const defineCommand = commands.find(cmd => cmd.name === 'iterable define');
      
      await expect(async () => {
        await defineCommand!.execute({
          positionals: {name: 'test'},
          args: {},
          remainder: '',
          agent
        } as any);
      }).rejects.toThrow();
    });

    it('should handle unknown provider type', async () => {
      const defineCommand = commands.find(cmd => cmd.name === 'iterable define');
      
      await expect(async () => {
        await defineCommand!.execute({
          positionals: {name: 'test-iterable'},
          args: {'--type': 'unknown'},
          remainder: '',
          agent
        } as any);
      }).rejects.toThrow('Unknown iterable type: unknown');
    });
  });

  describe('Iterable List Command', () => {
    it('should list iterables when present', () => {
      iterableService.registerProvider('static', new StaticIterableProvider() as any);
      iterableService.registerProvider('static2', new StaticIterableProvider() as any);
      
      // Define iterables directly
      iterableService.define('item1', 'static', {}, agent);
      iterableService.define('item2', 'static2', {}, agent);

      const listCommand = commands.find(cmd => cmd.name === 'iterable list');
      const result = listCommand!.execute({agent} as any);

      return expect(result).resolves.toBe('Available iterables:\n - @item1 = static\n - @item2 = static2');
    });

    it('should show message when no iterables defined', () => {
      const listCommand = commands.find(cmd => cmd.name === 'iterable list');
      const result = listCommand!.execute({agent} as any);

      return expect(result).resolves.toBe('No iterables defined');
    });
  });

  describe('Iterable Show Command', () => {
    it('should show detailed iterable information', async () => {
      iterableService.registerProvider('file', new StaticIterableProvider() as any);
      await iterableService.define('test', 'file', { pattern: '**/*.ts' }, agent);

      const showCommand = commands.find(cmd => cmd.name === 'iterable show');
      const result = await showCommand!.execute({positionals: {name: 'test'}, agent} as any);

      expect(result).toContain('Iterable: @test');
      expect(result).toContain('Type: file');
      expect(result).toContain('Spec:');
    });

    it('should handle show command with missing name', async () => {
      const showCommand = commands.find(cmd => cmd.name === 'iterable show');
      
      await expect(async () => {
        await showCommand!.execute({positionals: {}, agent} as any);
      }).rejects.toThrow();
    });

    it('should handle show command for non-existent iterable', async () => {
      const showCommand = commands.find(cmd => cmd.name === 'iterable show');
      
      await expect(async () => {
        await showCommand!.execute({positionals: {name: 'nonexistent'}, agent} as any);
      }).rejects.toThrow('Iterable not found: @nonexistent');
    });
  });

  describe('Iterable Delete Command', () => {
    it('should delete iterables successfully', async () => {
      // First define an iterable
      iterableService.registerProvider('static', new StaticIterableProvider() as any);
      await iterableService.define('test-iterable', 'static', {}, agent);
      
      const deleteCommand = commands.find(cmd => cmd.name === 'iterable delete');
      const result = await deleteCommand!.execute({positionals: {name: 'test-iterable'}, agent} as any);
      
      expect(result).toBe('Deleted iterable: @test-iterable');
    });

    it('should handle deletion of non-existent iterables', async () => {
      const deleteCommand = commands.find(cmd => cmd.name === 'iterable delete');
      
      await expect(async () => {
        await deleteCommand!.execute({positionals: {name: 'nonexistent'}, agent} as any);
      }).rejects.toThrow('Iterable not found: @nonexistent');
    });

    it('should handle delete command with missing name', async () => {
      const deleteCommand = commands.find(cmd => cmd.name === 'iterable delete');
      
      await expect(async () => {
        await deleteCommand!.execute({positionals: {}, agent} as any);
      }).rejects.toThrow();
    });
  });

  describe('Foreach Command', () => {
    it('should show help when no arguments provided', async () => {
      const foreachCommand = commands.find(cmd => cmd.name === 'foreach');
      
      await expect(async () => {
        await foreachCommand!.execute({positionals: [], remainder: '', agent} as any);
      }).rejects.toThrow();
    });

    it('should handle missing iterable name', async () => {
      const foreachCommand = commands.find(cmd => cmd.name === 'foreach');
      
      await expect(async () => {
        await foreachCommand!.execute({positionals: [], remainder: 'prompt', agent} as any);
      }).rejects.toThrow();
    });

    it('should handle missing prompt', async () => {
      const foreachCommand = commands.find(cmd => cmd.name === 'foreach');
      
      await expect(async () => {
        await foreachCommand!.execute({positionals: ['@test-iterable'], remainder: '', agent} as any);
      }).rejects.toThrow();
    });
  });

  describe('Command Descriptions', () => {
    it('should have proper descriptions for all commands', () => {
      const iterableList = commands.find(cmd => cmd.name === 'iterable list');
      const foreach = commands.find(cmd => cmd.name === 'foreach');
      
      expect(iterableList!.description).toContain('iterables');
      expect(foreach!.description).toContain('Run a prompt');
    });

    it('should have help text for all commands', () => {
      const iterableList = commands.find(cmd => cmd.name === 'iterable list');
      const foreach = commands.find(cmd => cmd.name === 'foreach');
      
      expect(iterableList!.help).toContain('/iterable list');
      expect(foreach!.help).toContain('/foreach');
    });
  });
});
