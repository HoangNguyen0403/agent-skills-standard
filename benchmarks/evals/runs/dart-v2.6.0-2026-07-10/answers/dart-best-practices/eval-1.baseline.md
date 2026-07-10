Refactor plan:
1. Move the top-level mutable variables into a class field or pass them via constructor/dependency injection instead of module-level state — top-level mutable state is hard to test and reason about.
2. Replace every `var` with an explicit type (or `final`/`const` where the value never changes after assignment) so the analyzer catches type mistakes early.
3. Replace anonymous closures like `(e) => someFunction(e)` with a direct function reference where the signatures line up — it's shorter and avoids an extra allocation.
4. Run `dart format` afterward to keep multi-line argument lists consistent.
