import {beforeEach, describe, expect, it, vi} from 'vitest';
import {IterableState, StoredIterable} from '../state/iterableState';

// Mock the agent dependencies
vi.mock('@tokenring-ai/agent/AgentEvents');
vi.mock('@tokenring-ai/agent/types');

describe('IterableState', () => {
  let state: IterableState;
  let mockIterables: StoredIterable[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockIterables = [
      {
        name: 'files',
        type: 'file',
        spec: { pattern: '**/*.ts' },
        description: 'TypeScript files',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        name: 'users',
        type: 'json',
        spec: { file: 'users.json' },
        description: 'User data',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      }
    ];
  });

  describe('State Management', () => {
    it('should initialize with empty iterables by default', () => {
      state = new IterableState();
      expect(state.name).toBe('IterableState');
      expect(state.iterables.size).toBe(0);
    });

    it('should initialize with provided iterables', () => {
      state = new IterableState({ iterables: mockIterables });
      expect(state.iterables.size).toBe(2);
      expect(state.iterables.get('files')?.name).toBe('files');
      expect(state.iterables.get('users')?.name).toBe('users');
    });

    it('should handle single iterable initialization', () => {
      const singleIterable = [mockIterables[0]];
      state = new IterableState({ iterables: singleIterable });
      expect(state.iterables.size).toBe(1);
      expect(state.iterables.get('files')?.type).toBe('file');
    });
  });

  describe('Persistence', () => {
    beforeEach(() => {
      state = new IterableState({ iterables: mockIterables });
    });

    it('should serialize state correctly', () => {
      const serialized = state.serialize();
      
      expect(serialized).toHaveProperty('iterables');
      expect(serialized.iterables).toHaveLength(2);
      
      const serializedIterables = serialized.iterables as any[];
      expect(serializedIterables[0]).toHaveProperty('name');
      expect(serializedIterables[0]).toHaveProperty('type');
      expect(serializedIterables[0]).toHaveProperty('spec');
      expect(serializedIterables[0]).toHaveProperty('createdAt');
      expect(serializedIterables[0]).toHaveProperty('updatedAt');
    });

    it('should serialize with correct data types', () => {
      const serialized = state.serialize();
      const serializedIterables = serialized.iterables as any[];
      
      expect(serializedIterables[0].name).toBe('files');
      expect(serializedIterables[0].type).toBe('file');
      expect(serializedIterables[0].spec).toEqual({ pattern: '**/*.ts' });
      expect(serializedIterables[0].description).toBe('TypeScript files');
    });

    it('should deserialize state correctly', () => {
      const data = {
        iterables: [
          {
            name: 'test',
            type: 'json',
            spec: { file: 'test.json' },
            description: 'Test data',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        ]
      };

      state.deserialize(data);
      
      expect(state.iterables.size).toBe(1);
      const stored = state.iterables.get('test');
      expect(stored?.name).toBe('test');
      expect(stored?.type).toBe('json');
      expect(stored?.spec).toEqual({ file: 'test.json' });
      expect(stored?.createdAt).toBeInstanceOf(Date);
      expect(stored?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle empty deserialization', () => {
      state.deserialize({ iterables: [] });
      expect(state.iterables.size).toBe(0);
    });

    it('should handle null/undefined deserialization', () => {
      state.deserialize({ iterables: null });
      expect(state.iterables.size).toBe(0);
      
      state.deserialize({});
      expect(state.iterables.size).toBe(0);
    });

    it('should preserve date objects during deserialization', () => {
      const data = {
        iterables: [
          {
            name: 'test',
            type: 'file',
            spec: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      };

      state.deserialize(data);
      const stored = state.iterables.get('test');
      
      expect(stored?.createdAt).toBeInstanceOf(Date);
      expect(stored?.updatedAt).toBeInstanceOf(Date);
      expect(stored?.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('State Display', () => {
    beforeEach(() => {
      state = new IterableState({ iterables: mockIterables });
    });

    it('should show state information correctly', () => {
      const display = state.show();
      
      expect(display).toHaveLength(3);
      expect(display[0]).toContain('Iterables: 2');
      expect(display[1]).toContain('files (file)');
      expect(display[2]).toContain('users (json)');
    });

    it('should show empty state correctly', () => {
      state = new IterableState();
      const display = state.show();
      
      expect(display).toHaveLength(1);
      expect(display[0]).toContain('Iterables: 0');
    });

    it('should handle iterables without descriptions', () => {
      const iterablesWithNoDesc = [
        {
          name: 'nodesc',
          type: 'test',
          spec: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      state = new IterableState({ iterables: iterablesWithNoDesc });
      const display = state.show();
      
      expect(display).toHaveLength(2);
      expect(display[1]).toContain('nodesc (test)');
    });
  });

  describe('Map Operations', () => {
    beforeEach(() => {
      state = new IterableState({ iterables: mockIterables });
    });

    it('should allow iteration over iterables', () => {
      const names = [];
      const types = [];
      
      for (const iterable of state.iterables.values()) {
        names.push(iterable.name);
        types.push(iterable.type);
      }
      
      expect(names).toEqual(['files', 'users']);
      expect(types).toEqual(['file', 'json']);
    });

    it('should support Map interface methods', () => {
      expect(state.iterables.has('files')).toBe(true);
      expect(state.iterables.has('users')).toBe(true);
      expect(state.iterables.has('nonexistent')).toBe(false);
      
      expect(state.iterables.size).toBe(2);
      
      const files = state.iterables.get('files');
      expect(files?.type).toBe('file');
    });

    it('should allow modification of stored iterables', () => {
      const files = state.iterables.get('files');
      if (files) {
        files.description = 'Updated description';
        state.iterables.set('files', files);
      }
      
      const updated = state.iterables.get('files');
      expect(updated?.description).toBe('Updated description');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large numbers of iterables', () => {
      const manyIterables: StoredIterable[] = [];
      for (let i = 0; i < 100; i++) {
        manyIterables.push({
          name: `iterable-${i}`,
          type: 'test',
          spec: { index: i },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      state = new IterableState({ iterables: manyIterables });
      expect(state.iterables.size).toBe(100);
    });

    it('should handle iterables with complex specifications', () => {
      const complexIterable = {
        name: 'complex',
        type: 'multi',
        spec: {
          nested: {
            deep: {
              array: ['item1', 'item2'],
              object: { key: 'value' }
            }
          },
          simple: 'value'
        },
        description: 'Complex test iterable',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      state = new IterableState({ iterables: [complexIterable] });
      expect(state.iterables.size).toBe(1);
      
      const retrieved = state.iterables.get('complex');
      expect(retrieved?.spec).toEqual(complexIterable.spec);
    });

    it('should handle serialization/deserialization cycles', () => {
      state = new IterableState({ iterables: mockIterables });
      
      const serialized = state.serialize();
      state.deserialize(serialized);
      
      expect(state.iterables.size).toBe(2);
      expect(state.iterables.get('files')?.name).toBe('files');
      expect(state.iterables.get('users')?.name).toBe('users');
    });
  });
});