# Angular Framework Map

Reviewed: 2026-07-09

Official sources:
- https://angular.dev
- https://angular.dev/guide/signals
- https://angular.dev/guide/templates/control-flow
- https://angular.dev/style-guide
- https://angular.dev/guide/components

Notes:
- Angular's refreshed style guide moves away from mandatory `.component`/`.service` filename type-suffixes; treat suffix conventions as a project-level choice, not a hard rule.

## Default stance

- `angular-architecture`: standalone-by-default module boundaries.
- `angular-components`: signal inputs/outputs/`model()`, `host:` bindings (base language skill).
- `angular-state-management`: `signal()`/`linkedSignal`/`@ngrx/signals`.
- `angular-forms`: reactive forms conventions.
- `angular-routing`: standalone route config, guards.
- `angular-testing`: TestBed + signal-aware test patterns.

## Signals-era defaults

- Standalone components by default; NgModules only for legacy code that hasn't migrated.
- Signal inputs/outputs (`input()`, `output()`, `model()`) over decorator-based `@Input`/`@Output` in new code.
- New control flow (`@if`, `@for` with `track`, `@switch`) over structural directives (`*ngIf`, `*ngFor`) in new templates.
- `OnPush` change detection by default; signals make this the natural default rather than an opt-in optimization.

## Smells that mean "load more skills"

- A new component still uses `@Input()`/`@Output()` decorators instead of signal inputs.
- Templates mix `*ngFor` and `@for` in the same file.
- RxJS state management is introduced where a signal would do (see `angular-rxjs-interop` for the boundary).
- Change detection strategy is `Default` on a newly authored component.
