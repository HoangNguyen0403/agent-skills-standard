# Use ViewBinding in the Fragment

Enable ViewBinding in the module and use the generated binding class instead of looking up each view by ID:

```kotlin
// app/build.gradle.kts
android {
    buildFeatures {
        viewBinding = true
    }
}
```

For a layout named `fragment_home.xml`, Android generates `FragmentHomeBinding`. Bind the Fragment's view in `onViewCreated`, use the binding only while the view exists, and clear it in `onDestroyView`:

```kotlin
class HomeFragment : Fragment(R.layout.fragment_home) {

    private var _binding: FragmentHomeBinding? = null
    private val binding: FragmentHomeBinding
        get() = checkNotNull(_binding)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        _binding = FragmentHomeBinding.bind(view)
        binding.titleText.text = getString(R.string.home_title)
        binding.retryButton.setOnClickListener {
            // Handle the click.
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
```

This gives compile-time access to views, removes `findViewById` casts and nullability mistakes, and avoids retaining a destroyed Fragment view across the Fragment's view lifecycle. Do not keep `binding` in a long-lived object or use it after `onDestroyView`; use the Fragment itself for longer-lived state.

