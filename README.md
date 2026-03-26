# @tokenring-ai/iterables

## Overview

The `@tokenring-ai/iterables` package provides a pluggable system for defining and using named iterables in TokenRing. Iterables are reusable data sources that can be used with the `/foreach` command to batch process items across various data types and sources.

This package implements a provider-based architecture where different iterable types can be registered to handle various data sources (files, JSON, CSV, APIs, database queries, etc.). It integrates seamlessly with the Token Ring agent system to provide state persistence and checkpoint recovery during batch operations.

## Installation

```bash
bun install @tokenring-ai/iterables
```

## Features

- **Named Iterable Management**: Define, list, show, and delete named iterables with persistent state
- **Provider Architecture**: Register custom iterable providers for different data sources
- **Chat Commands**: `/iterable` and `/foreach` commands for managing and processing iterables
- **Template Interpolation**: Support for variable interpolation in prompts using `{variable}` syntax
- **State Persistence**: Iterables are persisted across sessions using the agent's state system
- **Checkpoint Recovery**: Automatic checkpoint creation and restoration during batch processing
- **Error Handling**: Graceful error handling with recovery during batch operations
- **Streaming Processing**: Items are processed one at a time to minimize memory usage

## Key Concepts

- **Iterable**: A named, reusable data source (e.g., file globs, database queries, API results, JSON files)
- **Provider**: A plugin that defines how to generate items from a specific type of iterable
- **Spec**: Configuration parameters for an iterable instance
- **IterableService**: Core service that manages providers and iterable definitions
- **IterableState**: Persists iterable definitions across agent sessions
- **Checkpoint Recovery**: Automatic state restoration between batch processing iterations

## Package Structure

```
pkg/iterables/
├── index.ts                 # Main exports
├── plugin.ts                # Plugin definition for TokenRing integration
├── IterableService.ts       # Core service implementation
├── IterableProvider.ts      # Provider interface and types
├── commands.ts              # Command exports (array of commands)
├── state/
│   └── iterableState.ts     # State management for iterables
├── commands/
│   ├── foreach.ts           # /foreach command implementation
│   └── iterable/
│       ├── define.ts        # /iterable define command
│       ├── list.ts          # /iterable list command
│       ├── show.ts          # /iterable show command
│       └── delete.ts        # /iterable delete command
├── test/                    # Test files
│   ├── commands.test.ts
│   ├── integration.test.ts
│   ├── IterableProvider.test.ts
│   └── IterableState.test.ts
├── vitest.config.ts         # Test configuration
├── package.json             # Package metadata and dependencies
└── README.md                # This documentation
```

## Exports

The package exports the following:

```typescript
// Main service
import IterableService from '@tokenring-ai/iterables/IterableService';

// Type definitions
import type {
  IterableProvider,
  IterableItem,
  IterableSpec,
  IterableMetadata
} from '@tokenring-ai/iterables/IterableProvider';

// Commands array
import commands from '@tokenring-ai/iterables/commands';

// Plugin
import iterablesPlugin from '@tokenring-ai/iterables/plugin';
```

## Core Components/API

### IterableService

The core service that manages providers and iterable definitions:

```typescript
class IterableService implements TokenRingService {
  readonly name = "IterableService";
  description = "Manages named iterables for batch operations";

  // Provider registry
  registerProvider: (provider: IterableProvider) => void;
  getProvider: (type: string) => IterableProvider | undefined;

  // Agent attachment
  attach(agent: Agent): void;

  // Iterable management
  async define(name: string, type: string, spec: IterableSpec, agent: Agent): Promise<void>;
  get(name: string, agent: Agent): StoredIterable | undefined;
  list(agent: Agent): StoredIterable[];
  delete(name: string, agent: Agent): boolean;

  // Item generation
  async* generate(name: string, agent: Agent): AsyncGenerator<IterableItem>;
}
```

**Methods:**

- `registerProvider(provider)`: Register a new iterable provider (bound from KeyedRegistry)
- `getProvider(type)`: Get a provider by type name (bound from KeyedRegistry)
- `attach(agent)`: Initialize the service with an agent (registers IterableState)
- `define(name, type, spec, agent)`: Define a new named iterable
- `get(name, agent)`: Get a stored iterable by name
- `list(agent)`: List all defined iterables
- `delete(name, agent)`: Delete an iterable by name (returns false if not found)
- `generate(name, agent)`: Generate items from an iterable (async generator)

