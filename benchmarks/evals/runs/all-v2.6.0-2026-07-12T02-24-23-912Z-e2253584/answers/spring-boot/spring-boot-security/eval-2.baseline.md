# JWT authentication with Spring Security 6

For tokens issued by an identity provider, use OAuth2 resource-server support rather than a custom JWT filter:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://issuer.example.com
```

Define a `SecurityFilterChain` with `oauth2ResourceServer(o -> o.jwt())`, stateless sessions, and authorization rules. Use a `JwtAuthenticationConverter` if scopes or roles use a nonstandard claim. Validate signature, issuer, expiry/not-before, and audience as required. Use HTTPS, rotate keys through the provider/JWK cache, and never log or store bearer tokens. JWTs are signed, not automatically encrypted, so keep sensitive data out of claims.



