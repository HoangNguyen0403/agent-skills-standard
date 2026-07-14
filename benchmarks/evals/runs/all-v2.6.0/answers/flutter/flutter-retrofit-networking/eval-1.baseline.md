Use Dio with Retrofit codegen.

```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

part 'orders_api.g.dart';

@RestApi(baseUrl: 'https://api.example.com')
abstract class OrdersApi {
  factory OrdersApi(Dio dio, {String baseUrl}) = _OrdersApi;

  @GET('/orders')
  Future<List<OrderDto>> getOrders();

  @GET('/orders/{id}')
  Future<OrderDto> getOrder(@Path('id') String id);

  @POST('/orders')
  Future<OrderDto> createOrder(@Body() CreateOrderRequest body);
}
```

```dart
final dio = Dio(
  BaseOptions(
    headers: {'Accept': 'application/json'},
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ),
);

final ordersApi = OrdersApi(dio);
```

Run:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

