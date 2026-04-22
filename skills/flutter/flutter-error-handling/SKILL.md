---
name: flutter-error-handling
description: Implement functional error recovery with Either/Failure patterns in Flutter. Use when writing repositories, handling exceptions, or using dartz Either types.
metadata:
  triggers:
    files:
    - 'lib/domain/**'
    - 'lib/infrastructure/**'
    keywords:
    - Either
    - fold
    - Left
    - Right
    - Failure
    - dartz
---
# Error Handling

## **Priority: P1 (HIGH)**


## Implementation Workflow

1. **Define failures** — Create domain-specific failures using `@freezed` unions (e.g., `UnauthorizedFailure`, `OutOfStockFailure`).
2. **Return Either** — Repositories return `Either<Failure, T>`. No exceptions in UI/BLoC.
3. **Catch in Infrastructure only** — Infrastructure catches exceptions (e.g., `DioException`) and returns `Left(Failure)`. Never rethrow to UI.
4. **Fold in BLoC** — Use `.fold(failure, success)` in BLoC to emit corresponding states. Remove try/catch from BLoC.
5. **Localize messages** — Use `failure.failureMessage` (returns `TRObject` or localized string) for UI-safe text.
6. **Log with stable templates** — Use low-cardinality message templates; pass variable data via metadata/context.
7. **No Silent Catch**: Never swallow errors without logging or documented retry.
8. **Crashlytics Routing**: All UI/BLoC `catch` blocks MUST route errors via `AppLogger.error(AppException.fromException(e).message, error: e, stackTrace: st)` for observability and type-safe UI messages.

### Repository & BLoC Examples

See [implementation examples](references/implementation.md) for repository error mapping and BLoC consumption patterns.

## Reference & Examples

For Failure definitions and API error mapping:
See [references/REFERENCE.md](references/REFERENCE.md).

## Anti-Patterns

- **No Try-Catch in BLoC**: BLoC receives `Either` and `folds`; try/catch belongs in Infrastructure
- **No Plain String Failures**: Define typed `@freezed` Failure subclasses instead of `Left('Something went wrong')`
- **No Empty Catch Blocks**: Always log and propagate; never swallow errors silently
- **No Repositories Throwing Status**: Return `Left(Failure)` instead of throwing `Exception`
- **No Missing Log Registration**: Use `AppLogger.error` in BLoC/UI `catch` to ensure Crashlytics tracking and type-safe UI messages

## Related Topics

layer-based-clean-architecture | bloc-state-management