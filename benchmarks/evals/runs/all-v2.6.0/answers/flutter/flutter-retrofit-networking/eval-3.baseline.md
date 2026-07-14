Add a safe fallback when decoding the enum so unknown server values map to a default instead of throwing.

If you use `json_serializable`, set `unknownEnumValue` on the field:

```dart
enum Status { active, inactive, unknown }

@JsonSerializable()
class UserDto {
  @JsonKey(unknownEnumValue: Status.unknown)
  final Status status;

  UserDto({required this.status});

  factory UserDto.fromJson(Map<String, dynamic> json) =>
      _$UserDtoFromJson(json);
}
```

That way, any unexpected enum string from the API becomes `Status.unknown` rather than crashing parsing.

If you are doing manual parsing, use a lookup with a default fallback instead of assuming every value is known.

