Use typed, profile-aware configuration rather than scattering `@Value` strings:

```java
@ConfigurationProperties("payments")
@Validated
public record PaymentProperties(@NotEmpty String baseUrl,
                                @NotNull Duration timeout) {}
```

Register it with `@ConfigurationPropertiesScan` (or `@EnableConfigurationProperties`) and keep structured defaults in `application.yaml`. Put environment-specific overrides in `application-dev.yml` and `application-prod.yml`, selecting one with `SPRING_PROFILES_ACTIVE`. Use environment variables, Kubernetes Secrets, Vault, or `spring.config.import` for credentials; never commit or bake secret values into properties.

Validation should fail fast at startup using `@Validated` and Jakarta constraints such as `@NotNull` and `@NotEmpty`. Records provide immutable, type-safe configuration and make duration, URLs, and numeric limits explicit. Avoid `@Value` for larger configuration groups, avoid silent empty defaults for required settings, and do not log secret values. Keep configuration ownership near the feature that consumes it and test each required profile and startup validation path.


