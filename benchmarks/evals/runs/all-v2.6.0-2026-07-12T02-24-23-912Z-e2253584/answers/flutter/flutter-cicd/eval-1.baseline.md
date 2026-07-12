A solid baseline is to use a single GitHub Actions workflow triggered on `pull_request`, install Flutter on a Linux runner, restore dependency caches, then run the quality gates in this order: `flutter pub get`, `flutter analyze`, `flutter test`, and `flutter build appbundle`.

Example workflow:

```yaml
name: flutter-pr

on:
  pull_request:
    branches:
      - main

jobs:
  verify:
    runs-on: ubuntu-latest

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

      - name: Install dependencies
        run: flutter pub get

      - name: Analyze
        run: flutter analyze

      - name: Test
        run: flutter test

      - name: Build Android AAB
        run: flutter build appbundle --release

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: build/app/outputs/bundle/release/*.aab
```

Why this is a good baseline:

- It validates code quality first, so obvious issues fail before the expensive build step.
- It runs on every PR, which gives review-time feedback instead of discovering problems after merge.
- It uploads the generated AAB as an artifact so reviewers or release engineers can inspect the output without rebuilding locally.
- It uses built-in Flutter caching from the setup action, which is usually the easiest first optimization.

Practical considerations:

- If your default branch is not `main`, change the branch filter.
- If the project uses flavors, pass the correct flavor and target file to the build command.
- If signing is not configured for PR builds, build an unsigned release AAB for validation only.
- If you rely on code generation, insert that step before analyze and test.

If you want a stronger CI later, the natural next upgrades are matrix testing across Flutter versions, splitting analyze/test/build into parallel jobs, and adding dependency or Gradle caches explicitly.

