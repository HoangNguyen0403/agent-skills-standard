# Diagnosing dropped frames

Profile a release-like build on the lower-end Android devices that reproduce the issue. A frame can be blocked by the JavaScript thread, UI thread, layout/measure work, native modules, images, or garbage collection. Use the React Native performance monitor, Android Studio/System Trace, Hermes profiling, and production telemetry to identify the busy thread before changing code.

Common fixes include reducing work during render, memoizing or virtualizing lists, moving expensive computation off the JS thread, debouncing high-frequency events, avoiding large JSON transforms on interaction handlers, resizing images, and removing unnecessary state/context updates. Batch or defer noncritical work after interactions and avoid synchronous native calls on the critical path. Check animations: use native/UI-thread-capable animation solutions where appropriate and do not drive every animation frame through JS.

Measure startup, navigation, scrolling, and memory separately in release mode. Check for excessive rerenders with the React DevTools profiler, test low-memory conditions, and verify that a fix improves frame time without hiding errors or causing stale UI.

