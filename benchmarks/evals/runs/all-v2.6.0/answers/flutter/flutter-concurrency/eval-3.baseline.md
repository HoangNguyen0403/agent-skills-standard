The usual problem is that you are creating a new `Future` during every `build()`.

`FutureBuilder` does not magically cache the work. It listens to the `future` you pass in. If rebuilds keep creating a different `Future` instance, the builder treats that as new work and runs again.

Common buggy pattern:

```dart
FutureBuilder(
  future: fetchData(),
  builder: ...
)
```

If `build()` runs again because of `setState`, parent rebuilds, theme changes, media query changes, or any other normal UI update, `fetchData()` is called again and the future re-fires.

The fix is to create the future once and reuse it:

```dart
class _MyWidgetState extends State<MyWidget> {
  late Future<MyData> _future;

  @override
  void initState() {
    super.initState();
    _future = fetchData();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<MyData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }
        if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        }
        return Text(snapshot.data.toString());
      },
    );
  }
}
```

When should you recreate the future?

- When the inputs to the request actually changed.
- In that case, update the stored future intentionally, for example in `didUpdateWidget`, in response to user action, or inside state-management logic.

Important idea:

- `build()` should be cheap and repeatable.
- Side effects like firing requests or launching expensive async work should usually not happen inside `build()`.

So the root issue is not `FutureBuilder` itself. The issue is that rebuilds are normal, but your code is tying “rebuild” to “start async work again.”

