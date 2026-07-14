Keep the public contract in the domain layer and put both API and local-storage details behind infrastructure data sources. The UI and application layers depend only on `User` and `UserRepository`; neither imports Dio nor SharedPreferences.

```dart
// lib/domain/entities/user.dart
@freezed
class User with _$User {
  const factory User({required String id, required String name}) = _User;
}

// lib/domain/failures/failure.dart
@freezed
sealed class Failure with _$Failure {
  const factory Failure.network(String message) = NetworkFailure;
  const factory Failure.cache(String message) = CacheFailure;
}

// lib/domain/repositories/user_repository.dart
abstract interface class UserRepository {
  Future<Either<Failure, User>> fetchProfile();
}
```

The infrastructure layer owns the DTO and maps it explicitly to the domain entity. It also separates the repository policy from the two I/O mechanisms:

```dart
// lib/infrastructure/dtos/user_dto.dart
class UserDto {
  const UserDto({required this.id, required this.name});
  final String id;
  final String name;

  factory UserDto.fromJson(Map<String, dynamic> json) => UserDto(
        id: json['id'] as String,
        name: json['name'] as String,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name};
  User toDomain() => User(id: id, name: name);
}

abstract interface class UserRemoteDataSource {
  Future<UserDto> fetchProfile(); // implemented with Dio
}

abstract interface class UserLocalDataSource {
  Future<void> saveProfile(UserDto user); // implemented with SharedPreferences
  Future<UserDto?> readProfile();
}

class UserRepositoryImpl implements UserRepository {
  UserRepositoryImpl(this._remote, this._local);
  final UserRemoteDataSource _remote;
  final UserLocalDataSource _local;

  @override
  Future<Either<Failure, User>> fetchProfile() async {
    try {
      final remoteUser = await _remote.fetchProfile();
      try {
        await _local.saveProfile(remoteUser); // cache failure need not hide fresh data
      } catch (_) {}
      return right(remoteUser.toDomain());
    } on NetworkException catch (error) {
      try {
        final cachedUser = await _local.readProfile();
        if (cachedUser != null) return right(cachedUser.toDomain());
      } catch (_) {}
      return left(Failure.network(error.message));
    } catch (error) {
      return left(Failure.network(error.toString()));
    }
  }
}
```

`UserProfileCubit` in `lib/application/` receives `UserRepository`, emits loading/loaded/error states from its `Either`, and is registered through `get_it` with `UserRepositoryImpl`, the Dio remote source, and the SharedPreferences local source. The presentation widget dispatches `loadProfile()` and renders Cubit state with `BlocBuilder`; it never receives a DTO, Dio client, or preferences instance.

