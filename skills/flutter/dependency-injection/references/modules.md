# Third-party Dependency Modules

Since you cannot annotate third-party classes (like `Dio` or `SharedPreferences`) directly, use a `@module`.

## **Example: Network & Storage Module**

```dart
import 'package:injectable/injectable.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

@module
abstract class NetworkingModule {
  @lazySingleton
  Dio get dio => Dio(BaseOptions(baseUrl: 'https://api.example.com'));

  @preResolve // Waits for this before finishing injection setup
  Future<SharedPreferences> get prefs => SharedPreferences.getInstance();
}
```

## **Named Injection**

Use for multiple instances of the same type:

```dart
@module
abstract class ServiceModule {
  @Named("AuthDio")
  Dio get authDio => Dio();

  @Named("PublicDio")
  Dio get publicDio => Dio();
}

// Consumption: Repo(@Named("AuthDio") Dio dio)
```
