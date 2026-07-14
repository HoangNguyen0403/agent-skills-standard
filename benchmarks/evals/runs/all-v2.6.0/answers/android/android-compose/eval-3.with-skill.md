# Why side effects do not belong in the composable body

The composition body may run many times, may be skipped, and may be restarted. A side effect placed there can therefore run more often than intended, run again after unrelated state changes, or be interrupted by recomposition. It also makes ordering and cancellation unclear.

Use `LaunchedEffect` for coroutine-based one-shot or keyed work. Its key defines when the work is restarted, and Compose cancels the previous coroutine when the key leaves scope or changes.

```kotlin
@Composable
fun DetailScreen(itemId: Long, viewModel: DetailViewModel) {
    LaunchedEffect(itemId) {
        viewModel.load(itemId)
    }
}
```

Use an appropriate key: `LaunchedEffect(Unit)` for work that should run once while this composable instance is present, or a changing value such as `itemId` when the effect should reload for that value. Do not launch raw coroutines or perform mutations during composition. Keep expensive calculations in the `ViewModel` or behind `remember`, and keep the screen/content state boundary clear.

