import {Agent} from "@tokenring-ai/agent";
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import Record from "@tokenring-ai/audio/tools/record";
import {beforeEach, describe, expect, it, vi} from 'vitest';
import commands from '../chatCommands';
import {IterableItem, IterableProvider, IterableSpec} from "../IterableProvider";
import IterableService from '../IterableService';

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
      vi.spyOn(agent, 'infoMessage');
      commands.iterable.execute('', agent);
      
      expect(agent.infoMessage).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle define command with valid arguments', async () => {
      // Mock provider
      const mockProvider = {
        type: 'test',
        description: 'Test provider',
      };
      iterableService.registerProvider('test', mockProvider);

      vi.spyOn(iterableService, 'define');
      vi.spyOn(agent, 'infoMessage');
      await commands.iterable.execute('define test-iterable --type test --count 5', agent);

      expect(iterableService.define).toHaveBeenCalledWith(
        'test-iterable',
        'test',
        { count: '5' },
        agent
      );
      expect(agent.infoMessage).toHaveBeenCalledWith('Defined iterable: @test-iterable (test)');
    });

    it('should handle define command with missing name', async () => {
      vi.spyOn(agent, 'errorMessage');
      await commands.iterable.execute('define --type test', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Usage: /iterable define <name> --type <type> [options]');
    });

    it('should handle define command with missing type', async () => {
      vi.spyOn(agent, 'errorMessage');
      await commands.iterable.execute('define test-iterable', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Usage: /iterable define <name> --type <type> [options]');
    });

    it('should handle unknown provider type', async () => {
      vi.spyOn(agent, 'errorMessage');
      await commands.iterable.execute('define test-iterable --type unknown', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Unknown iterable type: unknown');
    });


    it('should list iterables when present', () => {
      vi.spyOn(agent, 'infoMessage');
      iterableService.registerProvider('static', new StaticIterableProvider());
      iterableService.registerProvider('static2', new StaticIterableProvider());
      iterableService.define('item1', 'static', {}, agent);
      iterableService.define('item2', 'static2', {}, agent);

      commands.iterable.execute('list', agent);
      
      expect(agent.infoMessage).toHaveBeenCalledWith('Available iterables:\n  @item1 = static\n  @item2 = static2');
    });

    it('should show message when no iterables defined', () => {
      vi.spyOn(agent, 'infoMessage');
      commands.iterable.execute('list', agent);
      
      expect(agent.infoMessage).toHaveBeenCalledWith('No iterables defined');
    });

    it('should show detailed iterable information', () => {
      vi.spyOn(agent, 'infoMessage');
      vi.spyOn(agent, 'errorMessage');

      iterableService.registerProvider('file', new StaticIterableProvider());
      iterableService.define('test', 'file', { pattern: '**/*.ts' },  agent);

      commands.iterable.execute('show test', agent);

      expect(agent.errorMessage).not.toHaveBeenCalled();
      expect(agent.infoMessage).toHaveBeenCalledWith(expect.stringContaining('Iterable: @test'));
      expect(agent.infoMessage).toHaveBeenCalledWith(expect.stringContaining('Type: file'));
      expect(agent.infoMessage).toHaveBeenCalledWith(expect.stringContaining('Spec:'));
    });

    it('should handle show command with missing name', () => {
      vi.spyOn(agent, 'errorMessage');
      commands.iterable.execute('show', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Usage: /iterable show <name>');
    });

    it('should handle show command for non-existent iterable', () => {
      vi.spyOn(agent, 'errorMessage');
      vi.spyOn(iterableService, 'get').mockReturnValue(undefined);

      commands.iterable.execute('show nonexistent', agent);

      expect(agent.errorMessage).toHaveBeenCalledWith('Iterable not found: @nonexistent');
    });

    it('should delete iterables successfully', () => {
      vi.spyOn(agent, 'infoMessage');
      vi.spyOn(iterableService, 'delete').mockReturnValue(true);
      
      commands.iterable.execute('delete test-iterable', agent);
      
      expect(agent.infoMessage).toHaveBeenCalledWith('Deleted iterable: @test-iterable');
    });

    it('should handle deletion of non-existent iterables', () => {
      vi.spyOn(agent, 'errorMessage');
      vi.spyOn(iterableService, 'delete').mockReturnValue(false);
      
      commands.iterable.execute('delete nonexistent', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Iterable not found: @nonexistent');
    });

    it('should handle delete command with missing name', () => {
      vi.spyOn(agent, 'errorMessage');
      commands.iterable.execute('delete', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Usage: /iterable delete <name>');
    });

    it('should show help for unknown commands', () => {
      vi.spyOn(agent, 'errorMessage');
      commands.iterable.execute('unknown-command', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('Foreach Command (/foreach)', () => {
    it('should show help when no arguments provided', () => {
      vi.spyOn(agent, 'errorMessage');
      commands.foreach.execute('', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith(expect.any(String));
    });

    it('should show help when not starting with @', () => {
      vi.spyOn(agent, 'errorMessage');
      commands.foreach.execute('test prompt', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Usage: /foreach @<iterable> <prompt>');
    });

    it('should handle missing prompt', () => {
      vi.spyOn(agent, 'errorMessage');
      commands.foreach.execute('@test-iterable', agent);
      
      expect(agent.errorMessage).toHaveBeenCalledWith('Usage: /foreach @<iterable> <prompt>');
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