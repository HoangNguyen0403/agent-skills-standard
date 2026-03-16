# Network Security & Certificate Pinning

## **SSL Pinning with Dio**

```dart
import 'package:dio/dio.dart';
import 'package:dio_certificate_pinning/dio_certificate_pinning.dart';

final dio = Dio();
dio.interceptors.add(CertificatePinningInterceptor(
  allowedSHAFingerprints: [
    "70:99:27:8B:54:4A:40:F5:30:DB:73:E3:64:36:0F:70:3D:09:A6:49",
  ],
));
```

## **Security Headers Interceptor**

```dart
class SecurityInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['X-Content-Type-Options'] = 'nosniff';
    options.headers['X-Frame-Options'] = 'DENY';
    super.onRequest(options, handler);
  }
}
```
