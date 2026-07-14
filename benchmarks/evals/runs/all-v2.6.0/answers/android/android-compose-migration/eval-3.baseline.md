# RecyclerView with a LinearLayoutManager in Compose

The usual equivalent is `LazyColumn` for a vertically scrolling list, or `LazyRow` for a horizontally scrolling list. It lazily composes visible items, similar to how `RecyclerView` creates only the needed children.

```kotlin
@Composable
fun MessageList(
    messages: List<Message>,
    onMessageClick: (Message) -> Unit
) {
    val listState = rememberLazyListState()

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items(
            items = messages,
            key = { message -> message.id },
            contentType = { "message" }
        ) { message ->
            MessageRow(
                message = message,
                onClick = { onMessageClick(message) }
            )
        }
    }
}
```

Use stable, unique keys so item state and animations remain associated with the same data when the list changes. Use `itemsIndexed` when the index is needed, but do not use the index as the key if items can be inserted or removed. Put list spacing and padding on the lazy layout, and use `item { ... }` for headers or other one-off content.

For paged data, use the Paging Compose integration and `collectAsLazyPagingItems()`. For a small, non-scrolling collection, a `Column` may be simpler. Keep the list state and callbacks appropriately hoisted when the parent needs to control scrolling or item actions.

