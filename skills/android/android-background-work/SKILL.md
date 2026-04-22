---
name: android-background-work
description: Implement WorkManager and background processing correctly on Android. Use when creating Worker classes, scheduling tasks, choosing between WorkManager and Foreground Services, or setting up Hilt in workers.
metadata:
  triggers:
    files:
      - '**/*Worker.kt'
    keywords:
      - CoroutineWorker
      - WorkManager
      - doWork
      - PeriodicWorkRequest
      - OneTimeWorkRequest
      - '@HiltWorker'
---

# Android Background Work Standards

## **Priority: P1**

## Implementation Guidelines

### WorkManager

- **CoroutineWorker**: Use for all background tasks.
- **Constraints**: explicit (Require Network, Charging).
- **Hilt**: Use `@HiltWorker` for DI integration. Inject dependencies via `@AssistedInject` constructor; bind with `HiltWorkerFactory` in `WorkManager` configuration.

### Foreground Services

- **Only When Necessary**: Use generating visible notifications only for tasks user actively aware of (Playback, Calls, Active Navigation). Otherwise use WorkManager.

## Anti-Patterns

- **No IntentService**: Deprecated. Use WorkManager for all background tasks.
- **No Short Background Jobs**: Use Coroutines in ViewModel scope instead.

## References

- [Worker Template](references/implementation.md)
