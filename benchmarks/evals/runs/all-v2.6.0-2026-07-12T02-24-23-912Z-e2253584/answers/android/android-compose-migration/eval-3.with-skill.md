# Compose equivalent of `RecyclerView` with `LinearLayoutManager`

Use `LazyColumn` for a vertically scrolling `RecyclerView` with `LinearLayoutManager`, and `LazyRow` for a horizontal one. Items are composed lazily instead of creating one large static layout.

```kotlin
@Composable
fun MessageList(
    messages: List<Message>,
    onMessageClick: (Message) -> Unit,
) {
    val listState = rememberLazyListState()

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(
            items = messages,
            key = { message -> message.id },
        ) { message ->
            MessageRow(
                message = message,
                onClick = { onMessageClick(message) },
            )
        }
    }
}
```

The mapping is:

- vertical `LinearLayoutManager` → `LazyColumn`
- horizontal `LinearLayoutManager` → `LazyRow`
- `ViewHolder` row → an item Composable
- adapter data updates → state-driven list updates
- stable item identity → `key`
- `RecyclerView` padding/gaps → `contentPadding`/`Arrangement.spacedBy`

Add headers or other fixed content with `item { ... }`. If the adapter contains a legacy/custom View that cannot yet be migrated, wrap that View with `AndroidView`; do not recreate it in the `update` block. Add a `@Preview`, compare with the existing XML screen, and run `./gradlew build` after integration.

