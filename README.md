# Iterables Package

## Overview

The `@tokenring-ai/iterables` package provides a pluggable system for defining and using named iterables in TokenRing.
Iterables are reusable data sources that can be used with the `/foreach` command to batch process items.

## Key Concepts

- **Iterable**: A named, reusable data source (e.g., file globs, database queries, API results)
- **Provider**: A plugin that defines how to generate items from a specific type of iterable
- **Spec**: Configuration parameters for an iterable instance

## Usage

### Defining Iterables

Use the `/iterable define` command with type-specific arguments:

```bash
# Define a glob iterable for TypeScript files
/iterable define ts-files --type glob --pattern "src/**/*.ts"

# Define with description
/iterable define test-files --type glob --pattern "**/*.test.ts" --description "All test files"
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

Available variables depend on the provider type.

## Built-in Providers

### Glob Provider (from `@tokenring-ai/filesystem`)

Iterates over files matching glob patterns.

**Arguments:**

- `--pattern <glob>` - Glob pattern (required)
- `--includeDirectories` - Include directories in results
- `--absolute` - Return absolute paths (default: true)

**Variables:**

- `{file}` - Full file path
- `{path}` - Directory path
- `{basename}` - File name
- `{ext}` - File extension
- `{content}` - File contents (for files)
- `{size}` - File size in bytes
- `{modified}` - Last modified date

**Example:**

```bash
/iterable define src-files --type glob --pattern "src/**/*.{ts,js}"
/foreach @src-files "Analyze {basename}: {content}"
```

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
        param1: {type: 'string' as const},
        param2: {type: 'boolean' as const},
        param3: {type: 'string' as const, multiple: true}
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

In your package's service `attach()` method:

```typescript
async
attach(agent
:
Agent
):
Promise < void > {
  // ... other initialization ...

  const {IterableService} = await import("@tokenring-ai/iterables");
  const iterableService = agent.tryServiceByType(IterableService);
  if(iterableService) {
    const MyIterableProvider = (await import("./MyIterableProvider.ts")).default;
    iterableService.registerProvider(new MyIterableProvider());
  }
}
```

### 3. Export from Package

```typescript
// iterables.ts
export {default as mytype} from "./MyIterableProvider.ts";

// index.ts
import * as iterables from "./iterables.ts";

export const packageInfo: TokenRingPackage = {
  // ...
  iterables
};
```

### 4. Use Your Provider

```bash
/iterable define my-items --type mytype --param1 "value" --param2
/foreach @my-items "Process {name} with ID {id}"
```

## Provider Guidelines

### getArgsConfig()

Return an object with `options` defining accepted arguments:

```typescript
getArgsConfig()
{
  return {
    options: {
      // String argument
      name: {type: 'string' as const},

      // Boolean flag
      enabled: {type: 'boolean' as const},

      // Multiple values
      tags: {type: 'string' as const, multiple: true}
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
        query: {type: 'string' as const},
        database: {type: 'string' as const}
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

## Architecture

- **IterableService**: Core service managing providers and iterable definitions
- **IterableProvider**: Interface for creating custom iterable types
- **IterableState**: Persists iterable definitions across sessions
- **Commands**: `/iterable` and `/foreach` for user interaction

## API Reference

### IterableService

```typescript
class IterableService {
  registerProvider(provider: IterableProvider): void;

  getProvider(type: string): IterableProvider | undefined;

  define(name: string, type: string, spec: IterableSpec, description: string | undefined, agent: Agent): Promise<void>;

  get(name: string, agent: Agent): StoredIterable | undefined;

  list(agent: Agent): StoredIterable[];

  delete(name: string, agent: Agent): boolean;

  generate(name: string, agent: Agent): AsyncGenerator<IterableItem>;
}
```

### IterableProvider

```typescript
interface IterableProvider {
  readonly type: string;
  readonly description: string;

  getArgsConfig(): { options: Record<string, { type: 'string' | 'boolean', multiple?: boolean }> };

  generate(spec: IterableSpec, agent: Agent): AsyncGenerator<IterableItem>;
}
```

### IterableItem

```typescript
interface IterableItem {
  value: any;
  variables: Record<string, any>;
}
```

## License

MIT
