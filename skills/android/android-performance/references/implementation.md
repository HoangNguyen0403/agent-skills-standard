# Performance Optimization

## Baseline Profiles

1. Create `:benchmark` module.
2. Define `BaselineProfileGenerator`.

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
            // Scroll critical lists
        }
    }
}
```

## App Startup (Jetpack Startup)

```kotlin
class TimberInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        if (BuildConfig.DEBUG) Timber.plant(Timber.DebugTree())
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
```

## JankStats

Monitor UI frames dropping below 60fps. Use `JankStats` library to intercept frame metrics in your Activity.
