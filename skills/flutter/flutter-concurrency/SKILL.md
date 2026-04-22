---
name: flutter-concurrency
description: Execute long-running tasks in background isolates to keep the UI responsive. Use when performing heavy computations, parsing large datasets, or choosing between async/await and isolates.
metadata:
  triggers:
    files:
    - '**/*isolate*.dart'
    - '**/*worker*.dart'
    keywords:
    - Isolate
    - compute
    - Isolate.run
    - Isolate.spawn
    - ReceivePort
    - SendPort
    - background
---
# Dart Concurrency and Isolates

## **Priority: P1**

## Core Concepts

Dart uses a single-threaded event loop. All Flutter code runs on the Main Isolate by default. Blocking it causes jank.

- **async/await**: For non-blocking I/O (network, file). The event loop continues while waiting.
- **Isolates**: Dart's lightweight threads with isolated memory. Communicate via message passing only.

## Decision Matrix

| Condition | Approach |
|-----------|----------|
| I/O bound (HTTP, database) | `async`/`await` on Main Isolate |
| CPU-bound, < 16ms | `async`/`await` on Main Isolate |
| CPU-bound, one-off heavy task | `Isolate.run()` |
| Continuous background processing | `Isolate.spawn()` with ports |

## Workflow: Offloading Heavy Computation

- [ ] 1. Identify the CPU-bound operation blocking the UI.
- [ ] 2. Extract computation into a standalone top-level or static function.
- [ ] 3. Ensure the function accepts exactly one argument (Isolate constraint).
- [ ] 4. Call `Isolate.run(() => myFunction(data))`.
- [ ] 5. `await` the result on the Main Isolate.

## Workflow: Long-Lived Worker Isolate

- [ ] 1. Create a `ReceivePort` on the Main Isolate.
- [ ] 2. Spawn worker with `Isolate.spawn(entryPoint, mainPort.sendPort)`.
- [ ] 3. In worker, create its own `ReceivePort` and send its `SendPort` back.
- [ ] 4. Store worker's `SendPort` for bidirectional communication.
- [ ] 5. Close ports and kill isolate on dispose.

See [examples](references/isolate-examples.md) for complete code.

## Anti-Patterns

- **No JSON parsing on Main Isolate**: Large JSON decoding (>1MB) blocks frames. Use `Isolate.run`.
- **No shared mutable state**: Isolates cannot share memory. Pass data via messages.
- **No FutureBuilder in build without caching**: `FutureBuilder` re-fires on every rebuild if the future is created inline.

## Verification

- [ ] No frame drops during heavy computation (check with DevTools).
- [ ] Worker isolates are disposed when no longer needed.
- [ ] `flutter test` passes.

## References

- [Isolate Examples](references/isolate-examples.md)
