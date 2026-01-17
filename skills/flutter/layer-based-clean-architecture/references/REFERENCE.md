# Reference: Layer-based Clean Architecture Examples

## **Full Layer Implementation**

### 1. Domain Layer (Entity)

```dart
@freezed
class Bank with _$Bank {
  const factory Bank({
    required String id,
    required String name,
    required String branchCode,
  }) = _Bank;

  factory Bank.fromJson(Map<String, dynamic> json) => _$BankFromJson(json);
}
```

### 2. Infrastructure Layer (DTO & Mapper)

```dart
@freezed
class BankDto with _$BankDto {
  const factory BankDto({
    @JsonKey(name: 'bank_id') required String id,
    @JsonKey(name: 'bank_name') required String name,
    @JsonKey(name: 'code') required String branchCode,
  }) = _BankDto;

  factory BankDto.fromJson(Map<String, dynamic> json) => _$BankDtoFromJson(json);

  Bank toDomain() => Bank(
    id: id,
    name: name,
    branchCode: branchCode,
  );
}
```

### 3. Application Layer (BLoC)

```dart
class BankBloc extends Bloc<BankEvent, BankState> {
  final IBankRepository repository;

  BankBloc(this.repository) : super(const BankState.initial()) {
    on<_Fetch>(_onFetch);
  }

  Future<void> _onFetch(_Fetch event, Emitter<BankState> emit) async {
    emit(const BankState.loading());
    final failureOrBanks = await repository.fetchBanks();
    emit(failureOrBanks.fold(
      (f) => BankState.error(f.message),
      (banks) => BankState.loaded(banks),
    ));
  }
}
```
