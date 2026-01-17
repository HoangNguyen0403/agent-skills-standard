# Dependency Injection Reference

Implementation patterns for `injectable` and `get_it` in massive Flutter projects.

## References

- [**Injection Modules**](modules.md) - Registering third-party libraries (Dio, Hive).
- [**Production Initialization**](initialization.md) - Wiring everything in `main.dart`.
- [**Testing Mocks**](testing-mocks.md) - How to swap services during unit tests.

## **Quick Registration Guide**

- **@injectable**: Use for BLoCs (New instance every time).
- **@LazySingleton**: Use for Repositories and DataSources (Global, lazy-init).
- **@singleton**: Use only for truly shared resources (init on startup).
