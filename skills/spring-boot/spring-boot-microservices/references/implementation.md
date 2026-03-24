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

## Feign Client with Circuit Breaker

```java
@FeignClient(name = "order-service", fallback = OrderClientFallback.class)
public interface OrderClient {
    @GetMapping("/api/orders/{id}")
    OrderDto getOrder(@PathVariable String id);
}

@Component
public class OrderClientFallback implements OrderClient {
    @Override
    public OrderDto getOrder(String id) {
        return OrderDto.empty(); // cached or default response
    }
}
```

## Event Consumer with Idempotency

```java
@Bean
public Consumer<OrderCreatedEvent> processOrder() {
    return event -> {
        log.info("Processing order: {}", event.orderId());
        // Idempotency: check if already processed
        if (orderStore.exists(event.orderId())) return;
        orderStore.save(event);
    };
}
```
