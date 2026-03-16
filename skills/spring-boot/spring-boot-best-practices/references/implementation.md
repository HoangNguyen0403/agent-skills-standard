# Best Practices Implementation Examples

## Constructor Injection (Standard)

```java
@Service
@RequiredArgsConstructor // Lombok generates constructor for final fields
public class OrderService {
    private final OrderRepository repository;
    private final PaymentGateway paymentGateway; // Immutable dependency

    public void process(Order order) {
        // ...
    }
}
```

## Type-Safe Configuration

```java
// Immutable configuration properties
@ConfigurationProperties(prefix = "app.security")
@Validated
public record SecurityProperties(
    @NotNull Duration tokenExpiration,
    @NotBlank String issuer
) {}

// Enabling it
@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
class AppConfig {}
```

## Correct Logging

```java
@Slf4j
@Service
class PaymentService {
    void pay(String id) {
        // FAST: String concatenation only happens if debug is enabled
        log.debug("Processing payment for ID: {}", id);

        try {
            // ...
        } catch (Exception e) {
            // Log full stack trace
            log.error("Payment failed", e);
            throw e;
        }
    }
}
```
