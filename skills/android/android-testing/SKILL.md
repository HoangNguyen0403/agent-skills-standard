---
name: android-testing
description: "Write Unit Tests, UI Tests (Compose), and Hilt-integrated tests for Android. Use whenever writing Android test files or asking about runTest, composeTestRule, HiltAndroidRule, MockK, MainDispatcherRule, @TestInstallIn, or how to test a ViewModel/Composable/Repository in Android. (triggers: **/*Test.kt, **/*Rule.kt, @Test, runTest, composeTestRule, HiltAndroidTest, MockK, createAndroidComposeRule, MainDispatcherRule, @TestInstallIn)"
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
