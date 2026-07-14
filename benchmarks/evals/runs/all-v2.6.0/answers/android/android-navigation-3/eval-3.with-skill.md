# Bottom navigation with multiple back stacks

Give each bottom-navigation tab its own `mutableStateListOf<Any>`. Switching tabs changes which list is supplied to `NavDisplay`, so each tab retains its independent navigation history.

```kotlin
enum class Tab(val label: String, val startRoute: Any) {
    Home("Home", RouteHome),
    Search("Search", RouteSearch),
    Profile("Profile", RouteProfile)
}

data object RouteHome
data object RouteSearch
data object RouteProfile
data class RouteDetail(val id: String)

@Composable
fun MainScreen() {
    val tabs = remember { Tab.entries.toList() }
    var selectedTab by remember { mutableStateOf(Tab.Home) }

    val backStacks = remember {
        tabs.associateWith { tab ->
            mutableStateListOf<Any>(tab.startRoute)
        }
    }

    val currentBackStack = backStacks.getValue(selectedTab)

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { /* tab icon */ },
                        label = { Text(tab.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavDisplay(
            backStack = currentBackStack,
            onBack = { currentBackStack.removeLastOrNull() },
            modifier = Modifier.padding(innerPadding),
            entryProvider = { key ->
                when (key) {
                    is RouteHome -> NavEntry(key) {
                        HomeScreen(
                            onOpenDetail = { id ->
                                currentBackStack.add(RouteDetail(id))
                            }
                        )
                    }

                    is RouteSearch -> NavEntry(key) {
                        SearchScreen(
                            onOpenDetail = { id ->
                                currentBackStack.add(RouteDetail(id))
                            }
                        )
                    }

                    is RouteProfile -> NavEntry(key) {
                        ProfileScreen()
                    }

                    is RouteDetail -> NavEntry(key) {
                        DetailScreen(id = key.id)
                    }

                    else -> error("Unknown route: $key")
                }
            }
        )
    }
}
```

The important part is that `backStacks` is created once with `remember`; recreating the map on every recomposition would discard the tab histories. For example:

1. Home starts as `[RouteHome]` and opens `RouteDetail("a")`.
2. Switching to Search renders `[RouteSearch]` without changing Home's list.
3. Search can build its own stack, such as `[RouteSearch, RouteDetail("b")]`.
4. Returning to Home renders `[RouteHome, RouteDetail("a")]` again.

Back presses operate on the currently selected tab's list. The root entry can be protected if the app should not allow an empty stack:

```kotlin
onBack = {
    if (currentBackStack.size > 1) {
        currentBackStack.removeLast()
    }
}
```

This is state-driven Navigation 3: there is no `NavController`, no string route matching, and no shared global back stack. If the product wants a reselected tab to return to its root, explicitly clear that tab's list and add its `startRoute`; otherwise leave it untouched to preserve the current tab history.

