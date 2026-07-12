# Reducing Android startup time

First determine which startup you are measuring. Cold start, warm start, and hot start have different costs. Measure a release-like build on representative devices rather than relying on a single manual stopwatch measurement. `adb shell am start -W <package>/<activity>` is a useful quick check; for repeatable results, use a Macrobenchmark with `StartupTimingMetric`, and inspect traces with Perfetto or Android Studio's System Trace. Record median and tail latency, not just the best run.

The usual fixes are:

- Keep `Application.onCreate`, the first activity, and startup `ContentProvider`s small. Remove eager registration and initialization that is not required to display the first screen. Libraries that initialize through providers, including dependency-injection, analytics, and image libraries, should be audited rather than assumed harmless.
- Do not perform network requests, large database queries, file I/O, JSON parsing, bitmap decoding, or expensive dependency-graph construction on the main thread during startup. Defer noncritical work until after the first frame, or run it on an appropriate background dispatcher. If work is required to render the first screen, make that work minimal and bounded instead of simply moving it asynchronously and creating a later stall.
- Lazily create expensive objects and initialize optional SDKs only when their feature is first used. For unavoidable independent work, carefully schedule it off the main thread; excessive parallel initialization can compete for CPU, disk, and locks and make startup worse.
- Reduce the first UI's work: simplify the initial layout, avoid deeply nested or repeatedly measured views, defer nonessential fragments, and load only the data and images visible above the fold. For Compose, avoid expensive composition or synchronous work in the initial composition and make sure the first screen does not trigger avoidable recompositions.
- Inspect manifest entries and startup providers. Remove unused providers, receivers, and metadata, and configure libraries so optional components do not initialize eagerly. Check for duplicate initialization paths.
- Enable R8 shrinking/resource shrinking for release builds where appropriate. Add a Baseline Profile covering the launch path so frequently executed startup and first-screen code is compiled ahead of time. Keep the profile representative and verify it with the Macrobenchmark rather than assuming it helped.
- Use the Android SplashScreen API for a consistent launch experience, but do not treat a longer splash as a performance fix. It should cover genuinely necessary preparation while the app works toward its first usable frame.

For diagnosis, enable StrictMode in debug builds to catch accidental main-thread disk and network work, then use a system trace to identify the longest startup slices and the point at which the first frame is produced. Check both time to process start, time to first frame, and time to a usable screen; a fast first frame followed by a blocked or empty screen is not a successful optimization.

After each change, compare the same build, device state, navigation path, and data set. Warm caches can hide regressions, so include controlled cold-start runs and enough iterations to account for variance. A good result is a measured reduction in startup latency without moving the same work into the first interaction or causing ANRs, crashes, or degraded first-screen usability.

