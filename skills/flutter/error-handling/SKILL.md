---
name: Flutter Error Handling
description: Functional error handling using Dartz and Either.
metadata:
  labels: [error-handling, dartz, functional]
  triggers:
    files: ['lib/domain/**', 'lib/infrastructure/**']
    keywords: [Either, fold, Left, Right, Failure, dartz]
---

# Error Handling

## **Priority: P1 (HIGH)**

Standardized functional error handling using `dartz` and `freezed` failures.

## Implementation Guidelines

- **Either Pattern**: Return `Either<Failure, T>` from repositories. No exceptions in UI/BLoC.
- **Failures**: Define domain-specific failures using `@freezed` unions.
- **Mapping**: Infrastructure catches `Exception` and returns `Left(Failure)`.
- **Consumption**: Use `.fold(failure, success)` in BLoC to emit corresponding states.
- **Typed Errors**: Use `left(Failure())` and `right(Value())` from `Dartz`.
- **Low-Cardinality Logging**: Use stable message templates; pass variable data via metadata/context.
- **Layer Restriction**: `try/catch` only in Infrastructure. UI/Application should not catch.
- **Failure Mapping**: Convert external exceptions with `FailureHandler.handleFailure(e)`.
- **Localization**: Use `failure.failureMessage` (returns `TRObject`) for UI-safe text.
- **Right/Left Restriction**: Only Infrastructure may construct `Right()`/`Left()`.
- **No Silent Catch**: Never swallow errors without logging or a documented retry.

## Reference & Examples

For Failure definitions and API error mapping:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

layer-based-clean-architecture | bloc-state-management
