Use ES modules and named exports consistently. Replace each `require()` with a static import, use `import type` for type-only dependencies, and give exported functions explicit return types:

```ts
// user-service.ts
import type { UserRepository } from "./user-repository.js";

export interface User {
  readonly id: string;
}

export function getUser(repository: UserRepository, id: string): User {
  return repository.getById(id);
}
```

```ts
// consumer.ts
import { getUser } from "./user-service.js";
import { repository } from "./user-repository.js";

const user = getUser(repository, "u-123");
```

Update consumers from a default import to the named symbol, keep external/internal/relative imports ordered, and configure the package for one module system. Do not replace `require()` with an untyped workaround; use a deliberate dynamic `import()` only when loading must be deferred.
