---
name: android-xml-views
description: Implement ViewBinding, RecyclerView, and XML layouts correctly on Android. Use when changing XML view binding or RecyclerView behavior, including its item animations and layout managers; defer standalone animation or layout-manager questions unrelated to RecyclerView.
metadata:
  triggers:
    files:
    - 'layout/*.xml'
    - '**/*Binding.java'
    - '**/*Binding.kt'
    keywords:
    - ViewBinding
    - ConstraintLayout
    - RecyclerView
---
# Android XML Views Standards

## **Priority: P1 (HIGH)**

## Implementation Guidelines

### ViewBinding

- **Standard**: Use ViewBinding for all XML layouts.
- **Synthetics**: `kotlin-android-extensions` Dead. Remove it.
- **KAPT**: Avoid DataBinding unless strictly necessary (impacts build speed).

### RecyclerView

- **Adapter**: Always inherit `ListAdapter` (wraps AsyncListDiffer).
- **Updates**: Provide proper `DiffUtil.ItemCallback`. NEVER call `notifyDataSetChanged()`.

### Layouts

- **ConstraintLayout**: Use for complex flat hierarchies.
- **Performance**: Avoid deep nesting (LinearLayout inside LinearLayout).

## Anti-Patterns

- **No findViewById**: Deprecated. Use ViewBinding for all XML layouts.
- **No kotlin-android-extensions**: Deprecated. Remove all `import kotlinx.android.synthetic.*`.

## References

- [ViewBinding & Adapter](references/implementation.md)
