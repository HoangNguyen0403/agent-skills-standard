# TypeScript Best Practice Examples

## Named Export + Immutable Interface

```typescript
export interface User {
  readonly id: string;
  name: string;
}
```

## Exhaustiveness Checking

Use `never` to ensure all cases in a switch are handled.

```typescript
function getStatus(s: 'ok' | 'fail') {
  switch (s) {
    case 'ok':
      return 'OK';
    case 'fail':
      return 'Fail';
    default:
      const _chk: never = s;
      return _chk;
  }
}
```

## Assertion Functions

Runtime validation that narrows types.

```typescript
function assertDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val == null) throw new Error('Defined expected');
}
```

## Dependency Injection (Class Pattern)

```typescript
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async getUser(id: string): Promise<UserProfile> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }
}
```

## Import Organization

```typescript
// External
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Internal
import { UserRepository } from '@/repositories/user.repository';
import { Logger } from '@/utils/logger';

// Type-only
import type { Request, Response } from 'express';
```
