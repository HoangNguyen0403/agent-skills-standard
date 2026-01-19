# Advanced Large-Scale CI/CD

For large projects, a linear workflow is too slow. Use parallel jobs and aggressive caching.

## Optimized Workflow (`main.yml`)

Split your pipeline into parallel stages to fail fast.

```yaml
name: Production CI

on: [push, pull_request]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # 1. SETUP: Install & Cache Dependencies
  # This job prepares the environment so others can just reuse the cache.
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true
      - name: Install Dependencies
        run: flutter pub get

  # 2. QUALITY: Static Analysis & Formatting (Runs parallel to Test)
  quality:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - name: Verify Formatting
        run: dart format --output=none --set-exit-if-changed .
      - name: Static Analysis
        run: flutter analyze --fatal-infos

  # 3. TEST: Unit & Widget Tests
  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - name: Run Tests
        # Usage of concurrency to speed up execution
        run: flutter test --coverage --concurrency=4
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

## Key Optimizations

1. **Concurrency Group**: `cancel-in-progress: true` stops old runs when new code is pushed to the same PR, saving minutes.
2. **Parallel Jobs**: `quality` and `test` trigger at the same time. If formatting fails, you don't wait for tests to finish.
3. **Fatal Infos**: Enforce higher quality by treating info-level logic hints as failures.
