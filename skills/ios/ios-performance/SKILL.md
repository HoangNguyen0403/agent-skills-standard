---
name: ios-performance
description: Profile and optimize iOS apps with Instruments, memory management, and rendering techniques. Use when profiling iOS apps with Instruments or optimizing memory and rendering.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - Instruments
    - Allocations
    - Leaks
    - dequeueReusableCell
    - ios performance
    - swift performance
    - optimize ios
    - time profiler
    - frame drops
    - main thread
    - slow scroll
---
# iOS Performance

## **Priority: P0**

## Implementation Workflow

1. **Profile with Instruments** — Regularly use Allocations and Leaks to detect memory issues. Use Time Profiler for CPU stalls.
2. **Reuse cells** — Always use `dequeueReusableCell` and keep `cellForRowAt` lightweight.
3. **Cache images** — Use `SDWebImage` or `Kingfisher` for remote assets. `AsyncImage` lacks caching for lists.
4. **Offload to background** — Move parsing, encryption, and heavy computation off Main thread using GCD or Tasks.
5. **Enable strict warnings** — Set `SWIFT_TREAT_WARNINGS_AS_ERRORS` in Release builds.
6. **Run static analysis** — Use Xcode's "Analyze" (Product > Analyze) to catch logic errors.

See [background processing and cell reuse examples](references/implementation.md)

## Anti-Patterns

- **No Main-thread Processing**: Offload parsing/processing to background using `Task.detached` or GCD
- **No Manual Cache Clears**: Let system handle low-memory via `applicationDidReceiveMemoryWarning`
- **No Retain Cycles**: Use Leaks instrument frequently during development

## References

- [Profiling & Optimization](references/implementation.md)