# Test Runner Reference

| Language      | Runner            | Watch Mode                  | Coverage                     |
| ------------- | ----------------- | --------------------------- | ---------------------------- |
| TypeScript/JS | `jest` / `vitest` | `vitest --watch`            | `vitest run --coverage`      |
| Go            | `go test`         | `go test -v ./... -count=1` | `go test -cover ./...`       |
| Java          | JUnit 5 + Maven   | `mvn test`                  | `mvn verify -P coverage`     |
| Kotlin        | JUnit 5 + Kotest  | `./gradlew test`            | `./gradlew jacocoTestReport` |
| Dart/Flutter  | `flutter test`    | `flutter test --watch`      | `flutter test --coverage`    |

## **Environment-Specific Commands**

### TypeScript/JS

- Standard: `npm test` or `pnpm test`.
- Isolation: `npx vitest run src/math.spec.ts`.

### Go

- Standard: `go test ./...`.
- Benchmark: `go test -bench=.`.

### Dart

- Standard: `flutter test`.
- Web: `flutter test --platform chrome`.
