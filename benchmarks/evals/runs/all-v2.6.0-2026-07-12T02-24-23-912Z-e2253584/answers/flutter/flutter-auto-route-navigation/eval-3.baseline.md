Use `AutoTabsRouter` for the bottom tabs and keep each tab page stateful so Flutter can preserve each tab’s widget tree instead of rebuilding it from scratch on every switch.

Typical setup:

```dart
@RoutePage()
class MainTabsPage extends StatelessWidget {
  const MainTabsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AutoTabsRouter(
      routes: const [
        HomeRoute(),
        SearchRoute(),
        ProfileRoute(),
      ],
      builder: (context, child) {
        final tabsRouter = AutoTabsRouter.of(context);

        return Scaffold(
          body: child,
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: tabsRouter.activeIndex,
            onTap: tabsRouter.setActiveIndex,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        );
      },
    );
  }
}
```

Then inside each tab page, use normal Flutter state-preservation patterns for scrollable content:

```dart
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage>
    with AutomaticKeepAliveClientMixin<HomePage> {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    return ListView.builder(
      key: const PageStorageKey('home-list'),
      itemCount: 100,
      itemBuilder: (_, index) => ListTile(title: Text('Item $index')),
    );
  }
}
```

What usually causes reset:

- using `context.router.push(...)` between tabs instead of `AutoTabsRouter`
- recreating tab pages every build
- not keeping tab pages alive
- missing `PageStorageKey` on scrollable widgets

Recommended fix:

1. Build tabs with `AutoTabsRouter`.
2. Switch tabs with `tabsRouter.setActiveIndex`.
3. Add `AutomaticKeepAliveClientMixin` to tab pages that should stay alive.
4. Give long lists a stable `PageStorageKey`.

That combination preserves tab state and keeps scroll position when moving between bottom tabs.

