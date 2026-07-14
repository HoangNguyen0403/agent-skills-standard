Start by profiling, not guessing.

For iOS performance best practices:

- Use Instruments regularly:
  - Time Profiler for CPU hotspots and main-thread stalls
  - Allocations for memory growth
  - Leaks for retain cycles and leaked objects

- Keep scrolling views cheap:
  - Always reuse cells with `dequeueReusableCell`
  - Keep `cellForRowAt` lightweight
  - Avoid expensive layout, decoding, or transformation work during scrolling

- Move heavy work off the main thread:
  - Parsing
  - Encryption
  - Image processing
  - Large computations
  - Use GCD or Swift concurrency (`Task`, `Task.detached`) where appropriate

- Cache remote images:
  - Prefer a real cache-backed loader such as SDWebImage or Kingfisher
  - Be careful with `AsyncImage` in list-heavy UIs because it does not provide the same caching behavior you usually want for scrolling performance

- Prevent memory issues:
  - Watch for retain cycles
  - Use Leaks during development
  - Don’t rely on manual cache clearing as a primary strategy; let the system respond to memory pressure

- Turn on stricter build hygiene:
  - Enable `SWIFT_TREAT_WARNINGS_AS_ERRORS` for Release builds
  - Run Xcode Analyze (`Product > Analyze`) to catch logic and lifecycle issues earlier

Good workflow:

1. Reproduce the slowdown
2. Measure it in Instruments
3. Fix the largest hotspot first
4. Re-profile to confirm the improvement

If you want, I can also turn this into a practical iOS performance checklist for UIKit or SwiftUI.

