Use the choice based on what kind of work you are doing and how long it lives:

| Situation | Best tool |
| --- | --- |
| Waiting on network, disk, database, or other I/O | `async` / `await` |
| Small CPU work that finishes quickly and will not block a frame | stay on main isolate, optionally with `async` structure |
| One-off heavy CPU work | `Isolate.run()` |
| Repeated or continuous background processing with message passing | `Isolate.spawn()` |

The key distinction is:

- `async`/`await` is for non-blocking waiting.
- isolates are for moving CPU-heavy work off the main isolate.

When to use `async`/`await`

Use it for I/O-bound tasks such as:

- HTTP requests
- reading files
- database queries
- plugin calls that already return futures

Example:

```dart
Future<User> loadUser() async {
  final response = await apiClient.fetchUser();
  return User.fromJson(response);
}
```

This does not block the UI while waiting for the remote system. But if the CPU work after the await is heavy, that heavy part can still block the UI.

When to use `Isolate.run()`

Use `Isolate.run()` when:

- the task is CPU-bound
- it is a one-time or occasional operation
- you want a simple API
- you do not need ongoing two-way communication

Good examples:

- decoding a large JSON file
- filtering or transforming a very large list
- image or text processing
- compression, parsing, hashing, or expensive calculations

Example:

```dart
Future<List<dynamic>> parseLargeJson(String rawJson) async {
  return await Isolate.run(() => _decodeJson(rawJson));
}
```

Why it fits:

- it keeps the UI responsive
- setup is minimal
- the worker isolate is cleaned up automatically after the task completes

When to use `Isolate.spawn()`

Use `Isolate.spawn()` when you need a long-lived worker, such as:

- continuous background processing
- a worker that handles many jobs over time
- explicit message passing with `SendPort` and `ReceivePort`
- a service-like background processor

Good examples:

- image processing pipeline
- stream of expensive transformations
- worker that receives many tasks from the UI over the lifetime of a screen or service

This approach is more complex because you must manage:

- isolate lifecycle
- ports
- message protocol
- cleanup on dispose

Rule of thumb:

- If you are just waiting, use `async`/`await`.
- If the CPU work is heavy and happens once, use `Isolate.run()`.
- If the CPU work is heavy and happens repeatedly over time, use `Isolate.spawn()`.

Common mistake:

Do not assume `async` automatically makes heavy computation safe for the UI. If the expensive part still runs on the main isolate, the app can still stutter. `await` helps with waiting; isolates help with computation.

