The composable body is declarative code that may execute many times, in any recomposition, and may execute even when the composition is later abandoned. A side effect there can therefore run repeatedly, trigger duplicate work, mutate state during composition, or cause an infinite recomposition loop.

Put the effect in the API that matches its lifetime:

```kotlin
LaunchedEffect(userId) {
    viewModel.load(userId)
}

DisposableEffect(connection) {
    connection.connect()
    onDispose { connection.disconnect() }
}

SideEffect {
    analytics.setScreen("Details")
}
```

`LaunchedEffect` runs when entering composition and restarts when its keys change; its coroutine is cancelled when it leaves. Use an event handler (often with `rememberCoroutineScope`) for work caused by a user action, and keep business side effects in the ViewModel where possible. Choose keys that represent exactly when the effect should restart.

