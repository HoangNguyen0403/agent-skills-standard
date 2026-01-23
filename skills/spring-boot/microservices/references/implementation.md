# Microservices Implementation Examples

## Declarative HTTP Client (Spring 6+)

```java
// Definition (in Shared Library)
public interface InventoryClient {
    @GetExchange("/inventory/{sku}")
    InventoryCheck checkStock(@PathVariable String sku);
}

// Config & Usage
@Configuration
class ClientConfig {
    @Bean
    InventoryClient inventoryClient(WebClient.Builder builder) {
        WebClient client = builder.baseUrl("http://inventory-service").build();
        return HttpServiceProxyFactory.builder(WebClientAdapter.forClient(client))
            .build().createClient(InventoryClient.class);
    }
}
```

## Spring Cloud Stream (Kafka/RabbitMQ)

```java
@Configuration
public class EventHandlers {

    // Functional Bean definition
    // Binds to: orderProcessed-in-0 (defined in .yml)
    @Bean
    public Consumer<OrderPlacedEvent> orderProcessed() {
        return event -> {
            log.info("Received order: {}", event.orderId());
            // Idempotent Logic
        };
    }
}
```
