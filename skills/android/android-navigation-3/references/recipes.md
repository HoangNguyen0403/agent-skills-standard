# Navigation 3 Recipes

## Bottom navigation with multiple backstacks

```kotlin
@Composable
fun MainScreen() {
    val tabs = listOf(Tab.Home, Tab.Search, Tab.Profile)
    var selectedTab by remember { mutableStateOf(Tab.Home) }
    val backstacks = remember {
        tabs.associateWith { mutableStateListOf<Any>(it.startRoute) }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        val currentBackStack = backstacks[selectedTab]!!
        NavDisplay(
            backStack = currentBackStack,
            onBack = { currentBackStack.removeLastOrNull() },
            modifier = Modifier.padding(innerPadding),
            entryProvider = { key -> /* route entries */ }
        )
    }
}
```

## Dialog destination

```kotlin
// Define a dialog route
data class ConfirmDeleteDialog(val itemId: String)

// In entryProvider, use NavEntry with scene
entryProvider = { key ->
    when (key) {
        is ConfirmDeleteDialog -> NavEntry(
            key = key,
            scene = DialogScene,  // Built-in dialog scene
        ) {
            AlertDialog(
                onDismissRequest = { backStack.removeLastOrNull() },
                title = { Text("Delete?") },
                confirmButton = {
                    TextButton(onClick = {
                        deleteItem(key.itemId)
                        backStack.removeLastOrNull()
                    }) { Text("Delete") }
                }
            )
        }
        // ... other routes
    }
}

// Navigate to dialog
backStack.add(ConfirmDeleteDialog(itemId = "123"))
```

## Conditional navigation (auth flow)

```kotlin
@Composable
fun AppNavigation(isLoggedIn: Boolean) {
    val backStack = remember(isLoggedIn) {
        mutableStateListOf<Any>(
            if (isLoggedIn) RouteHome else RouteLogin
        )
    }

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = { key ->
            when (key) {
                is RouteLogin -> NavEntry(key) {
                    LoginScreen(onLoginSuccess = {
                        backStack.clear()
                        backStack.add(RouteHome)
                    })
                }
                is RouteHome -> NavEntry(key) { HomeScreen() }
                else -> error("Unknown: $key")
            }
        }
    )
}
```

## Returning results between screens

```kotlin
// Using state hoisting — parent owns the result
@Composable
fun ParentNavigation() {
    var selectedColor by remember { mutableStateOf<Color?>(null) }
    val backStack = remember { mutableStateListOf<Any>(RouteSettings) }

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = { key ->
            when (key) {
                is RouteSettings -> NavEntry(key) {
                    SettingsScreen(
                        currentColor = selectedColor,
                        onPickColor = { backStack.add(RouteColorPicker) }
                    )
                }
                is RouteColorPicker -> NavEntry(key) {
                    ColorPickerScreen(onColorSelected = { color ->
                        selectedColor = color
                        backStack.removeLastOrNull()
                    })
                }
                else -> error("Unknown: $key")
            }
        }
    )
}
```

## Saveable backstack (survives process death)

```kotlin
val backStack = rememberMutableStateListOf<Any>(RouteHome)

// rememberMutableStateListOf persists across config changes and process death
// Routes must be Parcelable or @Serializable
```
