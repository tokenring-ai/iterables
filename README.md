# @tokenring-ai/iterables

## Overview

The `@tokenring-ai/iterables` package provides a pluggable system for defining and using named iterables in TokenRing.
Iterables are reusable data sources that can be used with the `/foreach` command to batch process items across various
data types and sources.

This package implements a provider-based architecture where different iterable types can be registered to handle various
data sources (files, JSON, CSV, APIs, database queries, etc.). It integrates seamlessly with the Token Ring agent system
to provide state persistence and checkpoint recovery during batch operations.

## Installation

```bash
bun install @tokenring-ai/iterables
```

## Chat Commands

| Command                                           | Description                                                           |
|---------------------------------------------------|-----------------------------------------------------------------------|
| `/iterable define <name> --type <type> [options]` | Create a new named iterable with the specified type and configuration |
| `/iterable list`                                  | List all defined iterables with their types                           |
| `/iterable show <name>`                           | Display detailed information about a specific iterable                |
| `/iterable delete <name>`                         | Remove a defined iterable permanently                                 |
| `/foreach @<iterable> <prompt>`                   | Process each item in an iterable with a custom prompt                 |

## Features

- **Named Iterable Management**: Define, list, show, and delete named iterables with persistent state
- **Provider Architecture**: Register custom iterable providers for different data sources
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
  IterableProvider,
  IterableItem,
  IterableSpec,
} from '@tokenring-ai/iterables/IterableProvider';

// Commands array
import commands from '@tokenring-ai/iterables/commands';

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
