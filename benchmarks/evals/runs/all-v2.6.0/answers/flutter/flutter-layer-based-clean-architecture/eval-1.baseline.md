Model the feature behind domain-facing abstractions so the presentation layer depends only on application concepts, not packages.

In the domain layer, define a `User` entity and a `UserRepository` contract:

```dart
abstract interface class UserRepository {
  Future<User> getProfile();
}
```

Add a use case such as `GetUserProfile` that accepts that repository and exposes `Future<User> call()`. The view model, Cubit, Bloc, or other presentation controller calls the use case and converts its result into UI state.

Implement the contract in the data layer. `UserRepositoryImpl` coordinates an API data source and a local data source. The remote source owns Dio calls and converts API DTOs to data models; the local source owns SharedPreferences access and serializes/deserializes the cached representation. The repository decides the cache policy: for example, return a fresh remote profile and save it locally, or return cached data when the network request fails. Map the data model to the domain `User` before returning it.

Dependencies point inward: presentation -> use case/domain repository contract <- data repository implementation. Register the implementation with dependency injection at the composition root. Thus neither widgets nor domain code imports Dio or SharedPreferences.

