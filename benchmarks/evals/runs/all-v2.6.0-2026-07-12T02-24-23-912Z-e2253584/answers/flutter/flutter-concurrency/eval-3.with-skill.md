What is wrong is that your `FutureBuilder` is probably receiving a newly created `Future` every time `build()` runs.

`FutureBuilder` does not cache the computation for you. It listens to the `Future` instance you pass in. If you do this inside `build()`:

```dart
FutureBuilder<String>(
  future: fetchData(),
  builder: ...
)
```

then every rebuild creates a brand new future, so the async work starts again. Rebuilds can happen for many normal reasons: parent updates, theme changes, `setState`, inherited widget changes, and more.

The fix is to create the future once and reuse the same instance across rebuilds.

Correct pattern:

```dart
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  late final Future<String> _dataFuture;

  @override
  void initState() {
    super.initState();
    _dataFuture = fetchData();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: _dataFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }
        if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        }
        return Text(snapshot.data ?? 'No data');
      },
    );
  }
}
```

Why this works:

- `initState()` runs once for the widget state instance.
- The future is created once and stored.
- Rebuilds reuse the same future instead of restarting the request.

When to recreate the future intentionally:

If the future depends on an input that changes, recreate it only when that input changes, such as in:

- `didUpdateWidget`
- an explicit refresh action
- a state management layer outside the widget

Concurrency-related note:

This problem is not primarily about isolates. It is about future lifecycle. However, the same performance mindset applies: do not repeatedly trigger expensive work during rebuilds. If `fetchData()` also performs heavy CPU parsing after the network call, then cache the future and consider offloading the CPU-heavy parsing portion with `Isolate.run()`.

In short: the bug is usually not in `FutureBuilder` itself. The bug is creating the future inline in `build()` instead of caching it.

