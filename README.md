# @tokenring-ai/iterables

## Overview

The `@tokenring-ai/iterables` package provides a pluggable system for defining and using named iterables in TokenRing. Iterables are reusable data sources that can be used with the `/foreach` command to batch process items across various data types and sources.

This package implements a provider-based architecture where different iterable types can be registered to handle various data sources (files, JSON, CSV, APIs, database queries, etc.). It integrates seamlessly with the Token Ring agent system to provide state persistence and checkpoint recovery during batch operations.

### Key Features

- **Named Iterable Management**: Define, list, show, and delete named iterables with persistent state
- **Provider Architecture**: Register custom iterable providers for different data sources
- **Template Interpolation**: Support for variable interpolation in prompts using `{variable}` syntax
- **State Persistence**: Iterables are persisted across sessions using the agent's state system
- **Checkpoint Recovery**: Automatic checkpoint creation and restoration during batch processing
- **Error Handling**: Graceful error handling with recovery during batch operations
- **Streaming Processing**: Items are processed one at a time to minimize memory usage

## Installation

```bash
bun add @tokenring-ai/iterables
```

## Chat Commands

### Iterable Management Commands

| Command                                           | Description                                                           |
|---------------------------------------------------|-----------------------------------------------------------------------|
| `/iterable define <name> --type <type> [options]` | Create a new named iterable with the specified type and configuration |
| `/iterable list`                                  | List all defined iterables with their types                           |
| `/iterable show <name>`                           | Display detailed information about a specific iterable                |
| `/iterable delete <name>`                         | Remove a defined iterable permanently                                 |

### Batch Processing Commands

| Command                              | Description                                               |
|--------------------------------------|-----------------------------------------------------------|
| `/foreach @<iterable> <prompt>`      | Process each item in an iterable with a custom prompt     |

## Key Concepts

- **Iterable**: A named, reusable data source (e.g., file globs, database queries, API results, JSON files)
- **Provider**: A plugin that defines how to generate items from a specific type of iterable
- **Spec**: Configuration parameters for an iterable instance
- **IterableService**: Core service that manages providers and iterable definitions
- **IterableState**: Persists iterable definitions across agent sessions
- **Checkpoint Recovery**: Automatic state restoration between batch processing iterations

## Package Structure

```text
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
  IterableItem,
  IterableMetadata,
  IterableProvider,
  IterableSpec,
} from '@tokenring-ai/iterables/IterableProvider';

// Plugin
import iterablesPlugin from '@tokenring-ai/iterables/plugin';
```

## Configuration

The iterables plugin uses a minimal configuration schema:

```typescript
import { z } from "zod";

const packageConfigSchema = z.object({});
```

No configuration is required by default. The plugin automatically:

1. Registers chat commands (`/iterable` and `/foreach`)
2. Adds the IterableService to the application
3. Initializes the IterableState for each agent

## License

MIT License - see LICENSE file for details.

---

## Developer Reference

### Core Components

#### IterableService

The core service that manages iterable providers and definitions.

**Location**: `IterableService.ts`

**Key Methods**:

- `registerProvider(type: string, provider: IterableProvider)`: Register a new iterable provider
- `getProvider(type: string)`: Retrieve a registered provider by type
- `define(name: string, type: string, spec: IterableSpec, agent: Agent)`: Define a new named iterable
- `get(name: string, agent: Agent)`: Retrieve a specific iterable definition
- `list(agent: Agent)`: List all defined iterables
- `delete(name: string, agent: Agent)`: Delete an iterable definition
- `generate(name: string, agent: Agent)`: Async generator that yields items from an iterable

**Example**:

```typescript
import IterableService from '@tokenring-ai/iterables/IterableService';

const service = new IterableService();

// Register a provider
service.registerProvider('file', fileProvider);

// Define an iterable
await service.define('myFiles', 'file', { pattern: '**/*.ts' }, agent);

// Generate items
for await (const item of service.generate('myFiles', agent)) {
  console.log(item.value);
}
```

#### IterableProvider

The interface that all iterable providers must implement.

**Location**: `IterableProvider.ts`

**Interface**:

```typescript
export interface IterableProvider {
  readonly type: string;
  readonly description: string;

  getArgsConfig(): {
    options: Record<string, { type: "string" | "boolean"; multiple?: boolean }>;
  };

  generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem>;
}
```

**Properties**:

| Property      | Type     | Description                              |
|---------------|----------|------------------------------------------|
| `type`        | string   | Unique identifier for the provider type  |
| `description` | string   | Human-readable description of the provider |

**Methods**:

| Method           | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `getArgsConfig()` | Returns the argument configuration for provider options                    |
| `generate()`      | Async generator that yields `IterableItem` objects from the spec          |

#### IterableItem

Represents a single item generated by a provider.

**Interface**:

```typescript
export interface IterableItem {
  value: any;
  variables: Record<string, any>;
}
```

