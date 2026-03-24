# Retrofit & Dio Implementation Examples

## Retrofit Client

```dart
@RestApi()
abstract class OrderRemoteDataSource {
  factory OrderRemoteDataSource(Dio dio) = _OrderRemoteDataSource;

  @GET('/orders/{id}')
  Future<OrderDto> getOrder(@Path('id') String id);

  @POST('/orders/{id}/cancel')
  Future<void> cancelOrder(@Path('id') String id);
}
```

## Safe Enum DTO

```dart
@freezed
class OrderDto with _$OrderDto {
  const factory OrderDto({
    required String id,
    @JsonKey(unknownEnumValue: OrderStatus.unknown)
    required OrderStatus status,
  }) = _OrderDto;

  factory OrderDto.fromJson(Map<String, dynamic> json) =>
      _$OrderDtoFromJson(json);
}
```
