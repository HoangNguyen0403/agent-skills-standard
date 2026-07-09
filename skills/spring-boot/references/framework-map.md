# Spring Boot Framework Map

Reviewed: 2026-07-09

Official sources:
- https://docs.spring.io/spring-boot/documentation.html
- https://docs.spring.io/spring-security/reference/index.html
- https://docs.spring.io/spring-framework/reference/web/webmvc.html
- https://datatracker.ietf.org/doc/html/rfc7807

Notes:
- Targets Spring Boot 3.x / Java 17+. Security config uses the lambda DSL (`requestMatchers`), not `antMatchers`/`WebSecurityConfigurerAdapter`.

## Default stance

- `spring-boot-architecture`: layering, configuration, records for DTOs (base language skill).
- `spring-boot-api-design`: REST conventions, `ProblemDetail` (RFC 7807) error responses.
- `spring-boot-security`: Security 6 lambda DSL, JWT/OAuth2 resource server config.
- `spring-boot-data-access`: repository boundaries, `open-in-view=false`, N+1 avoidance.
- `spring-boot-testing`: slice tests, Testcontainers.

## Runtime defaults

- Java 17 `record` types for DTOs/value objects.
- `ProblemDetail` for error responses instead of custom ad-hoc error bodies.
- Security config via `SecurityFilterChain` bean + `requestMatchers`; never `WebSecurityConfigurerAdapter` (removed) or `antMatchers` (removed in Security 6).
- `spring.jpa.open-in-view=false` by default; fetch what a use case needs explicitly.

## Smells that mean "load more skills"

- A new security config extends `WebSecurityConfigurerAdapter` or calls `antMatchers`.
- Controllers return raw exception messages instead of `ProblemDetail`.
- Repository calls happen inside a view/template instead of the service layer (open-in-view masking N+1s).
- DTOs are plain classes with manual getters/setters instead of records.
