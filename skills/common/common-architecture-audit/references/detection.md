# Framework Detection & Source Mapping

Use the following manifest files to detect the project framework and its standard directory structure.

| Manifest                         | Framework     | `$SRC`                | `$TEST`         | `$EXT`    |
| -------------------------------- | ------------- | --------------------- | --------------- | --------- |
| `pubspec.yaml`                   | Flutter       | `lib/`                | `test/`         | `dart`    |
| `nest-cli.json`                  | NestJS        | `src/`                | `src/`          | `ts`      |
| `next` in deps                   | Next.js       | `src/`                | `__tests__/`    | `ts,tsx`  |
| `react-native` in deps           | React Native  | `src/` or `app/`      | `__tests__/`    | `ts,tsx`  |
| `react` in deps                  | React         | `src/`                | `src/`          | `ts,tsx`  |
| `angular.json`                   | Angular       | `src/app/`            | `src/`          | `ts`      |
| `go.mod`                         | Golang        | `.`                   | `.`             | `go`      |
| `pom.xml` + `spring-boot` dep    | Spring Boot   | `src/main/java`       | `src/test/java` | `java`    |
| `build.gradle.kts` + android app | Android       | `app/src/main`        | `app/src/test`  | `kt,java` |
| `Podfile` or `.xcodeproj`        | iOS           | `Sources/` or app dir | `Tests/`        | `swift`   |
| `artisan` file                   | Laravel       | `app/`                | `tests/`        | `php`     |
| `composer.json` (no artisan)     | PHP           | `src/`                | `tests/`        | `php`     |
| `package.json`                   | TypeScript/JS | `src/`                | `src/`          | `ts,js`   |

> [!IMPORTANT]
> **Record `$SRC`, `$TEST`, and `$EXT` now.** Every subsequent scan uses these variables. Running against a wrong or non-existent directory will return empty results.

## Skill Mapping

| Framework     | Skills to load                                  |
| ------------- | ----------------------------------------------- |
| Flutter       | `flutter`, `dart`, `common`                     |
| NestJS        | `nestjs`, `typescript`, `common`                |
| Next.js       | `nextjs`, `react`, `typescript`, `common`       |
| React Native  | `react-native`, `react`, `typescript`, `common` |
| React         | `react`, `typescript`, `common`                 |
| Angular       | `angular`, `typescript`, `common`               |
| Golang        | `golang`, `common`                              |
| Spring Boot   | `spring-boot`, `java`, `kotlin`, `common`       |
| Android       | `android`, `kotlin`, `java`, `common`           |
| iOS           | `ios`, `swift`, `common`                        |
| Laravel       | `laravel`, `php`, `common`                      |
| PHP           | `php`, `common`                                 |
| TypeScript/JS | `typescript`, `common`                          |