**Properties**:

| Property     | Type                    | Description                                        |
|--------------|-------------------------|----------------------------------------------------|
| `value`      | any                     | The primary value of the item                      |
| `variables`  | Record<string, any>     | Contextual variables for template interpolation    |

#### IterableSpec

Configuration object for defining an iterable.

```typescript
export interface IterableSpec {
  [key: string]: any;
}
```

#### IterableMetadata

Metadata for a stored iterable.

```typescript
export interface IterableMetadata {
  name: string;
  type: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Services

#### IterableService (TokenRingService)

Implements the `TokenRingService` interface for integration with TokenRing applications.

**Service Name**: `IterableService`

**Service Description**: `Manages named iterables for batch operations`

**Attach Method**:

```typescript
attach(agent: Agent): void {
  agent.initializeState(IterableState, {});
}
```

### Commands

The package provides the following chat commands:

#### `/iterable define`

Create a new named iterable.

**Usage**:

```bash
/iterable define <name> --type <type> [options]
```

**Example**:

```bash
/iterable define files --type file --pattern "**/*.ts"
/iterable define projects --type json --file "projects.json"
```

#### `/iterable list`

List all defined iterables.

**Usage**:

```bash
/iterable list
```

#### `/iterable show`

Display details of a specific iterable.

**Usage**:

```bash
/iterable show <name>
```

**Example**:

```bash
/iterable show files
```

#### `/iterable delete`

Delete an iterable definition.

**Usage**:

```bash
/iterable delete <name>
```

**Example**:

```bash
/iterable delete old-projects
```

#### `/foreach`

Process each item in an iterable with a custom prompt.

**Usage**:

```bash
/foreach @<iterable> <prompt>
```

**Example**:

```bash
/foreach @files Add comments to {file}
/foreach @users Welcome {name} from {city}
```

**Template Interpolation**:

The `/foreach` command supports template interpolation using the `{variable}` syntax:

- `{variable}` - Replaced with the value from `item.variables`
- `{variable:default}` - Replaced with the value or the default if undefined
- `{nested.property}` - Supports nested property access

### State Management

#### IterableState

Persists iterable definitions across agent sessions.

**Location**: `state/iterableState.ts`

**Structure**:

```typescript
export class IterableState extends AgentStateSlice {
  iterables: Map<string, StoredIterable> = new Map();
}
```

**StoredIterable**:

```typescript
export interface StoredIterable {
  name: string;
  type: string;
  spec: IterableSpec;
  createdAt: Date;
  updatedAt: Date;
}
```

**Methods**:

| Method          | Description                              |
|-----------------|------------------------------------------|
| `serialize()`   | Convert state to serializable format     |
| `deserialize()` | Restore state from serialized data       |
| `show()`        | Return markdown-formatted list of iterables |

### Provider Implementation Example

Here's an example of implementing a custom iterable provider:

```typescript
import type Agent from "@tokenring-ai/agent/Agent";
import type { IterableItem, IterableProvider, IterableSpec } from "@tokenring-ai/iterables/IterableProvider";

class CustomIterableProvider implements IterableProvider {
  readonly type = "custom";
  readonly description = "Custom iterable provider example";

  getArgsConfig() {
    return {
      options: {
        count: { type: "string" as const },
        recursive: { type: "boolean" as const }
      }
    };
  }

  async* generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem> {
    const count = parseInt(spec.count as string) || 10;

    for (let i = 0; i < count; i++) {
      yield {
        value: `item-${i}`,
        variables: {
          index: i,
          item: `item-${i}`,
          total: count
        }
      };
    }
  }
}

// Register the provider
const service = new IterableService();
service.registerProvider("custom", new CustomIterableProvider());
```

### Testing

The package includes comprehensive tests using Vitest:

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage
```

**Test Files**:

- `test/IterableProvider.test.ts` - Provider interface tests
- `test/IterableState.test.ts` - State management tests
- `test/commands.test.ts` - Command handler tests
- `test/integration.test.ts` - Integration tests with full workflow

### Dependencies

| Dependency                    | Version    | Purpose                          |
|-------------------------------|------------|----------------------------------|
| `@tokenring-ai/app`           | workspace:* | Base application framework       |
| `@tokenring-ai/agent`         | workspace:* | Agent system integration         |
| `@tokenring-ai/chat`          | workspace:* | Chat service integration         |
| `@tokenring-ai/utility`       | workspace:* | Utility functions                |
| `zod`                         | ^4.3.6     | Schema validation                |
| `vitest` (dev)                | ^4.1.1     | Testing framework                |
| `typescript` (dev)            | ^6.0.2     | TypeScript compiler              |

### Related Components

- `@tokenring-ai/agent` - Core agent system
- `@tokenring-ai/chat` - Chat service for processing prompts
- `@tokenring-ai/app` - Base application framework
