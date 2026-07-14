Use a small set of enforceable production defaults:

- Prefer constructor injection, with final dependencies; Lombok `@RequiredArgsConstructor` is fine. Avoid field `@Autowired` injection.
- Bind configuration with validated `@ConfigurationProperties` records, use `application.yaml` and profile files such as `application-dev.yml`/`application-prod.yml`, and select profiles with `SPRING_PROFILES_ACTIVE`. Never hardcode secrets.
- Use immutable record DTOs and validate inputs with Jakarta Bean Validation.
- Centralize errors with `@ControllerAdvice` and RFC 7807 `ProblemDetail`; never expose stack traces.
- Log through SLF4J (for example `@Slf4j`) with structured arguments, not `System.out` or log-and-swallow handling.
- Add Spotless or Checkstyle and manage JDK 21+ consistently, for example with SDKMAN.

For database-backed services, keep transaction boundaries in services and use read-only transactions for read paths where appropriate. Add health, metrics, and secure operational endpoints as deployment requirements. Make the rules testable in CI: fail on formatting violations, validate configuration at startup, scan dependencies for CVEs, and exercise error and profile-specific paths. The important principle is explicit dependencies, typed configuration, safe failures, and observable behavior rather than a long list of annotations.


