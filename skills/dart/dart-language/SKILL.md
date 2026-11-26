---
name: dart-language
description: "Dart 3.x language feature standards: null safety, records, sealed classes, switch pattern matching, extensions, and async/await. Use when using !, ?., ??, late, sealed classes, record types, switch expressions, or async patterns — and before introducing any new Dart 3.x construct to confirm the modern idiomatic approach."
metadata:
  triggers:
    files:
      - "**/*.dart"
    keywords:
      - sealed
      - record
      - switch
      - pattern
      - "!"
      - late
      - dart async
      - extension
---

# Dart Language Patterns

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Null Safety**: Avoid `!`. Use `?.`, `??`, or short-circuiting. Use `late` only if necessary.
- **Immutability**: Use `final` for all variables. Use `@freezed` for data classes.
- **Pattern Matching (3.x)**: Use `switch (value)` with patterns and destructuring.
- **Records**: Use a Record (e.g., `(String, int)`) for multiple values; use named fields when meaning matters. Destructure at call sites: `final (error, data) = fetchUser();`.
- **Sealed Classes**: Use `sealed class` for exhaustive state handling in domain logic.
- **Extensions**: Use `extension` to add utility methods to third-party types.
- **Wildcards (3.7+)**: Use `_` for unused variables in declarations and patterns.
- **Tear-offs**: Prefer using tear-offs (e.g., `list.forEach(print)`) over anonymous lambdas (e.g., `list.forEach((e) => print(e))`).
- **Asynchrony**: Prefer `async/await` over raw `Future.then`. Use `unawaited` for fire-and-forget logic if necessary.
- **Encapsulation**: Use `_` prefix for library-private members. Prefer `final` properties.
- **Collections**: Use `collection-if`, `collection-for`, and spread operators `...`.
- **Safe List Access**: Prefer `.firstOrNull`, `.lastOrNull`, or `.elementAtOrNull(i)`.
- **No dynamic**: Use `Object` or generics instead of `dynamic`.
- **Type Aliases**: Use `typedef` for complex IDs or callbacks.

## Anti-Patterns

- **No ! Operator**: don't use the bang operator `!` unless non-nullness is established by control-flow narrowing or an invariant enforced at the boundary. `assert` is stripped from production builds and is not proof.
- **Language Version Gates**: Constructs follow the package's language version (SDK constraint lower bound; Flutter bundles its own Dart). Wildcards need 3.7+, primary constructors need 3.13+ — check before emitting either.
- **No var for members**: not use `var` for class members; use `final` or explicit types.
- **No logic in constructors**: not perform complex calculations or async work inside constructors.
- **No zero-arg methods for pure computations**: Use a getter. `int get invoiceType =>` not `int toInvoiceType()`.
- **No generic conversion names**: Name value-object converters for their target context: `get apiFilterType` not `get invoiceType`.

## Code

```dart
// Sealed class and Switch expression
sealed class Result {}
class Success extends Result { final String data; Success(this.data); }
class Failure extends Result {}

String message(Result r) => switch (r) {
  Success(data: var d) => "Got $d",
  Failure() => "Error",
};
```

## References

- [Primary Constructors (3.13+)](references/primary-constructors.md) — gated syntax and compatibility rules.
- feature-based-clean-architecture | tooling

## Null-safety checklist

- Replace `!` with `?`-aware access, explicit narrowing, a guard clause, or `throw` on the boundary; do not silence nullability with a force unwrap.
- Never cite `assert` as the reason a `!` is safe: assertions do not run in production.

