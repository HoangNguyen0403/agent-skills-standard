---
name: android-edge-to-edge
description: Migrate a Jetpack Compose app to edge-to-edge display and fix system bar inset issues. Use when UI components are obscured by navigation/status bars, fixing IME insets, or enabling edge-to-edge for SDK 35+.
metadata:
  triggers:
    files:
    - '**/*Activity.kt'
    - '**/*Screen.kt'
    - 'AndroidManifest.xml'
    keywords:
    - edge-to-edge
    - enableEdgeToEdge
    - system bars
    - WindowInsets
    - safeDrawingPadding
    - imePadding
    - status bar
    - navigation bar
---
# Edge-to-Edge Migration

## **Priority: P1**

Structured workflow for migrating a Compose app to edge-to-edge display.

## Prerequisites

- Project **MUST** use Jetpack Compose.
- Project **MUST** target SDK 35+. If lower, increase `compileSdk` to 35.

## Step 1: Plan

1. Locate all Activity classes. For each without `enableEdgeToEdge()`, plan to add it.
2. In each Activity, find all lists, FABs, and text fields that need inset handling.
3. If `TextField`/`OutlinedTextField` is present, plan IME inset handling.

## Step 2: Enable edge-to-edge

1. Add `enableEdgeToEdge()` before `setContent` in every `Activity.onCreate`.
2. Add `android:windowSoftInputMode="adjustResize"` in AndroidManifest for Activities with soft keyboard.

## Step 3: Apply insets

Choose ONE method per component to avoid double padding:

1. **PREFERRED — Scaffold**: Pass `PaddingValues` to content lambda.
2. **Material 3 components**: Use built-in inset handling (`TopAppBar`, `NavigationBar`, etc.).
3. **Outside Scaffold**: Use `Modifier.safeDrawingPadding()` or `windowInsetsPadding`.

See [inset patterns](references/inset-patterns.md) for RIGHT/WRONG code examples.

## Step 4: Handle IME

For Activities with soft keyboard:
- Set `adjustResize` in manifest (NOT deprecated `SOFT_INPUT_ADJUST_RESIZE`).
- Add `imePadding()` or `fitInside(WindowInsetsRulers.Ime.current)` to content container.
- Place `imePadding` BEFORE `verticalScroll()`.

See [inset patterns](references/inset-patterns.md) for IME-specific RIGHT/WRONG patterns.

## Step 5: Lists and FABs

- Apply inset padding to `contentPadding` of `LazyColumn`/`LazyRow`, NOT as `Modifier.padding()` on parent.
- FABs inside Scaffold are handled automatically. Outside Scaffold, use `safeDrawingPadding()`.

## Verification

- [ ] Every `Activity` calls `enableEdgeToEdge()`.
- [ ] `adjustResize` set in AndroidManifest for keyboard Activities.
- [ ] Text fields have IME inset handling.
- [ ] List items scroll behind system bars via `contentPadding`.
- [ ] `./gradlew build` succeeds.

## Anti-Patterns

- **No double inset padding**: Never combine `contentWindowInsets = WindowInsets.safeDrawing` with `imePadding()` on the same content — causes double padding when IME opens.
- **No parent padding on lists**: Apply insets to `contentPadding`, not parent `Modifier.padding()` — parent padding clips scrolling content.
- **No `SOFT_INPUT_ADJUST_RESIZE`**: Deprecated. Use manifest `adjustResize` attribute.

## References

- [Inset Patterns (RIGHT/WRONG)](references/inset-patterns.md)
