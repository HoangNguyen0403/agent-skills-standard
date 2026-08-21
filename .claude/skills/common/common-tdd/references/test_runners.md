# Test Runner Reference

| Language      | Runner            | Focused command             | Coverage                     |
| ------------- | ----------------- | --------------------------- | ---------------------------- |
| TypeScript/JS | `jest` / `vitest` | `vitest run path/to/test`   | Repository-configured        |
| Go            | `go test`         | `go test ./path -run TestX` | Repository-configured        |
| Java          | JUnit 5 + Maven   | `mvn -Dtest=Class#test`     | Repository-configured        |
| Kotlin        | JUnit 5 + Kotest  | `./gradlew test --tests X`  | Repository-configured        |
| Dart/Flutter  | `flutter test`    | `flutter test test/path`    | Repository-configured        |

## **Environment-Specific Commands**

### TypeScript/JS

- Use the repository's configured runner and one focused target in foreground, single-run, sequential mode.
- Honor the project timeout; otherwise use 120 seconds and clean the command's own process group on timeout.

### Go

- Use `go test ./path -run TestName` for the RED/GREEN loop. Reserve `go test ./...` for an explicit gate and bound it.

### Dart

- Use `flutter test test/path_test.dart` for the RED/GREEN loop. Reserve the full suite for an explicit gate.
