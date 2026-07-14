# Injecting a repository into a WorkManager worker with Hilt

Make the worker a `@HiltWorker` and mark its constructor `@AssistedInject`. WorkManager supplies `Context` and `WorkerParameters`; Hilt supplies the repository.

```kotlin
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val repository: SyncRepository,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = try {
        repository.sync()
        Result.success()
    } catch (error: IOException) {
        Result.retry()
    } catch (error: Exception) {
        Result.failure()
    }
}
```

Configure WorkManager to use Hilt's factory:

```kotlin
@HiltAndroidApp
class App : Application(), Configuration.Provider {
    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
```

Because the application supplies the configuration, remove WorkManager's default initializer from the manifest:

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
</provider>
```

Ensure `SyncRepository` is provided or injectable in Hilt. Do not use a plain `@Inject` constructor for the worker: the two WorkManager-owned parameters must be annotated with `@Assisted` so `HiltWorkerFactory` can create it.

