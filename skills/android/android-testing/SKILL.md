---
name: android-testing
description: Write unit tests, Compose UI tests, and Hilt-integrated tests for Android. Use when writing test files or testing ViewModels, Composables, or Repositories with MockK and coroutine test utilities.
metadata:
  triggers:
    files:
    - '**/*Test.kt'
    - '**/*Rule.kt'
    keywords:
    - "@Test"
    - runTest
    - composeTestRule
    - HiltAndroidTest
    - MockK
    - createAndroidComposeRule
    - MainDispatcherRule
    - "@TestInstallIn"
---
# Android Testing Standards

## **Priority: P0**

## Implementation Guidelines

### Unit Tests

- **Scope**: ViewModels, Usecases, Repositories, Utils.
- **Coroutines**: Use `runTest` (kotlinx-coroutines-test). Use `MainDispatcherRule` to mock Main dispatcher.
- **Mocking**: Use MockK.

### UI Integration Tests (Instrumentation)

- **Scope**: Composable Screens, Navigation flows.
- **Rules**: Use `createAndroidComposeRule` + Hilt (`HiltAndroidRule`).
- **Isolation**: Fake repositories in DI modules (`@TestInstallIn`).

## Anti-Patterns

- **No Real Network in Tests**: Always mock with MockK or fake repositories via @TestInstallIn.
- **No Thread.sleep**: Use IdlingResource or composeTestRule.waitUntil for async timing.

## References

- [Test Rules](references/implementation.md)