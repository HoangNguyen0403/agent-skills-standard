---
name: spring-boot-security
description: Configure Spring Security 6+ with Lambda DSL, JWT, and hardening rules. Use when configuring Spring Security 6+, OAuth2, JWT, or security hardening in Spring Boot.
metadata:
  triggers:
    files:
    - '**/*SecurityConfig.java'
    - '**/*Filter.java'
    keywords:
    - security-filter-chain
    - lambda-dsl
    - csrf
    - cors
---
# Spring Boot Security Standards

## **Priority: P0 (CRITICAL)**

## Configure SecurityFilterChain

- **Lambda DSL**: ALWAYS use Lambda DSL.
- **SecurityFilterChain**: Expose as `@Bean`. not extend `WebSecurityConfigurerAdapter`.
- **Statelessness**: Enforce `SessionCreationPolicy.STATELESS` for REST APIs.

See [implementation examples](references/implementation.md) for SecurityFilterChain configuration with Lambda DSL and JWT.

## Implement Authentication and Authorization

- **Authentication**: Validation of credentials (Who you?). Use `AuthenticationManager` or `JwtDecoder`.
- **Authorization**: Verification of access rights (Can you this?). Use `@PreAuthorize`.

## Secure JWT Tokens

- **Algorithm**: Enforce `RS256` or `HS256`. **Reject `none` algorithm**.
- **Claims**: Validate `iss`, `aud`, and `exp`.
- **Tokens**: Short-lived access tokens (15m), secure refresh tokens (httpOnly cookie).

## Hardening Checklist

- [ ] **CSRF**: Disabled for pure APIs? Enabled + Cookie for Browser Apps?
- [ ] **CORS**: Specific origins permitted? No `*` with credentials?
- [ ] **Headers**: HSTS, Content-Type-Options, X-Frame-Options enabled?
- [ ] **Secrets**: No hardcoded keys? Loaded from Vault/Env?
- [ ] **Rate Limiting**: Applied on login/expensive endpoints?
- [ ] **Dependencies**: Scanned for CVEs?

## Anti-Patterns

- **No Adapter**: Use `SecurityFilterChain` bean instead of extending legacy classes.
- **No .and()**: Use Lambda DSL for configuration.
- **No Secrets**: Load from Vault or Environment variables (never git).
- **No antMatchers**: Use `requestMatchers` (Spring Security 6+).

## References

- [Implementation Examples](references/implementation.md)
- common/security-standards
- architecture