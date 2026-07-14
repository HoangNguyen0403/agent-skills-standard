Your UI is probably doing CPU-heavy work on the main isolate. In Flutter, `async` does not make CPU work non-blocking by itself; it only helps with waiting on I/O. If you read a large JSON string and then decode it on the UI isolate, the event loop can stall and the app appears frozen.

The usual fix is:

1. Keep file reading asynchronous.
2. Move expensive JSON parsing to a background isolate.
3. Return only the parsed result back to the UI isolate.

Typical approach:

```dart
import 'dart:convert';
import 'dart:isolate';
import 'dart:io';

Future<List<dynamic>> loadLargeJson(File file) async {
  final jsonString = await file.readAsString();
  return Isolate.run(() {
    final decoded = jsonDecode(jsonString) as List<dynamic>;
    return decoded;
  });
}
```

Why this works:

- `readAsString()` is I/O-bound and already asynchronous.
- `jsonDecode()` is CPU-bound and can block frames if it runs on the main isolate.
- `Isolate.run()` offloads that heavy computation so scrolling, animation, and touch input stay responsive.

If the parsed object is a huge map/list tree, also be aware of transfer cost. Sending very large object graphs between isolates can itself be expensive. In some cases it is better to:

- parse only the subset you need,
- paginate or stream the data,
- or transform it into smaller DTOs before returning it.

Extra guidance:

- Use plain `async`/`await` for network calls, file reads, database access, and other I/O.
- Use an isolate for CPU-heavy work like JSON parsing, compression, image processing, or big data transforms.
- Avoid starting the parse in `build()`. Trigger it once in `initState`, a controller, or another stable lifecycle point.

If the file is extremely large, you may also want a streaming parser approach instead of loading the whole file into memory at once, because moving the work off the main isolate fixes jank but does not reduce memory pressure.