### IterableProvider Interface

All iterable providers must implement this interface:

```typescript
interface IterableProvider {
  readonly type: string;
  readonly description: string;

  getArgsConfig(): { options: Record<string, { type: 'string' | 'boolean', multiple?: boolean }> };
  generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem>;
}
```

**Properties:**

- `type`: Unique identifier for the provider type
- `description`: Human-readable description of the provider

**Methods:**

- `getArgsConfig()`: Return configuration for accepted arguments
- `generate(spec, agent)`: Generate items from the specification

### IterableItem

Items yielded by providers:

```typescript
interface IterableItem {
  value: any;
  variables: Record<string, any>;
}
```

**Properties:**

- `value`: The raw item data
- `variables`: Object containing properties for prompt interpolation

### IterableSpec

Specification parameters for an iterable:

```typescript
interface IterableSpec {
  [key: string]: any;
}
```

### IterableMetadata

Metadata for an iterable (used for documentation):

```typescript
interface IterableMetadata {
  name: string;
  type: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### StoredIterable

Stored iterable definitions:

```typescript
interface StoredIterable {
  name: string;
  type: string;
  spec: IterableSpec;
  createdAt: Date;
  updatedAt: Date;
}
```

**Properties:**

- `name`: Unique identifier for the iterable
- `type`: Provider type used to generate items
- `spec`: Configuration parameters for the iterable
- `createdAt`: Timestamp when the iterable was created
- `updatedAt`: Timestamp when the iterable was last updated

### IterableState

State management class that persists iterable definitions:

```typescript
class IterableState extends AgentStateSlice<typeof serializationSchema> {
  readonly name = "IterableState";
  serializationSchema = serializationSchema;
  iterables: Map<string, StoredIterable> = new Map();

  constructor({iterables = []}: { iterables?: StoredIterable[] } = {});

  serialize(): z.output<typeof serializationSchema>;
  deserialize(data: z.output<typeof serializationSchema>): void;
  show(): string[];
}
```

**Serialization Schema:**

```typescript
const serializationSchema = z.object({
  iterables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    spec: z.any(),
    createdAt: z.date(),
    updatedAt: z.date()
  }))
});
```

**Methods:**

- `serialize()`: Convert state to serializable format
- `deserialize(data)`: Restore state from serialized data (converts date strings to Date objects)
- `show()`: Return human-readable state representation

## Usage Examples

### Defining Iterables

Use the `/iterable define` command with type-specific arguments:

```bash
# Define a file iterable for TypeScript files
/iterable define ts-files --type file --pattern "src/**/*.ts"

# Define a JSON iterable
/iterable define users --type json --file "users.json"
```

### Using Iterables

Use the `/foreach` command with the `@` prefix:

```bash
# Process each file
/foreach @ts-files "Add JSDoc comments to {file}"

# Access item variables
/foreach @ts-files "Review {basename} at {path}"
```

### Managing Iterables

```bash
# List all defined iterables
/iterable list

# Show details of an iterable
/iterable show ts-files

# Delete an iterable
/iterable delete ts-files
```

### Creating Custom Providers

#### 1. Implement the IterableProvider Interface

```typescript
import Agent from "@tokenring-ai/agent/Agent";
import {IterableItem, IterableProvider, IterableSpec} from "@tokenring-ai/iterables";

export default class MyIterableProvider implements IterableProvider {
  type = "mytype";
  description = "Description of what this provider does";

  // Define accepted arguments
  getArgsConfig() {
    return {
      options: {
        param1: {type: 'string'},
        param2: {type: 'boolean'},
        param3: {type: 'string', multiple: true}
      }
    };
  }

  // Generate items from spec
  async* generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
    // Access spec parameters
    const param1 = spec.param1;
    const param2 = spec.param2;

    // Yield items with variables
    yield {
      value: "item1",
      variables: {
        name: "Item 1",
        id: 1,
        custom: "data"
      }
    };

    yield {
      value: "item2",
      variables: {
        name: "Item 2",
        id: 2,
        custom: "more data"
      }
    };
  }
}
```

#### 2. Register the Provider

In your service's `attach()` method:

```typescript
async attach(agent: Agent): Promise<void> {
  // ... other initialization ...

  const iterableService = agent.tryServiceByType(IterableService);
  if(iterableService) {
    const MyIterableProvider = (await import("./MyIterableProvider.ts")).default;
    iterableService.registerProvider(new MyIterableProvider());
  }
}
```

#### 3. Use Your Provider

```bash
/iterable define my-items --type mytype --param1 "value" --param2
/foreach @my-items "Process {name} with ID {id}"
```

### Example: Database Provider

```typescript
import Agent from "@tokenring-ai/agent/Agent";
import {IterableItem, IterableProvider, IterableSpec} from "@tokenring-ai/iterables";

