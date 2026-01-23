# Security Implementation Examples

## Modern Security Configuration (Lambda DSL)

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Replaces @EnableGlobalMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. CSRF (Disable for Stateless JWT APIs, Enable for Session/Cookie)
            .csrf(csrf -> csrf.disable())

            // 2. Stateless Session
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 3. Authorization Rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())

            // 4. JWT Filter (Add before UsernamePasswordAuthenticationFilter)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

## Method Level Security

```java
@Service
public class OrderService {

    @PreAuthorize("hasAuthority('SCOPE_order:write')")
    public void createOrder(OrderRequest req) {
        // ...
    }
}
```
