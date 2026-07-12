# Bottom navigation with multiple back stacks

Give each bottom-navigation tab its own `rememberNavBackStack`. Switching tabs changes which stack is supplied to `NavDisplay`; it does not clear the old stack. Each stack should have a distinct root key, and every key that can occur in any stack should be registered in the shared `entryProvider`.

```kotlin
enum class Tab {
    Home, Search, Settings
}

@Serializable
sealed interface AppRoute : NavKey {
    @Serializable
    data object HomeRoot : AppRoute

    @Serializable
    data class HomeDetails(val id: String) : AppRoute

    @Serializable
    data object SearchRoot : AppRoute

    @Serializable
    data class SearchDetails(val query: String) : AppRoute

    @Serializable
    data object SettingsRoot : AppRoute
}

@Composable
fun App() {
    val homeStack = rememberNavBackStack(AppRoute.HomeRoot)
    val searchStack = rememberNavBackStack(AppRoute.SearchRoot)
    val settingsStack = rememberNavBackStack(AppRoute.SettingsRoot)
    var selectedTab by rememberSaveable { mutableStateOf(Tab.Home) }

    val currentStack = when (selectedTab) {
        Tab.Home -> homeStack
        Tab.Search -> searchStack
        Tab.Settings -> settingsStack
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == Tab.Home,
                    onClick = { selectedTab = Tab.Home },
                    icon = { /* home icon */ },
                    label = { Text("Home") },
                )
                NavigationBarItem(
                    selected = selectedTab == Tab.Search,
                    onClick = { selectedTab = Tab.Search },
                    icon = { /* search icon */ },
                    label = { Text("Search") },
                )
                NavigationBarItem(
                    selected = selectedTab == Tab.Settings,
                    onClick = { selectedTab = Tab.Settings },
                    icon = { /* settings icon */ },
                    label = { Text("Settings") },
                )
            }
        },
    ) { paddingValues ->
        Box(Modifier.padding(paddingValues)) {
            NavDisplay(
                backStack = currentStack,
                onBack = {
                    if (currentStack.size > 1) {
                        currentStack.removeLastOrNull()
                    } else {
                        // Delegate root-level back to the activity/system.
                    }
                },
                entryProvider = entryProvider {
                    entry<AppRoute.HomeRoot> {
                        HomeScreen(
                            onOpenDetails = { id ->
                                homeStack.add(AppRoute.HomeDetails(id))
                            },
                        )
                    }
                    entry<AppRoute.HomeDetails> { key ->
                        HomeDetailsScreen(id = key.id)
                    }
                    entry<AppRoute.SearchRoot> {
                        SearchScreen(
                            onOpenDetails = { query ->
                                searchStack.add(AppRoute.SearchDetails(query))
                            },
                        )
                    }
                    entry<AppRoute.SearchDetails> { key ->
                        SearchDetailsScreen(query = key.query)
                    }
                    entry<AppRoute.SettingsRoot> {
                        SettingsScreen()
                    }
                },
            )
        }
    }
}
```

The three lists are independent. If a user opens Home details, switches to Search, opens Search details, and returns to Home, the Home stack still contains `HomeRoot` followed by `HomeDetails`. The same `NavDisplay` can render whichever list is current because the list is the navigation state.

Decide what a repeated tap on the already-selected tab should do. A common bottom-navigation policy is to pop that tab to its root:

```kotlin
fun popToRoot(stack: MutableList<NavKey>) {
    while (stack.size > 1) stack.removeLast()
}

fun selectTab(tab: Tab) {
    if (selectedTab == tab) {
        when (tab) {
            Tab.Home -> popToRoot(homeStack)
            Tab.Search -> popToRoot(searchStack)
            Tab.Settings -> popToRoot(settingsStack)
        }
    } else {
        selectedTab = tab
    }
}
```

Alternatively, repeated taps can be no-ops. The essential requirements are that each tab owns a persistent stack, tab selection does not recreate or replace that stack, and root/back behavior is explicitly defined. Serializable route keys allow the tab selection and stacks to be restored after configuration change or process recreation when the relevant state-restoration setup is in place.