export default class SqlIterableProvider implements IterableProvider {
  type = "sql";
  description = "Iterate over SQL query results";

  getArgsConfig() {
    return {
      options: {
        query: {type: 'string'},
        database: {type: 'string'}
      }
    };
  }

  async* generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
    const dbService = agent.requireServiceByType(DatabaseService);
    const db = dbService.getDatabase(spec.database || 'default');

    const rows = await db.query(spec.query);

    for (let i = 0; i < rows.length; i++) {
      yield {
        value: rows[i],
        variables: {
          row: rows[i],
          rowNumber: i + 1,
          totalRows: rows.length,
          ...rows[i]  // Flatten columns as variables
        }
      };
    }
  }
}
```

Usage:

```bash
/iterable define users --type sql --query "SELECT * FROM users WHERE active=1"
/foreach @users "Send email to {email} for user {name}"
```

## Configuration

The iterables plugin uses a minimal configuration schema:

```typescript
import {z} from "zod";

const packageConfigSchema = z.object({});
```

No configuration is required by default. The plugin automatically:
1. Registers chat commands (`/iterable` and `/foreach`)
2. Adds the IterableService to the application
3. Initializes the IterableState for each agent

## Integration

### Integration with TokenRing

The package integrates with TokenRing as a plugin:

```typescript
import {TokenRingApp} from "@tokenring-ai/app";
import iterablesPlugin from '@tokenring-ai/iterables/plugin';

const app = new TokenRingApp();
app.use(iterablesPlugin);
```

### Plugin Structure

The plugin is defined as:

```typescript
export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.waitForService(AgentCommandService, agentCommandService =>
      agentCommandService.addAgentCommands(agentCommands)
    );
    app.addServices(new IterableService());
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### State Management

- **IterableState** persists iterable definitions across agent sessions
- Iterables are not reset when the agent is reset (they persist across resets)
- State serialization includes all stored iterables with creation/modification timestamps
- The state uses Zod schema for type-safe serialization/deserialization

### Checkpoint Recovery

The `/foreach` command uses checkpoint recovery to ensure consistent state:

```typescript
const checkpoint = agent.generateCheckpoint();

try {
  for await (const item of iterableService.generate(iterableName, agent)) {
    // Process item
    const interpolatedPrompt = interpolate(prompt, item.variables);
    await runChat({ input: interpolatedPrompt, chatConfig, agent});

    // Restore state before next iteration
    agent.restoreState(checkpoint.state);
  }
} finally {
  // Restore final state
  agent.restoreState(checkpoint.state);
}
```

## RPC Endpoints

This package does not define any RPC endpoints.

## State Management

### State Slice

The package uses `IterableState` to persist iterable definitions:

```typescript
class IterableState extends AgentStateSlice<typeof serializationSchema> {
  readonly name = "IterableState";
  serializationSchema = z.object({
    iterables: z.array(z.object({
      name: z.string(),
      type: z.string(),
      spec: z.any(),
      createdAt: z.date(),
      updatedAt: z.date()
    }))
  });
  iterables: Map<string, StoredIterable> = new Map();

  constructor({iterables = []}: { iterables?: StoredIterable[] } = {});
  serialize(): z.output<typeof serializationSchema>;
  deserialize(data: z.output<typeof serializationSchema>): void;
  show(): string[];
}
```

### Persistence and Restoration Patterns

- Iterables are persisted across agent sessions
- State is automatically serialized/deserialized using Zod schema
- Date strings are converted back to Date objects during deserialization
- Checkpoint recovery is used during batch operations

### Checkpoint Generation and Recovery

During `/foreach` processing, checkpoints are generated and restored:

```typescript
const checkpoint = agent.generateCheckpoint();

try {
  for await (const item of iterableService.generate(iterableName, agent)) {
    // Process item
    await processItem(item);

    // Restore state before next iteration
    agent.restoreState(checkpoint.state);
  }
} finally {
  // Restore final state
  agent.restoreState(checkpoint.state);
}
```

## Variable Interpolation

In `/foreach` prompts, use `{variable}` syntax to access item properties:

