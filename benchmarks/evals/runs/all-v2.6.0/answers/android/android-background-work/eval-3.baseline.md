# Inject the repository with `@HiltWorker`

Use Hilt's WorkManager integration. The worker constructor receives the two WorkManager parameters with `@Assisted`; regular dependencies such as the repository are injected normally.

```kotlin
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val repository: SyncRepository,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        repository.sync()
        return Result.success()
    }
}
```

Make the repository injectable, for example with `@Inject` on its constructor or a Hilt `@Provides`/`@Binds` module:

```kotlin
class SyncRepository @Inject constructor(
    private val api: SyncApi,
)
```

Annotate the application and provide Hilt's worker factory to WorkManager:

```kotlin
@HiltAndroidApp
class App : Application(), Configuration.Provider {
    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
```

Disable WorkManager's default initializer in the manifest so the configuration provider is used:

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        tools:node="remove" />
</provider>
```

Add the `androidx.hilt:hilt-work` and `androidx.hilt:hilt-compiler` dependencies (using the appropriate versions), and ensure the `tools` XML namespace is declared. Then enqueue `OneTimeWorkRequestBuilder<SyncWorker>()` or a periodic request normally; WorkManager will use `HiltWorkerFactory` to construct the worker. Do not manually instantiate the worker or put `@Inject` on the `Worker` constructor without `@HiltWorker`/`@AssistedInject`.

