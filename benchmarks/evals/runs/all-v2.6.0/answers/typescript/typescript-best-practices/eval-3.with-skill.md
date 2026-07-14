Prefer composition and constructor injection when the base class is becoming large. Split each capability behind a small interface and make collaborators explicit:

```ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
}

export interface AuditLogger {
  record(event: string): Promise<void>;
}

export interface User {
  readonly id: string;
}

export class UserService {
  public constructor(
    private readonly repository: UserRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  public async load(id: string): Promise<User | null> {
    const user = await this.repository.findById(id);
    if (user) {
      await this.auditLogger.record(`user.loaded:${user.id}`);
    }
    return user;
  }
}
```

Move cohesive behavior into focused services or strategy objects and compose them in the caller. This keeps classes small and testable without a singleton or a deeper inheritance hierarchy; use `private`/`protected`/`public` deliberately and retain explicit return types.
