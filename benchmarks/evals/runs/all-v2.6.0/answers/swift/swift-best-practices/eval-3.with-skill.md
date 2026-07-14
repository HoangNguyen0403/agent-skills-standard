Prefer clear, idiomatic Swift patterns:

- Use `guard` for preconditions and early exits rather than nesting the happy path.
- Default to `let`, structs, and `final` classes; use mutation, reference types, and inheritance only when needed.
- Follow Swift API Design Guidelines with descriptive camelCase names and `PascalCase` type names.
- Prefix Boolean properties with `is`, `has`, or `can`, such as `isValid` or `canEdit`.
- Use `compactMap`, `filter`, and `reduce` for collection transformations, and `.lazy` when partial consumption matters.
- Avoid force unwraps, mutable global state, and pyramid-of-doom control flow.


