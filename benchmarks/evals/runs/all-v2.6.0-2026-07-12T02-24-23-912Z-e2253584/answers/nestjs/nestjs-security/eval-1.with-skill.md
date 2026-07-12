Use `@nestjs/passport` with `passport-jwt`, enforce a signed algorithm such as RS256, and validate issuer and audience in the strategy. Register authentication globally as an `APP_GUARD`, then mark only deliberate public routes with a `@Public()` decorator.

Access tokens should be short-lived (for example 15 minutes); keep refresh tokens long-lived and HTTP-only when cookie-based. Reject `none`, keep signing secrets/keys in a vault, and test unauthenticated requests return 401. Add Helmet, explicit CORS origins, throttling, `ValidationPipe({ whitelist: true })`, and Argon2id password hashing as part of the application security baseline.