```bash
/foreach @ts-files "File: {file}, Size: {size} bytes, Modified: {modified}"
```

Available variables depend on the provider type. The system supports nested property access using dot notation:

```bash
/foreach @data "Process {nested.value:default}"
```

### Interpolation Features

- **Simple variables**: `{variable}`
- **Default values**: `{variable:default}`
- **Nested properties**: `{user.name}`
- **Mixed**: `{nested.value:fallback}`

### Interpolation Implementation

The interpolation function uses regex to replace variables:

```typescript
function interpolate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{([^}:]+)(?::([^}]*))?}/g, (match, key, defaultValue) => {
    const value = getNestedProperty(variables, key);
    return value !== undefined ? String(value) : (defaultValue || match);
  });
}

function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}
```

## Provider Guidelines

### getArgsConfig()

Return an object with `options` defining accepted arguments:

```typescript
getArgsConfig() {
  return {
    options: {
      // String argument
      name: {type: 'string'},

      // Boolean flag
      enabled: {type: 'boolean'},

      // Multiple values
      tags: {type: 'string', multiple: true}
    }
  };
}
```

### generate()

- Return an `AsyncGenerator<IterableItem>`
- Each item must have `value` and `variables`
- `value` is the raw item data
- `variables` are exposed for prompt interpolation
- Access spec parameters directly: `spec.paramName`

### Variables Best Practices

- Provide intuitive variable names
- Include both raw and formatted versions (e.g., `{date}` and `{dateFormatted}`)
- Document available variables in provider description
- Keep variable names consistent across similar providers

## Commands

The package exports an array of agent commands:

```typescript
import commands from '@tokenring-ai/iterables/commands';

// Commands array contains:
// - iterable define
// - iterable list
// - iterable show
// - iterable delete
// - foreach
```

### /iterable Command

Manage named iterables with subcommands:

```bash
# Define a new iterable
/iterable define <name> --type <type> [options]

# List all iterables
/iterable list

# Show details of an iterable
/iterable show <name>

# Delete an iterable
/iterable delete <name>
```

**Subcommands:**

- `define <name> --type <type> [options]` - Create a new iterable
- `list` - List all defined iterables
- `show <name>` - Show details of an iterable
- `delete <name>` - Delete an iterable

**Command Implementations:**

#### define

```typescript
async function execute({positionals: {name}, remainder, args, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const type = args['--type']

  const provider = iterableService.getProvider(type);
  if (!provider) throw new CommandFailedError(`Unknown iterable type: ${type}`);

  const parts = remainder?.split(/\s+/) ?? [];
  const providerArgs = parseArgs({args: parts, options: {...provider.getArgsConfig().options}, strict: false});

  try {
    await iterableService.define(name, type, providerArgs, agent);
    return `Defined iterable: @${name} (${type})`;
  } catch (error) {
    throw new CommandFailedError(`Failed to define iterable: ${error}`);
  }
}
```

#### list

```typescript
async function execute({agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const iterables = agent.requireServiceByType(IterableService).list(agent);
  if (iterables.length === 0) return "No iterables defined";
  return `Available iterables:\n${markdownList(iterables.map(it => `@${it.name} = ${it.type}`))}`;
}
```

#### show

```typescript
async function execute({positionals: { name }, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const iterable = agent.requireServiceByType(IterableService).get(name, agent);
  if (!iterable) throw new CommandFailedError(`Iterable not found: @${name}`);
  return [
    `Iterable: @${iterable.name}`,
    `Type: ${iterable.type}`,
    `Spec: ${JSON.stringify(iterable.spec, null, 2)}`,
    `Created: ${iterable.createdAt.toISOString()}`,
    `Updated: ${iterable.updatedAt.toISOString()}`,
  ].join("\n");
}
```

#### delete

```typescript
async function execute({positionals: { name }, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const deleted = agent.requireServiceByType(IterableService).delete(name, agent);
  if (!deleted) throw new CommandFailedError(`Iterable not found: @${name}`);
  return `Deleted iterable: @${name}`;
}
```

### /foreach Command

Process each item in an iterable:

```bash
/foreach @<iterable> <prompt>
```

#### Arguments

- **@<iterable>** - Name of the iterable to process (prefixed with @)
- **<prompt>** - Template prompt to execute for each item

#### Implementation

