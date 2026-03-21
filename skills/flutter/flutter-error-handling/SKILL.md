---
name: flutter-error-handling
description: 'Functional error handling with Either/Failure. ALWAYS consult when writing repositories, handling exceptions, defining failures, or using Either in any Flutter layer — not just when setting up error handling. (triggers: lib/domain/**, lib/infrastructure/**, Either, fold, Left, Right, Failure, dartz)'
---

# Error Handling

## **Priority: P1 (HIGH)**

Standardized functional error handling using `dartz` and `freezed` failures.

## Implementation Guidelines

- **Either Pattern**: Return **Either<Failure, T>** from repositories. No exceptions in UI/BLoC.
- **Failures**: Define domain-specific failures using **@freezed** unions (e.g., `UnauthorizedFailure`, `OutOfStockFailure`).
- **Mapping**: **Infrastructure catches Exception** (e.g., `DioException`) and returns **Left(Failure)**. **Never rethrow to UI.**
- **Consumption**: Use **.fold(failure, success)** in BLoC to emit corresponding states. **Remove try/catch from BLoC.**
- **Typed Errors**: Use `left(Failure())` and `right(Value())` from `Dartz`.
- **Low-Cardinality Logging**: Use stable message templates; pass variable data via metadata/context.
- **Layer Restriction**: **try/catch only in Infrastructure.** UI/Application/BLoC layers should not catch.
- **Localization**: Use `failure.failureMessage` (returns **TRObject** or localized string) for UI-safe text.
- **Right/Left Restriction**: Only Infrastructure may construct `Right()`/`Left()`.
- **No Silent Catch**: Never swallow errors without logging or a documented retry.

## Reference & Examples

For Failure definitions and API error mapping:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- ❌ `try { … } catch (e) { emit(ErrorState()); }` in BLoC — try/catch belongs only in Infrastructure; BLoC receives `Either`, then folds
- ❌ `Left(Failure('Something went wrong'))` using a plain `String` — define typed `@freezed` Failure subclasses for each domain error
- ❌ `catch (e) {}` empty catch — always log and propagate; never swallow silently
- ❌ Throwing `Exception` from a repository — return `Left(Failure)` instead; exceptions must not cross the infrastructure boundary

## Related Topics

layer-based-clean-architecture | bloc-state-management
