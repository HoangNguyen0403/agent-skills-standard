Yes, it is usually a layering problem. A Composable should render state and emit user events; calling a Repository directly couples UI to the data layer and makes request lifetime, loading/error handling, retries, and testing harder. It can also trigger work at the wrong time if the call is made during composition or cause duplicated work across recompositions.

Inject the repository into a ViewModel, or into a use case used by the ViewModel. The ViewModel launches collection or requests in an appropriate scope, exposes immutable `StateFlow`/UI state, and receives callbacks from the Composable. The UI then collects it with lifecycle awareness, for example `collectAsStateWithLifecycle()`, and calls event methods such as `viewModel.onRefresh()`.

The Repository should own data-source coordination and caching, not presentation behavior. A small, read-only state abstraction can be acceptable in specialized cases, but the normal boundary remains Composable -> ViewModel/use case -> Repository.

