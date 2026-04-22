---
name: android-compose-migration
description: Migrate an Android XML View to Jetpack Compose following a structured 10-step workflow. Use when converting XML layouts to Compose, setting up Compose in an existing View-based project, or incrementally adopting Compose.
metadata:
  triggers:
    files:
    - 'layout/*.xml'
    - '**/*Fragment.kt'
    - '**/*Activity.kt'
    keywords:
    - migrate to compose
    - xml to compose
    - compose migration
    - ComposeView
    - AndroidView
    - interoperability
---
# XML to Jetpack Compose Migration

## **Priority: P1**

Structured 10-step workflow for migrating XML layouts to Compose.

## Step 1: Identify the migration candidate

If the user specified a target XML layout, proceed to Step 2. Otherwise, pick the best candidate:
- Prefer leaf layouts (not deeply nested in other XMLs).
- Prefer layouts with few custom Views.
- Avoid layouts with complex RecyclerView adapters as a first migration.

## Step 2: Analyze the layout

Examine the XML structure: list all Views, data bindings, click listeners, style references, and custom Views needing `AndroidView` wrappers.

## Step 3: Create a plan

Generate a checklist of every View → Composable mapping. Present to user for approval.

## Step 4: Capture baseline UI

Ask the user for a screenshot, or take one via emulator for visual comparison.

## Step 5: Set up Compose dependencies

Check `build.gradle.kts` or `libs.versions.toml` for Compose BOM and compiler. If missing, add them. See [dependency setup](references/dependency-setup.md).

## Step 6: Set up Compose theming

If missing, initialize minimum required theme — map XML colors/styles to Compose. Do NOT migrate the entire theme.

## Step 7: Migrate the XML layout

Convert each View to its Compose equivalent. See [interop patterns](references/interop-patterns.md) for the View→Composable mapping table, ComposeView, and AndroidView usage. Include a `@Preview` for every new Composable.

## Step 8: Replace usages

Use `ComposeView` to host Compose in Views, or `AndroidView` for Views in Compose. See [interop patterns](references/interop-patterns.md).

## Step 9: Validate

Compare baseline screenshot with Compose Preview. Focus on layout and styling. Iterate until visual parity.

## Step 10: Clean up

Delete the migrated XML file and legacy tests. Only remove code not referenced elsewhere.

## Verification

- [ ] Compose Preview renders correctly.
- [ ] Visual parity with original XML layout.
- [ ] `./gradlew build` succeeds.
- [ ] No broken references to deleted XML files.

## Anti-Patterns

- **No full theme migration**: Only migrate what the target layout needs.
- **No new View instances in AndroidView update**: Mutate existing, don't recreate.
- **No missing ViewCompositionStrategy**: Always set it on ComposeView to avoid leaks.

## References

- [Dependency Setup](references/dependency-setup.md)
- [Interop Patterns](references/interop-patterns.md)
