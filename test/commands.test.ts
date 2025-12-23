import {Agent} from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import Record from "@tokenring-ai/audio/tools/record";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenRingAgentCommand } from '@tokenring-ai/agent/types';
import {IterableItem, IterableProvider, IterableSpec} from "../IterableProvider";
import IterableService from '../IterableService';
import { parseArgs } from 'node:util';
import commands from '../chatCommands';
import TokenRingApp from "@tokenring-ai/app";

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


    app = createTestingApp()
    agent = createTestingAgent(app);
    iterableService = new IterableService();
    app.addServices(iterableService);

    iterableService.attach(agent);
  });

  describe('Iterable Command (/iterable)', () => {
    it('should show help when no command provided', () => {
      vi.spyOn(agent, 'infoLine');
      commands.iterable.execute('', agent);
      
      expect(agent.infoLine).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle define command with valid arguments', async () => {
      // Mock provider
      const mockProvider = {
        type: 'test',
        description: 'Test provider',
        getArgsConfig: () => ({ options: { count: { type: 'string' } } })
      };
      iterableService.registerProvider('test', mockProvider);
      
      // Mock parseArgs to return proper structure
      const parseArgsMock = vi.fn().mockReturnValue({
        values: { type: 'test', count: '5' },
        positionals: []
      });

      vi.spyOn(iterableService, 'define');
      vi.spyOn(agent, 'infoLine');
      await commands.iterable.execute('define test-iterable --type test --count 5', agent);

      expect(iterableService.define).toHaveBeenCalledWith(
        'test-iterable',
        'test',
        { count: '5' },
        agent
      );
      expect(agent.infoLine).toHaveBeenCalledWith('Defined iterable: @test-iterable (test)');
    });

    it('should handle define command with missing name', async () => {
      vi.spyOn(agent, 'errorLine');
      await commands.iterable.execute('define --type test', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Usage: /iterable define <name> --type <type> [options]');
    });

    it('should handle define command with missing type', async () => {
      vi.spyOn(agent, 'errorLine');
      await commands.iterable.execute('define test-iterable', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Usage: /iterable define <name> --type <type> [options]');
    });

    it('should handle unknown provider type', async () => {
      vi.spyOn(agent, 'errorLine');
      await commands.iterable.execute('define test-iterable --type unknown', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Unknown iterable type: unknown');
    });


    it('should list iterables when present', () => {
      vi.spyOn(agent, 'infoLine');
      iterableService.registerProvider('static', new StaticIterableProvider());
      iterableService.registerProvider('static2', new StaticIterableProvider());
      iterableService.define('item1', 'static', {}, agent);
      iterableService.define('item2', 'static2', {}, agent);

      commands.iterable.execute('list', agent);
      
      expect(agent.infoLine).toHaveBeenCalledWith('Available iterables:');
      expect(agent.infoLine).toHaveBeenCalledWith('  @item1 = static');
      expect(agent.infoLine).toHaveBeenCalledWith('  @item2 = static2');
    });

    it('should show message when no iterables defined', () => {
      vi.spyOn(agent, 'infoLine');
      commands.iterable.execute('list', agent);
      
      expect(agent.infoLine).toHaveBeenCalledWith('No iterables defined');
    });

    it('should show detailed iterable information', () => {
      vi.spyOn(agent, 'infoLine');
      vi.spyOn(agent, 'errorLine');

      iterableService.registerProvider('file', new StaticIterableProvider());
      iterableService.define('test', 'file', { pattern: '**/*.ts' },  agent);

      commands.iterable.execute('show test', agent);

      expect(agent.errorLine).not.toHaveBeenCalled();
      expect(agent.infoLine).toHaveBeenCalledWith('Iterable: @test');
      expect(agent.infoLine).toHaveBeenCalledWith('Type: file');
      expect(agent.infoLine).toHaveBeenCalledWith(expect.stringContaining('Spec:'));
    });

    it('should handle show command with missing name', () => {
      vi.spyOn(agent, 'errorLine');
      commands.iterable.execute('show', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Usage: /iterable show <name>');
    });

    it('should handle show command for non-existent iterable', () => {
      vi.spyOn(agent, 'errorLine');
      vi.spyOn(iterableService, 'get').mockReturnValue(undefined);

      commands.iterable.execute('show nonexistent', agent);

      expect(agent.errorLine).toHaveBeenCalledWith('Iterable not found: @nonexistent');
    });

    it('should delete iterables successfully', () => {
      vi.spyOn(agent, 'infoLine');
      vi.spyOn(iterableService, 'delete').mockReturnValue(true);
      
      commands.iterable.execute('delete test-iterable', agent);
      
      expect(agent.infoLine).toHaveBeenCalledWith('Deleted iterable: @test-iterable');
    });

    it('should handle deletion of non-existent iterables', () => {
      vi.spyOn(agent, 'errorLine');
      vi.spyOn(iterableService, 'delete').mockReturnValue(false);
      
      commands.iterable.execute('delete nonexistent', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Iterable not found: @nonexistent');
    });

    it('should handle delete command with missing name', () => {
      vi.spyOn(agent, 'errorLine');
      commands.iterable.execute('delete', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Usage: /iterable delete <name>');
    });

    it('should show help for unknown commands', () => {
      vi.spyOn(agent, 'errorLine');
      commands.iterable.execute('unknown-command', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('Foreach Command (/foreach)', () => {
    it('should show help when no arguments provided', () => {
      vi.spyOn(agent, 'errorLine');
      commands.foreach.execute('', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith(expect.any(String));
    });

    it('should show help when not starting with @', () => {
      vi.spyOn(agent, 'errorLine');
      commands.foreach.execute('test prompt', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Usage: /foreach @<iterable> <prompt>');
    });

    it('should handle missing prompt', () => {
      vi.spyOn(agent, 'errorLine');
      commands.foreach.execute('@test-iterable', agent);
      
      expect(agent.errorLine).toHaveBeenCalledWith('Usage: /foreach @<iterable> <prompt>');
    });
  });

  describe('Command Descriptions', () => {
    it('should have proper descriptions for all commands', () => {
      expect(commands.iterable.description).toContain('/iterable');
      expect(commands.foreach.description).toContain('/foreach');
    });

    it('should have help text for all commands', () => {
      expect(commands.iterable.help).toContain('# /iterable');
      expect(commands.foreach.help).toContain('# /foreach');
    });
  });
});