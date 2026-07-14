Expose a `SecurityFilterChain` bean using the Spring Security 6 Lambda DSL; do not extend the removed `WebSecurityConfigurerAdapter`:

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // only for a pure token-based API
        .cors(Customizer.withDefaults())
        .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health", "/v3/api-docs/**").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated());
    return http.build();
}
```

Use `requestMatchers`, not `antMatchers`. Statelessness is appropriate for a REST API only when credentials are supplied on each request, typically through a validated bearer JWT; configure an `AuthenticationManager` or `JwtDecoder` accordingly. Do not disable CSRF blindly: pure APIs without browser cookies can disable it, while browser applications using cookies need CSRF protection.

Restrict CORS to known origins and never combine wildcard origins with credentials. Load signing keys from environment/Vault, enforce token issuer, audience, expiry, and a permitted RS256 or HS256 algorithm, and secure actuator endpoints. Verify unauthenticated, authenticated, forbidden, CORS, and expired-token responses with integration tests.


