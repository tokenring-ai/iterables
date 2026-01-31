# @tokenring-ai/iterables

## Overview

The `@tokenring-ai/iterables` package provides a pluggable system for defining and using named iterables in TokenRing. Iterables are reusable data sources that can be used with the `/foreach` command to batch process items across various data types and sources.

## Installation

```bash
bun install @tokenring-ai/iterables
```

## Key Concepts

- **Iterable**: A named, reusable data source (e.g., file globs, database queries, API results)
- **Provider**: A plugin that defines how to generate items from a specific type of iterable
- **Spec**: Configuration parameters for an iterable instance
- **IterableService**: Core service that manages providers and iterable definitions
- **IterableState**: Persists iterable definitions across agent sessions

## Package Structure

```
pkg/iterables/
├── index.ts                 # Main exports
├── plugin.ts                # Plugin definition for TokenRing integration
├── IterableService.ts       # Core service implementation
├── IterableProvider.ts      # Provider interface and types
├── state/
│   └── iterableState.ts     # State management for iterables
├── commands/
│   ├── iterable.ts          # /iterable command implementation
│   └── foreach.ts           # /foreach command implementation
├── chatCommands.ts          # Command exports
└── LICENSE
```

## Exports

The package exports the following:

```typescript
// Main service
import IterableService from '@tokenring-ai/iterables';

// Type definitions
import type {
  IterableProvider,
  IterableItem,
  IterableSpec
} from '@tokenring-ai/iterables';
```

## Core Components

### IterableService

The core service that manages providers and iterable definitions:

```typescript
class IterableService implements TokenRingService {
  name = "IterableService";
  description = "Manages named iterables for batch operations";

  registerProvider(provider: IterableProvider): void;
  getProvider(type: string): IterableProvider | undefined;

  attach(agent: Agent): void;

  async define(name: string, type: string, spec: IterableSpec, agent: Agent): Promise<void>;
  get(name: string, agent: Agent): StoredIterable | undefined;
  list(agent: Agent): StoredIterable[];
  delete(name: string, agent: Agent): boolean;
  async* generate(name: string, agent: Agent): AsyncGenerator<IterableItem>;
}
```

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

### IterableItem

Items yielded by providers:

```typescript
interface IterableItem {
  value: any;
  variables: Record<string, any>;
}
```

### IterableSpec

Specification parameters for an iterable:

```typescript
interface IterableSpec {
  [key: string]: any;
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

### IterableState

State management class:

```typescript
class IterableState implements AgentStateSlice<typeof serializationSchema> {
  name = "IterableState";
  serializationSchema = serializationSchema;
  iterables: Map<string, StoredIterable> = new Map();

  constructor({iterables = []}: { iterables?: StoredIterable[] } = {});

  reset(what: ResetWhat[]): void;
  // Iterables persist across resets

  serialize(): z.output<typeof serializationSchema>;
  deserialize(data: z.output<typeof serializationSchema>): void;
  show(): string[];
}
```

## Usage

### Defining Iterables

Use the `/iterable define` command with type-specific arguments:

```bash
# Define a glob iterable for TypeScript files
/iterable define ts-files --type glob --pattern "src/**/*.ts"

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

## Creating Custom Providers

### 1. Implement the IterableProvider Interface

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

### 2. Register the Provider

In your service's `attach()` method:

```typescript
async attach(agent: Agent): Promise<void> {
  // ... other initialization ...

  const {IterableService} = await import("@tokenring-ai/iterables");
  const iterableService = agent.tryServiceByType(IterableService);
  if(iterableService) {
    const MyIterableProvider = (await import("./MyIterableProvider.ts")).default;
    iterableService.registerProvider(new MyIterableProvider());
  }
}
```

### 3. Use Your Provider

```bash
/iterable define my-items --type mytype --param1 "value" --param2
/foreach @my-items "Process {name} with ID {id}"
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

## Example: Database Provider

```typescript
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

## Commands

### /iterable Command

Manage named iterables:

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

### /foreach Command

Process each item in an iterable:

```bash
/foreach @<iterable> <prompt>
```

#### Arguments

- **@<iterable>** - Name of the iterable to process (prefixed with @)
- **<prompt>** - Template prompt to execute for each item

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

## Plugin Configuration

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

The package integrates with TokenRing as a plugin:

```typescript
import {TokenRingApp} from "@tokenring-ai/app";
import iterablesPlugin from "@tokenring-ai/iterables";

const app = new TokenRingApp();
app.use(iterablesPlugin);
```

### State Management

- **IterableState** persists iterable definitions across agent sessions
- Iterables are not reset when the agent is reset (they persist across resets)
- State serialization includes all stored iterables with creation/modification timestamps
- The state uses Zod schema for type-safe serialization/deserialization

## Development

### Testing

The package includes Vitest configuration for testing:

```bash
bun run test
```

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

## Performance Considerations

- **Streaming processing**: Items are processed one at a time to minimize memory usage
- **State checkpoints**: Maintains state between iterations for consistency
- **Error isolation**: Errors in one item don't affect others
- **Provider efficiency**: Providers should implement efficient data access patterns
- **Persistence**: Iterables are persisted across agent resets

## License

MIT License - see [LICENSE](./LICENSE) file for details.
