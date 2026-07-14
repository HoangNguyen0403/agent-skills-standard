# Flutter Framework Map

Reviewed: 2026-07-09

Official sources:
- https://docs.flutter.dev
- https://docs.flutter.dev/release/whats-new
- https://riverpod.dev
- https://bloclibrary.dev
- https://docs.flutter.dev/testing

Notes:
- Row/Column `spacing` requires Flutter 3.27+; use `Gap`/`SizedBox` on earlier versions.

## Default stance

- `flutter-idiomatic-flutter`: layout/composition conventions, async-gap safety.
- `flutter-bloc-state-management`: default state-management skill for this registry (base language skill).
- `flutter-feature-based-clean-architecture`: default project structure for new apps.
- `flutter-error-handling`: failure modeling across layers.
- `flutter-testing`: `flutter test` conventions, `blocTest`, widget tests.

## State-management selection

Detect the project's actual dependency from `pubspec.yaml` before picking a skill — never mix state-management approaches in one feature:
- `flutter_bloc` present → `flutter-bloc-state-management`.
- `flutter_riverpod`/`riverpod_annotation` present → `flutter-riverpod-state-management` (targets Riverpod 3.x).
- `get` present → `flutter-getx-state-management`.
- No state package yet, greenfield decision needed → default to `flutter-bloc-state-management` unless the team has an existing stated preference.

## Navigation selection

Same rule — check `pubspec.yaml` first, do not introduce a second router into a project:
- `go_router` → `flutter-go-router-navigation`.
- `auto_route` → `flutter-auto-route-navigation`.
- `get` (GetX routing) → `flutter-getx-navigation`.
- Raw `Navigator`/no router package → `flutter-navigation`.

## Architecture selection

- `flutter-feature-based-clean-architecture`: default for new apps (colocated feature folders).
- `flutter-layer-based-clean-architecture`: use only when the project already organizes by technical layer (data/domain/presentation at the root) — do not introduce it into a feature-first project.

## Smells that mean "load more skills"

- A feature imports two different state-management packages.
- Navigation is a mix of `go_router` routes and raw `Navigator.push` calls.
- Business logic lives inside a widget's `build()` instead of a Bloc/Notifier.
- New code targets a `spacing`-parameter layout on a Flutter version below 3.27.
