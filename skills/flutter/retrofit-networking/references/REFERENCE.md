# Retrofit & Dio Reference

Standards for API communication and networking logic.

## References

- [**Token Refresh Logic**](token-refresh.md) - The 401 Lock-Refresh-Retry pattern.

## **Quick Definition**

```dart
@RestApi()
abstract class ApiClient {
  @GET("/items")
  Future<List<ItemDto>> getItems(@Query("limit") int limit);
}
```

## **Safe Enum Handling**

Always define a fallback value for enums in DTOs to ensure robustness against backend changes.

```dart
@freezed
class UserDto with _$UserDto {
  const factory UserDto({
    required String id,
    // Safely handles new/unknown values from API
    @JsonKey(unknownEnumValue: Gender.unknown)
    required Gender gender,
  }) = _UserDto;

  factory UserDto.fromJson(Map<String, dynamic> json) => _$UserDtoFromJson(json);
}

enum Gender { male, female, unknown }
```
