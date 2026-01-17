---
name: TypeScript Best Practices
description: Idiomatic TypeScript patterns for clean, maintainable code.
metadata:
  labels: [typescript, best-practices, idioms, conventions]
  triggers:
    files: ['**/*.ts', '**/*.tsx']
    keywords: [class, function, module, import, export, async, promise]
---

# TypeScript Best Practices

## **Priority: P1 (OPERATIONAL)**

Idiomatic patterns for writing clean, maintainable TypeScript code.

## Implementation Guidelines

- **Naming Conventions**:
  - PascalCase for classes, interfaces, types, enums
  - camelCase for variables, functions, methods, parameters
  - UPPER_SNAKE_CASE for constants
  - Prefix interfaces with `I` only when necessary for disambiguation
- **Functions**:
  - Prefer arrow functions for callbacks and short functions
  - Use regular functions for methods and exported functions
  - Always specify return types for public APIs
- **Modules**:
  - One export per file for major components/classes
  - Use named exports over default exports for better refactoring
  - Organize imports: external -> internal -> relative
- **Async/Await**:
  - Prefer `async/await` over raw Promises
  - Always handle errors with try/catch in async functions
  - Use `Promise.all()` for parallel operations
- **Classes**:
  - Use `private`/`protected`/`public` modifiers explicitly
  - Prefer composition over inheritance
  - Use `readonly` for properties that don't change after construction
- **Optional Properties**: Use `?:` for optional properties, not `| undefined`
- **Type Imports**: Use `import type` for type-only imports to enable better tree-shaking

## Anti-Patterns

- **No Default Exports**: Avoid `export default` - use named exports
- **No Implicit Returns**: Always specify return types for functions
- **No Unused Variables**: Enable `noUnusedLocals` and `noUnusedParameters`
- **No `require`**: Use ES6 `import` statements only
- **No Empty Interfaces**: Don't create interfaces with no properties

## Code

```typescript
// Good naming conventions
interface UserProfile {
  readonly id: string;
  name: string;
  email: string;
}

const MAX_RETRIES = 3;

// Named exports
export class UserService {
  private readonly repository: UserRepository;

  constructor(repository: UserRepository) {
    this.repository = repository;
  }

  async getUser(id: string): Promise<UserProfile> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }
}

// Organize imports
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserRepository } from '@/repositories/user.repository';
import { Logger } from '@/utils/logger';

// Type-only imports
import type { Request, Response } from 'express';
```

## Reference & Examples

For project structure and module organization:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

language | tooling | security
