# Prefer View Binding

For an XML-based Fragment, use Android View Binding instead of repeatedly calling `findViewById`. It generates a binding class for each layout, giving you type-safe references without view-ID casts or string-like lookups.

Enable it in the module's `build.gradle.kts`:

```kotlin
android {
    buildFeatures {
        viewBinding = true
    }
}
```

Then keep the binding only while the Fragment's view exists:

```kotlin
class ProfileFragment : Fragment(R.layout.fragment_profile) {
    private var _binding: FragmentProfileBinding? = null
    private val binding: FragmentProfileBinding
        get() = _binding!!

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentProfileBinding.bind(view)

        binding.saveButton.setOnClickListener {
            binding.statusText.text = getString(R.string.saved)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
```

If the Fragment inflates the layout itself, use `FragmentProfileBinding.inflate(inflater, container, false)` in `onCreateView`, assign `_binding`, and return `binding.root` (or use the `Fragment(R.layout...)` pattern above). Clearing the reference in `onDestroyView` is essential because a Fragment can outlive and recreate its view; retaining it can leak the old Activity/view tree.

Data Binding is a separate option for layouts that genuinely need expression-based binding or generated binding logic, but View Binding is the simpler default. `findViewById` remains valid for occasional dynamic lookups, but it is generally unnecessary for static views declared in the layout.

