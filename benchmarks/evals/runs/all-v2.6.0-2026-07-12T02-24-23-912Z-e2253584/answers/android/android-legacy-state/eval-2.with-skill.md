`observe(this, ...)` observes with the Fragment's lifecycle, which can remain active after the Fragment's view has been destroyed. When the LiveData emits while navigating back or while the Fragment is stopped, the callback may access a dead ViewBinding or other destroyed view state, causing the crash.

Observe from `onViewCreated` with `viewLifecycleOwner`:

```kotlin
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    viewModel.data.observe(viewLifecycleOwner) { data ->
        binding.title.text = data.title
        binding.progressBar.isVisible = data.isLoading
    }
}
```

The observer is then automatically removed when the Fragment's view lifecycle is destroyed and recreated for the next view instance. Do not use `observe(this, ...)` for UI updates in a Fragment. For new Flow-based code, collect with `viewLifecycleOwner.lifecycleScope` and `viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED)` instead.

