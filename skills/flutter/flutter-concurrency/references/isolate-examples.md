# Isolate Examples

## One-off heavy computation (Isolate.run)

```dart
import 'dart:convert';
import 'dart:isolate';

// Top-level function — required for Isolate.run
List<dynamic> _decodeJson(String jsonString) {
  return jsonDecode(jsonString) as List<dynamic>;
}

// Usage in ViewModel/Repository
Future<List<dynamic>> processLargeJson(String rawJson) async {
  // Spawns isolate, runs computation, returns result, exits automatically
  return await Isolate.run(() => _decodeJson(rawJson));
}
```

## Long-lived worker isolate

```dart
import 'dart:isolate';

class ImageProcessor {
  late SendPort _workerSendPort;
  final ReceivePort _mainPort = ReceivePort();
  Isolate? _isolate;

  Future<void> initialize() async {
    _isolate = await Isolate.spawn(_workerEntry, _mainPort.sendPort);

    _mainPort.listen((message) {
      if (message is SendPort) {
        _workerSendPort = message;
      } else {
        // Handle processed results
        print('Processed: $message');
      }
    });
  }

  void processImage(String path) {
    _workerSendPort.send(path);
  }

  static void _workerEntry(SendPort mainSendPort) {
    final workerPort = ReceivePort();
    mainSendPort.send(workerPort.sendPort);

    workerPort.listen((message) {
      // Simulate heavy image processing
      final result = 'Processed image: $message';
      mainSendPort.send(result);
    });
  }

  void dispose() {
    _mainPort.close();
    _isolate?.kill();
  }
}
```

## RIGHT / WRONG: FutureBuilder caching

```dart
// RIGHT — cache the future to prevent re-firing on rebuild
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  late final Future<String> _dataFuture;

  @override
  void initState() {
    super.initState();
    _dataFuture = fetchData(); // Created once
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: _dataFuture, // Same instance every rebuild
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }
        return Text(snapshot.data ?? 'No data');
      },
    );
  }
}
```

```dart
// WRONG — future re-created on every build
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: fetchData(), // <-- New future every rebuild!
      builder: (context, snapshot) {
        return Text(snapshot.data ?? 'Loading...');
      },
    );
  }
}
```
