---
name: android-background-work
description: 'Standards for WorkManager and Background Processing. Use when creating Worker classes, scheduling tasks with WorkManager, choosing between WorkManager and Foreground Services, or setting up Hilt in workers. (triggers: **/*Worker.kt, CoroutineWorker, WorkManager, doWork, PeriodicWorkRequest, OneTimeWorkRequest, @HiltWorker)'
---

# Android Background Work Standards

## **Priority: P1**

## Implementation Guidelines

### WorkManager

- **CoroutineWorker**: Use for all background tasks.
- **Constraints**: Be explicit (Require Network, Charging).
- **Hilt**: Use `@HiltWorker` for DI integration. Inject dependencies via `@AssistedInject` constructor; bind with `HiltWorkerFactory` in `WorkManager` configuration.

### Foreground Services

- **Only When Necessary**: Use generating visible notifications only for tasks the user is actively aware of (Playback, Calls, Active Navigation). Otherwise use WorkManager.

## Anti-Patterns

- **No IntentService**: Deprecated. Use WorkManager for all background tasks.
- **No Short Background Jobs**: Use Coroutines in ViewModel scope instead.

## References

- [Worker Template](references/implementation.md)
