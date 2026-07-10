Per this project's Dart style standard:
1. **No top-level mutable state** — move the global variables into a class field or inject them, don't leave them as module-level globals.
2. **No var for non-obvious types** — replace `var` with `final` or an explicit type everywhere the inferred type isn't obvious at the call site.
3. **No anonymous lambdas for tear-offs** — replace `(e) => doSomething(e)` with the tear-off `doSomething` directly.
4. Apply a trailing comma to every multi-line parameter list/literal so `dart format` keeps them one-per-line.
