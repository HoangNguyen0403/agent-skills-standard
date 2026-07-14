Use ES modules consistently and prefer named exports so imports are explicit and refactors are easier to track.

```ts
// user-service.ts
export function getUser(id: string) {
  return { id };
}
```

```ts
// consumer.ts
import { getUser } from "./user-service.js";

const user = getUser("u-123");
```

Replace each `require("...")` with a static `import` (or a deliberate dynamic `import()` when loading must be deferred), and replace a default export with a named export such as `export function`, `export class`, or `export { value }`. Update the package/module configuration to use the same module system and keep the explicit file extensions required by the chosen Node ESM setup. If a default import is part of the public API, preserve it temporarily with a compatibility wrapper rather than changing consumers accidentally.
