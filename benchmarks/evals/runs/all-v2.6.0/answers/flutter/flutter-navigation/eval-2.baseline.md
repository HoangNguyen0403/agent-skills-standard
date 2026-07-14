Use a separate `Navigator` for each tab and intercept the system back action.

Typical behavior:
- If the current tab can pop, pop within that tab
- Else if the current tab is not the home/default tab, switch to the default tab
- Else allow the app to exit

In Flutter, wrap the scaffold with `PopScope` (or `WillPopScope` on older code) and check the active tab navigator with a `GlobalKey<NavigatorState>`.

Example flow:

```dart
final navigatorKeys = [
  GlobalKey<NavigatorState>(),
  GlobalKey<NavigatorState>(),
  GlobalKey<NavigatorState>(),
];

int currentIndex = 0;

Future<bool> onBackPressed() async {
  final currentNavigator = navigatorKeys[currentIndex].currentState!;

  if (currentNavigator.canPop()) {
    currentNavigator.pop();
    return false;
  }

  if (currentIndex != 0) {
    currentIndex = 0;
    return false;
  }

  return true;
}
```

Then connect that to:

```dart
WillPopScope(
  onWillPop: onBackPressed,
  child: Scaffold(...),
)
```

If you are not using nested navigators per tab, Flutter has no per-tab back stack to return to, so back will usually exit the app. The fix is usually nested navigation plus back interception.