```typescript
async function execute({positionals, remainder, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const iterableService = agent.requireServiceByType(IterableService);
  const iterableName = positionals.iterable.replace(/^@/, "");

  const checkpoint = agent.generateCheckpoint();

  try {
    let count = 0;
    for await (const item of iterableService.generate(iterableName, agent)) {
      count++;
      const interpolatedPrompt = interpolate(remainder, item.variables);
      const chatService = agent.requireServiceByType(ChatService);
      const chatConfig = chatService.getChatConfig(agent);
      try {
        await runChat({ input: interpolatedPrompt, chatConfig, agent});
      } catch (error) {
        throw new CommandFailedError(`Error processing item ${count}: ${error}`);
      }
      agent.restoreState(checkpoint.state);
    }
    return `Processed ${count} items`;
  } finally {
    agent.restoreState(checkpoint.state);
  }
}
```

#### Examples

```bash
/foreach @files "Add comments to {file}"
  # Processes each file in the 'files' iterable

/foreach @users "Welcome {name} from {city}"
  # Processes each user with their properties

/foreach @projects "Review {name}: {description:No description}"
  # Uses fallback for missing descriptions

/foreach @data "Process {nested.value:default}"
  # Access nested properties with fallback
```

### Command Help

Run `/iterable` or `/foreach` without arguments to see detailed help:

```
/iterable
# Shows usage information and examples

/foreach
# Shows prompt template variables and common use cases
```

## Common Use Cases

- **Code analysis and refactoring** across multiple files
- **Data processing and transformation** on structured datasets
- **Content generation** for multiple items
- **Batch operations** on database results
- **API data processing** from multiple endpoints

## Error Handling

The package provides comprehensive error handling:

- **Provider not found**: Returns helpful error message for unknown types
- **Invalid spec**: Validates provider arguments before definition
- **Iterable not found**: Clear error when referencing non-existent iterables
- **Processing errors**: Individual item errors don't stop batch processing
- **State errors**: Proper serialization/deserialization with type checking

### Error Types

- `CommandFailedError`: Thrown when command execution fails
- `Error`: Generic errors for unknown providers, missing iterables, etc.

### Error Handling Examples

```typescript
try {
  await iterableService.define('test', 'unknown', {}, agent);
} catch (error) {
  console.error(error.message); // "Unknown iterable type: unknown"
}

try {
  for await (const item of iterableService.generate('nonexistent', agent)) {
    // ...
  }
} catch (error) {
  console.error(error.message); // "Iterable not found: nonexistent"
}
```

## Performance Considerations

- **Streaming processing**: Items are processed one at a time to minimize memory usage
- **State checkpoints**: Maintains state between iterations for consistency
- **Error isolation**: Errors in one item don't affect others
- **Provider efficiency**: Providers should implement efficient data access patterns
- **Persistence**: Iterables are persisted across agent resets

## Testing

The package includes comprehensive test coverage using Vitest:

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Generate coverage report
bun run test:coverage

# Type check
bun run build
```

### Test Files

- `test/IterableState.test.ts` - State management tests
- `test/IterableProvider.test.ts` - Provider interface tests
- `test/commands.test.ts` - Command execution tests
- `test/integration.test.ts` - Integration tests

### Example Test

```typescript
import {describe, expect, it} from 'vitest';
import IterableService from '../IterableService';
import {IterableState} from '../state/iterableState';

describe('IterableState', () => {
  it('should serialize state correctly', () => {
    const state = new IterableState({
      iterables: [{
        name: 'files',
        type: 'file',
        spec: { pattern: '**/*.ts' },
        createdAt: new Date(),
        updatedAt: new Date()
      }]
    });

    const serialized = state.serialize();
    expect(serialized.iterables).toHaveLength(1);
    expect(serialized.iterables[0].name).toBe('files');
  });
});
```

## Development

### Building

```bash
bun run build
```

### Watch Mode

```bash
bun run test:watch
```

### Coverage

```bash
bun run test:coverage
```

## Dependencies

### Production Dependencies

- `@tokenring-ai/app` (0.2.0) - Base application framework
- `@tokenring-ai/agent` (0.2.0) - Agent orchestration
- `@tokenring-ai/chat` (0.2.0) - Chat service integration
- `@tokenring-ai/utility` (0.2.0) - Shared utilities
- `zod` (^4.3.6) - Schema validation

### Development Dependencies

- `vitest` (^4.1.1) - Testing framework
- `typescript` (^6.0.2) - TypeScript compiler

## License

MIT License - see LICENSE file for details.
