Your app is freezing because large JSON parsing is CPU-bound work, and by default that work runs on Flutter's main isolate. When the main isolate spends too long decoding JSON, it blocks the event loop and the UI cannot paint frames, which shows up as jank or a full freeze.

The fix is to move the parsing work off the main isolate. For a one-off heavy computation like decoding a large JSON payload, `Isolate.run()` is the right choice.

Use this shape:

```dart
import 'dart:convert';
import 'dart:isolate';

List<dynamic> _decodeJson(String rawJson) {
  return jsonDecode(rawJson) as List<dynamic>;
}

Future<List<dynamic>> parseLargeJson(String rawJson) async {
  return await Isolate.run(() => _decodeJson(rawJson));
}
```

Why this works:

- `async`/`await` alone would not fix the freeze, because it helps with non-blocking I/O, not heavy CPU work.
- `Isolate.run()` creates a background isolate for this one task, returns the result, and shuts down automatically.
- Keeping the decode function top-level or static is the safe pattern for isolate work.

A typical usage flow is:

1. Fetch or read the JSON string normally.
2. Pass the raw string into `parseLargeJson(...)`.
3. `await` the parsed result back on the main isolate.
4. Update UI after the computation finishes.

Example:

```dart
Future<void> loadItems() async {
  final rawJson = await rootBundle.loadString('assets/large.json');
  final items = await parseLargeJson(rawJson);
  // setState / update notifier with items
}
```

Important constraints:

- Pass data in and out through function arguments and return values. Isolates do not share mutable memory.
- Keep the isolate entry logic focused on the heavy computation itself.
- Reserve `Isolate.spawn()` for long-lived workers that need ongoing background communication; it is more setup than you need for one large decode.

If your JSON is especially large, this is one of the clearest cases where parsing on the main isolate is an anti-pattern. Offloading it with `Isolate.run()` is the standard fix.

