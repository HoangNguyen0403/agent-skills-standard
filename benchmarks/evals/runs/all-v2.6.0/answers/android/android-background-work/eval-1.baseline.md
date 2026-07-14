# Use WorkManager

Use a `PeriodicWorkRequest` with a 6-hour interval. WorkManager is persisted across process death and device reboots, subject to its normal scheduling constraints.

```kotlin
class SyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        return try {
            syncWithServer() // Make this operation idempotent.
            Result.success()
        } catch (e: IOException) {
            Result.retry()
        } catch (e: Exception) {
            Result.failure()
        }
    }
}

val request = PeriodicWorkRequestBuilder<SyncWorker>(
    6, TimeUnit.HOURS,
)
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
    )
    .build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "server-sync",
    ExistingPeriodicWorkPolicy.KEEP,
    request,
)
```

Enqueue it from application startup or another reliable app entry point. The six-hour interval is not an exact alarm: WorkManager batches and delays work for Doze, battery rules, constraints, and system scheduling. The minimum periodic interval is 15 minutes. A periodic request also has no guarantee of running while the user has force-stopped the app; the user must launch it again. Use an exact alarm only when an exact user-visible time is truly required, not for routine data synchronization.

