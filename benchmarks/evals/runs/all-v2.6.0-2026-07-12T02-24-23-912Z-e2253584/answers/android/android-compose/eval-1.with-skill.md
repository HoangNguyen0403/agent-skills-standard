# Avoiding unnecessary recomposition

Compose skips recomposition when a composable’s inputs are considered unchanged. Make that possible by:

- Passing only the data and callbacks the child actually needs, rather than a broad mutable object or `ViewModel`.
- Using stable or immutable UI models (`@Immutable` where appropriate) and stable callback references.
- Hoisting state to the stateful screen and keeping the child stateless.
- Using `remember` for values whose calculation does not need to repeat, and `derivedStateOf` for frequently changing state when only a derived value matters.
- Giving `LazyColumn` items stable `key`s so item identity survives updates.
- Reusing static `Modifier` instances where practical.

For example:

```kotlin
@Immutable
data class UserRowUi(val id: Long, val name: String)

@Composable
fun UserScreen(viewModel: UserViewModel) {
    val users by viewModel.users.collectAsStateWithLifecycle()
    UserContent(users = users, onUserClick = viewModel::selectUser)
}

@Composable
fun UserContent(
    users: List<UserRowUi>,
    onUserClick: (Long) -> Unit,
) {
    LazyColumn {
        items(users, key = { it.id }) { user ->
            UserRow(user = user, onClick = { onUserClick(user.id) })
        }
    }
}
```

Do not use `remember` to hide changing inputs or mutate state during composition. First narrow the composable’s parameters and make their stability truthful; then profile recomposition if it is still excessive.

