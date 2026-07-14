```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

part 'orders_api_client.g.dart';

@RestApi(baseUrl: 'https://api.example.com')
abstract class OrdersApiClient {
  factory OrdersApiClient(Dio dio, {String baseUrl}) = _OrdersApiClient;

  @GET('/orders')
  Future<List<OrderDto>> getOrders();

  @GET('/orders/{id}')
  Future<OrderDto> getOrder(@Path('id') String id);

  @POST('/orders')
  Future<OrderDto> createOrder(@Body() CreateOrderRequest body);
}

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this.tokenProvider);

  final Future<String?> Function() tokenProvider;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenProvider();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

Dio buildOrdersDio(Future<String?> Function() tokenProvider) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'https://api.example.com',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      contentType: 'application/json',
    ),
  );

  dio.interceptors.add(AuthInterceptor(tokenProvider));
  return dio;
}

class CreateOrderRequest {
  const CreateOrderRequest({
    required this.productId,
    required this.quantity,
  });

  final String productId;
  final int quantity;

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'quantity': quantity,
      };
}

class OrderDto {
  const OrderDto({
    required this.id,
    required this.status,
    required this.total,
  });

  factory OrderDto.fromJson(Map<String, dynamic> json) => OrderDto(
        id: json['id'] as String,
        status: json['status'] as String? ?? 'unknown',
        total: (json['total'] as num).toDouble(),
      );

  final String id;
  final String status;
  final double total;
}
```

