Common iOS state management anti-patterns include:

- Mutating UI state off the main thread instead of using `@MainActor` or delivering updates on the main queue.
- Letting Combine subscriptions leak by not storing them in `Set<AnyCancellable>`.
- Calling `objectWillChange.send()` manually when `@Published` or `@Observable` should drive updates automatically.
- Splitting view state across many loose booleans and optionals instead of using one explicit state model such as `.loading`, `.success`, and `.error`.
- Mixing business logic directly into views instead of using a unidirectional flow where the view sends inputs and the view model exposes output state.
- Using the wrong observation model for the target platform, such as forcing older Combine-style patterns when modern `@Observable` is the better fit on iOS 17+.

