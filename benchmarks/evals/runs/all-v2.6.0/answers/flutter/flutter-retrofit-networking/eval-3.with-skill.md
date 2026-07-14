Use a fallback enum case and tell JSON decoding to route unknown values to it.

```dart
enum Status {
  active,
  inactive,
  unknown,
}

@freezed
class UserDto with _$UserDto {
  const factory UserDto({
    required String id,
    @JsonKey(unknownEnumValue: Status.unknown)
    required Status status,
  }) = _UserDto;

  factory UserDto.fromJson(Map<String, dynamic> json) =>
      _$UserDtoFromJson(json);
}
```

Why this works:
- if the backend adds a new enum string you do not know yet, deserialization uses `Status.unknown`
- your app keeps running instead of throwing during JSON parsing

Good practice:
- always include an `unknown` enum member for server-driven enums
- handle `Status.unknown` in UI/domain logic with a safe default
- do this on every DTO enum field that comes from the backend

