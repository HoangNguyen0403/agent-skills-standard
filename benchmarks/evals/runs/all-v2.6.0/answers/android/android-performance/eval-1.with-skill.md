Measure the 3 seconds first, then optimize the work on the critical startup path. Use a release/profileable build and a cold-start benchmark or system trace to distinguish process startup, first frame, and work that happens immediately after the first frame.

1. Audit `Application.onCreate` and all initialization it triggers. Remove network calls, synchronous disk/database work, migrations, reflection-heavy setup, and construction of SDKs that are not required to show the first screen. Required initialization should stay small and deterministic; optional initialization should be deferred until after the first frame or until the feature is first used.

2. Use Jetpack App Startup for independent initializers instead of one large `onCreate`. Keep the dependency graph short, and do not make an initializer synchronous if the user cannot benefit from its result during startup. A debug-only logger, for example, can be isolated:

```kotlin
class TimberInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
```

3. Make expensive, optional services lazy. Use the application context so a singleton cannot retain an Activity:

```kotlin
class App : Application() {
    val analytics: Analytics by lazy {
        Analytics.create(applicationContext)
    }
}
```

If initialization performs I/O, run it from a lifecycle-appropriate background coroutine and make sure the first screen does not wait for it. Also check that deferring the work does not simply create a new hitch when the user opens the feature; warm it in the background or load it incrementally where appropriate.

4. Add a Baseline Profile for the production app. Create a benchmark module and a `BaselineProfileGenerator` that exercises the real critical path—launch, initial navigation, and the first important list or interaction. For example:

```kotlin
@OptIn(ExperimentalBaselineProfilesApi::class)
class BaselineProfileGenerator {
    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() {
        rule.collect(packageName = "com.example.app") {
            pressHome()
            startActivityAndWait()
            // Navigate through the startup-critical path.
        }
    }
}
```

Install the generated profile in the release build and compare cold-start measurements before and after. Baseline Profiles can provide roughly 30–40% startup improvement, but the actual result depends on how much startup code was previously uncompiled. Re-run the trace after each change to confirm that the three seconds moved out of the critical path rather than merely being hidden after the first frame.

