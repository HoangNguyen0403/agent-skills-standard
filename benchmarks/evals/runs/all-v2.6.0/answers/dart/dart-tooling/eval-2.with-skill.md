The fix is to run code generation with `--delete-conflicting-outputs`.

Use:

```bash
dart run build_runner build --delete-conflicting-outputs
```

Or for Flutter projects:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

Why this happens:

- `build_runner` found generated files such as `.g.dart` outputs that no longer match the current builder state.
- This usually comes from renamed models, changed annotations, switching branches, or previously generated artifacts left behind.
- Without the flag, the generator stops to avoid overwriting files it considers conflicting.

Why the flag is the standard fix:

- It removes stale generated outputs that are blocking regeneration.
- It allows the current generation pass to recreate files from source-of-truth annotations and builders.
- It prevents recurring local compile failures caused by outdated generated code.

Good practice:

- Always use `--delete-conflicting-outputs` for routine generation, not only when things are already broken.
- Run analysis after generation so you fail fast on real code issues:

```bash
flutter analyze --fatal-infos --fatal-warnings
```

If conflicts still persist after using the flag, the next thing to inspect is whether multiple builders are targeting the same outputs or whether generated files are being manually edited, which they should not be.

