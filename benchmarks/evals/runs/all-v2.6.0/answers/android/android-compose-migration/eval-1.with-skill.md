# Starting an XML-to-Compose migration

Start with one small, leaf XML layout rather than migrating the whole app.

1. **Identify the candidate.** Prefer a shallow layout with few custom Views and no complex `RecyclerView` adapter.
2. **Analyze the XML.** Inventory every View, layout relationship, data binding, click listener, style/color, and custom View. Mark custom Views that will need `AndroidView`.
3. **Create a View-to-Compose checklist and get approval.** For example: `TextView` → `Text`, `ImageView` → `Image`, `Button` → `Button`, `LinearLayout` → `Column`/`Row`, and `RecyclerView` → `LazyColumn`/`LazyRow`.
4. **Capture a baseline screenshot** of the existing screen for later visual comparison.
5. **Check Compose setup.** Inspect `build.gradle.kts` or `libs.versions.toml` for the Compose BOM/compiler and add only missing dependencies.
6. **Map the required theme surface.** Recreate only the colors, typography, shapes, and dimensions used by this layout; do not migrate the entire app theme.
7. **Implement the composable.** Preserve spacing, constraints, accessibility, state, and events. Use `AndroidView` for an unavoidable legacy/custom View, and add a `@Preview` for each new Composable.
8. **Choose the integration boundary.** Host the new UI in the existing Fragment/Activity with `ComposeView`, or host remaining legacy Views inside Compose with `AndroidView`.
9. **Validate.** Compare the baseline with the Compose Preview/emulator, then run `./gradlew build` and check interactions, state, accessibility, and configuration changes.
10. **Clean up only after replacement is verified.** Delete the XML and legacy tests only when no references remain; confirm there are no broken resource references.

The first concrete deliverable should therefore be the candidate layout analysis plus the View→Composable mapping checklist, followed by baseline capture and an approved migration plan.

