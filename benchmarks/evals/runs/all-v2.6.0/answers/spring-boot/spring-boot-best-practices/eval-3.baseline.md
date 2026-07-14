# Environment-specific properties

Keep safe shared defaults in `application.yml`, and put real differences in files such as `application-dev.yml` and `application-prod.yml`. Activate profiles through deployment configuration, not by making production the local default.

Bind related settings with validated `@ConfigurationProperties` instead of scattered `@Value` fields. Supply deployment values through environment variables, mounted config, or a secret/configuration service; never commit passwords or tokens. Use `spring.config.import` for external config when appropriate, document required variables, and fail fast for missing mandatory settings. Keep precedence and profile selection clear, and test supported configuration combinations.



