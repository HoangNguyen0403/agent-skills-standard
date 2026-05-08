---
name: flutter-widgets
description: Build maintainable Flutter UI components with composition and theming. Use when building, refactoring, or reviewing widget implementations.
metadata:
  triggers:
    files:
    - '**_page.dart'
    - '**_screen.dart'
    - '**/widgets/**'
    keywords:
    - StatelessWidget
    - const
    - Theme
    - ListView
---
# UI & Widgets

## **Priority: P1 (OPERATIONAL)**


- **State**: Use `StatelessWidget` by default. `StatefulWidget` only for local state/controllers.
- **Composition**: Extract UI into small, atomic `const` widgets.
- **Theming**: Use `Theme.of(context)`. No hardcoded colors.
- **Layout**: Use `Flex` + `Gap/SizedBox`.
- **Widget Keys**: All interactive elements must use keys from `widget_keys.dart`.
- **File Size**: If UI file exceeds ~80 lines, extract sub-widgets into private classes.
- **Specialized**:
 - `SelectionArea`: For multi-widget text selection.
 - `InteractiveViewer`: For zoom/pan.
 - `ListWheelScrollView`: For pickers.
 - `IntrinsicWidth/Height`: Avoid unless strictly required.
- **Large Lists**: Always use `ListView.builder`.

```dart
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  const AppButton({super.key, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) => ElevatedButton(onPressed: onPressed, child: Text(label));
}
```

## Anti-Patterns

- **No setState for server state**: Server or shared state belongs in BLoC, not widget state.
- **No widget file over 80 lines without extraction**: Extract sub-widgets into private classes.
- **No inline Key strings**: All keys must constants defined in `widget_keys.dart`.
- **No \_buildXxx() helper methods**: Extract to `const StatelessWidget` private class.
- **No manual widget repetition**: When 3+ sibling widgets of the same type differ only in data (e.g., radio buttons, tabs), map over a list instead. Put display labels inside the value object or a companion map so adding an option requires no UI change.

## References

- performance | testing