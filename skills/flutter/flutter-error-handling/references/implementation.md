# Error Handling Implementation Examples

## Repository Error Mapping

```dart
@override
Future<Either<Failure, Order>> getOrder(String id) async {
  try {
    final dto = await _remoteDataSource.fetchOrder(id);
    return right(dto.toDomain());
  } on DioException catch (e) {
    return left(ServerFailure(message: e.message ?? 'Unknown error'));
  }
}
```

## BLoC Consumption

```dart
final result = await _getOrderUseCase(orderId);
result.fold(
  (failure) => emit(OrderError(failure.failureMessage)),
  (order) => emit(OrderLoaded(order)),
);
```
