The usual fix is to rerun `build_runner` with deletion enabled:

```bash
dart run build_runner build --delete-conflicting-outputs
```

If this is a Flutter package, the equivalent is:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

Why this happens:

- `build_runner` generates files such as `*.g.dart`.
- If a generated file already exists but no longer matches what the current builder wants to write, it treats that as a conflict instead of overwriting it silently.
- This commonly happens after switching branches, rebasing, renaming models, changing generators, or committing generated files that are now out of date.

Recommended cleanup flow:

1. Make sure no one has manually edited generated files.
2. Run:

```bash
dart run build_runner clean
dart run build_runner build --delete-conflicting-outputs
```

3. If you use watch mode:

```bash
dart run build_runner watch --delete-conflicting-outputs
```

If it still fails:

- Delete stale generated outputs like `*.g.dart`, `*.freezed.dart`, or `*.gr.dart` that belong to the affected source files, then rebuild.
- Run `dart pub get` to ensure generator versions are in sync.
- Check for two generators trying to own the same output path.
- Confirm you are not mixing incompatible versions of packages such as `json_serializable`, `freezed`, `source_gen`, or other codegen tools.

Good team practice:

- Treat generated files as disposable artifacts unless your repo intentionally commits them.
- Standardize one command for codegen in documentation or scripts so everyone uses the same flags.
- After branch switches or dependency upgrades, rerun code generation before making further edits.

