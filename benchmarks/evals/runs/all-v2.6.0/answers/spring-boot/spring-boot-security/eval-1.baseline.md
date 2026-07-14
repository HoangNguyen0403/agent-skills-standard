# Stateless REST API with Spring Security 6

Define a `SecurityFilterChain` with stateless sessions, authorization rules, and resource-server JWT support:

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(a -> a
            .requestMatchers("/actuator/health").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/**").hasAuthority("SCOPE_read")
            .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt())
        .build();
}
```

Disable CSRF only for an API that is genuinely stateless and does not authenticate with browser cookies. Configure issuer/JWK validation, narrow CORS, HTTPS, authorization, and consistent 401/403 handling. Protect actuator and documentation endpoints; do not make authorization only a controller concern.



