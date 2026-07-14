# Laravel Framework Map

Reviewed: 2026-07-09

Official sources:
- https://laravel.com/docs
- https://laravel.com/docs/eloquent
- https://laravel.com/docs/authorization
- https://laravel.com/docs/testing

Notes:
- Targets Laravel 11/12. `preventLazyLoading` should be enabled outside production to catch N+1s during development.

## Default stance

- `laravel-architecture`: Form Requests + Action classes for business logic (base language skill).
- `laravel-eloquent`: query scopes, eager loading, `preventLazyLoading`.
- `laravel-security`: Policies/Gates, mass-assignment protection.
- `laravel-api`: API resource/response conventions.
- `laravel-testing`: feature/unit test conventions.

## Architecture selection

- `laravel-architecture`: default — Form Requests validate input, single-purpose Action classes hold business logic, controllers stay thin.
- `laravel-clean-architecture`: use only when the project already commits to layered/hexagonal boundaries (ports/adapters) beyond the Action-class default — do not introduce it into a project that hasn't opted in.

## Runtime defaults

- Validation lives in Form Request classes, not inline in controllers.
- Business logic lives in single-purpose Action classes, not fat controllers or fat models.
- Authorization via Policies/Gates, checked explicitly (`$this->authorize(...)`) rather than ad-hoc role checks scattered in controllers.
- `Model::preventLazyLoading()` enabled in non-production environments.

## Smells that mean "load more skills"

- A controller method does validation, business logic, and response shaping all inline.
- N+1 queries show up because eager loading (`with()`) wasn't declared and lazy loading wasn't caught in dev.
- Authorization checks are duplicated across controllers instead of centralized in a Policy.
- A project mixes `laravel-architecture` (Action classes) and `laravel-clean-architecture` (layered) patterns in the same feature.
