In a Fragment, `this` refers to the Fragment's lifecycle, not the lifecycle of its view. A Fragment can remain alive on the back stack after `onDestroyView`, so its observer may receive updates while the old view or binding no longer exists. That commonly causes crashes when the callback updates the screen.

Register the observer in `onViewCreated` using `viewLifecycleOwner`:

```kotlin
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    viewModel.data.observe(viewLifecycleOwner) { data ->
        render(data)
    }
}
```

If using view binding, also set the binding reference to `null` in `onDestroyView`. Do not use `requireActivity()` or the Fragment lifecycle for view updates, and avoid registering the same observer repeatedly. This makes the observer stop when the view is destroyed and be recreated safely when the view is recreated after navigating back.

