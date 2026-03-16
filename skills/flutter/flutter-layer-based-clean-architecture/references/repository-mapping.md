# Repositories & DTO Mapping Reference

## **Data Transfer Object (DTO)**

DTOs live in the **Infrastructure** layer and represent the raw JSON response.

```dart
@freezed
class BankDto with _$BankDto {
  const BankDto._();
  
  const factory BankDto({
    @JsonKey(name: 'bank_id') required String id,
    @JsonKey(name: 'bank_name') required String name,
    @JsonKey(name: 'code') required String branchCode,
  }) = _BankDto;

  factory BankDto.fromJson(Map<String, dynamic> json) => _$BankDtoFromJson(json);

  // Mapping to Domain Entity
  Bank toDomain() => Bank(
    id: id,
    name: name,
    branchCode: branchCode,
  );
}
```

## **Repository Implementation**

The implementation handles the actual data fetching (Remote/Local) and mapping.

```dart
class BankRepository implements IBankRepository {
  final BankRemoteDataSource remoteDataSource;

  BankRepository(this.remoteDataSource);

  @override
  Future<Either<ApiFailure, List<Bank>>> fetchBanks() async {
    try {
      final dtoList = await remoteDataSource.getBanks();
      // Perform the mapping here
      return right(dtoList.map((dto) => dto.toDomain()).toList());
    } catch (e) {
      return left(ApiFailure.fromException(e));
    }
  }
}
```
