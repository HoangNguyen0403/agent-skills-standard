A good PR workflow for Flutter should fail fast, cache the expensive parts, and produce the Android artifact only after analysis and tests pass. For pull requests, I would structure it in this order:

1. Check out the repo.
2. Install a stable Flutter SDK.
3. Cache Pub packages and Gradle state.
4. Run formatting/analyze checks first.
5. Run tests.
6. Build the Android App Bundle (`.aab`).
7. Upload the build artifact so reviewers can inspect or reuse it.

Example GitHub Actions workflow:

```yaml
name: flutter-pr-ci

on:
  pull_request:
    branches:
      - main

jobs:
  verify-and-build:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true

      - name: Restore pub dependencies
        run: flutter pub get

      - name: Check formatting
        run: dart format --output=none --set-exit-if-changed .

      - name: Static analysis
        run: flutter analyze

      - name: Run tests
        run: flutter test --coverage

      - name: Build Android App Bundle
        run: flutter build appbundle --release

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: build/app/outputs/bundle/release/*.aab
```

Why this matches solid Flutter CI/CD practice:

- It uses the stable Flutter channel.
- It caches Flutter dependencies to reduce repeated setup cost.
- It runs format and analyze before tests/builds, so cheap failures happen early.
- It enforces automated testing on every PR.
- It builds the Play Store artifact format (`.aab`) rather than only an APK.
- It sets `timeout-minutes` so hung runners do not waste CI time.

Recommended additions if the repo is larger:

- Split `analyze`, `test`, and `build` into separate jobs so build only runs after quality gates pass.
- Cache Gradle explicitly if Android dependency resolution is slow.
- Upload coverage to Codecov if the team tracks test coverage.
- If integration tests exist, run them in a separate job so unit/widget feedback stays fast.

In short: use one PR-triggered workflow that installs stable Flutter, caches dependencies, runs `dart format`, `flutter analyze`, `flutter test`, and then builds `flutter build appbundle --release` with a job timeout and artifact upload.

