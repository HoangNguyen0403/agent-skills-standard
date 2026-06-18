# NestJS Framework Map

Reviewed: 2026-06-17

Official sources:
- https://docs.nestjs.com/
- https://docs.nestjs.com/guards
- https://docs.nestjs.com/interceptors
- https://docs.nestjs.com/faq/request-lifecycle
- https://docs.nestjs.com/fundamentals/injection-scopes

Use this guide when the task spans multiple NestJS concerns or when file routing alone would load too many isolated skills.

## Default stance

- Start with `nestjs-architecture` for module boundaries and provider placement.
- Add `nestjs-controllers-services` for request handlers and parameter extraction.
- Add `nestjs-security` for auth, guards, and route protection.
- Add `nestjs-error-handling` for filters and exception normalization.
- Add `nestjs-testing` before changing controllers, pipes, guards, or interceptors.

## Request pipeline decisions

- Middleware: raw request/response concerns before route resolution.
- Guard: authn/authz and route access decisions.
- Pipe: validation and value transformation for handler inputs.
- Interceptor: cross-cutting request/response behavior, timing, logging, caching, response mapping.
- Filter: translate thrown errors into transport-safe responses.

Request flow from official docs: middleware -> guards -> interceptors -> pipes -> handler -> interceptors on return path.

## Provider scope defaults

- Default to singleton providers.
- Use request scope only for per-request state such as tenant context, request-local caching, or request tracking.
- Treat request scope as a performance tradeoff; verify the need before using it in hot paths.
- Use transient scope for truly per-consumer instances, not as a default escape hatch.

## Module boundary rules

- Feature module owns controller, application service, and persistence adapters for that bounded context.
- Shared module exposes stateless cross-cutting helpers only.
- Core module owns platform concerns: config, database bootstrap, logging, cache, metrics.
- Avoid circular imports; move contracts outward instead of adding `forwardRef()` reflexively.

## Common workflows

- New HTTP endpoint: architecture -> controllers-services -> security -> documentation -> testing.
- New async job: architecture -> bullmq or scheduling -> observability -> testing.
- New realtime flow: architecture -> real-time -> security -> testing.
- Config or bootstrap change: architecture -> configuration -> observability -> performance.

## Smells that mean "load more skills"

- Route mixes validation, auth, business logic, and response mapping.
- Request-scoped providers appear in many modules.
- `main.ts` accumulates transport, docs, cache, and security setup.
- Feature needs DB + DTO + auth + queue changes together.
