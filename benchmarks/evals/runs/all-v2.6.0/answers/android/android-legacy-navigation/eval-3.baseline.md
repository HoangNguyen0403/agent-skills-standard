`replace(...).commit()` is not inherently invalid, but it is the wrong primitive when the app is using Jetpack Navigation. It performs a raw fragment transaction and bypasses the `NavController`'s navigation graph and back-stack management.

That can cause:

- system Back to behave differently from the graph's expected behavior;
- deep links, graph destinations, transitions, Safe Args, and `popUpTo` rules to be skipped;
- duplicate fragments or inconsistent state after configuration changes and process restoration;
- navigation logic to be scattered across fragments and harder to test.

Define the destination and action in the XML graph, then navigate through the controller:

```kotlin
findNavController().navigate(
    CurrentFragmentDirections.actionCurrentToNext(itemId)
)
```

If this is intentionally a non-Navigation app, use fragment transactions consistently and call `addToBackStack()` when the user should be able to return:

```kotlin
parentFragmentManager.beginTransaction()
    .replace(R.id.container, NextFragment.newInstance(itemId))
    .addToBackStack(null)
    .commit()
```

Do not mix raw transactions with a `NavHostFragment` unless the transaction is a deliberate, well-contained integration; otherwise the visible fragment and the Navigation back stack can disagree.

