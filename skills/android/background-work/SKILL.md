---
name: Android Background Work
description: Standards for WorkManager and Background Processing
metadata:
  labels: [android, background, workmanager]
  triggers:
    files: ['**/*Worker.kt']
    keywords: ['CoroutineWorker', 'WorkManager', 'doWork']
---

# Android Background Work Standards

## **Priority: P1**

## Implementation Guidelines

### WorkManager

- **CoroutineWorker**: Use for all background tasks.
- **Constraints**: Be explicit (Require Network, Charging).
- **Hilt**: Use `@HiltWorker` for DI integration.

### Foreground Services

- **Only When Necessary**: Use generating visible notifications only for tasks the user is actively aware of (Playback, Calls, Active Navigation). Otherwise use WorkManager.

## Anti-Patterns

- **IntentService**: `**Deprecated**: Use WorkManager.`
- **Short Jobs**: `**No short background jobs**: Use standard Coroutines in VM.`

## References

- [Worker Template](references/implementation.md)
