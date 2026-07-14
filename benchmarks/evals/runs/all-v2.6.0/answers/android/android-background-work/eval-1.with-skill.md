# Sync every six hours with WorkManager

Use a `CoroutineWorker` scheduled with a unique `PeriodicWorkRequest`. WorkManager persists the request and can run it after the app process is killed or the app is closed. It is the right choice for deferrable server synchronization; execution is not an exact six-hour alarm because Android may defer work for Doze, battery, or other system conditions.

```kotlin
class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = try {
        syncRepository.syncFromServer()
        Result.success()
    } catch (error: IOException) {
        Result.retry()
    } catch (error: Exception) {
        Result.failure()
    }
}
```

Schedule it once, for example after the user signs in:

```kotlin
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .setRequiresCharging(true)
    .build()

val request = PeriodicWorkRequestBuilder<SyncWorker>(
    6, TimeUnit.HOURS,
)
    .setConstraints(constraints)
    .build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "server-data-sync",
    ExistingPeriodicWorkPolicy.KEEP,
    request,
)
```

`PeriodicWorkRequest` has a 15-minute minimum interval. Use `UPDATE` instead of `KEEP` when a later schedule should replace the existing one. If the sync must be allowed while on battery, omit `setRequiresCharging(true)` but keep the network constraint.

