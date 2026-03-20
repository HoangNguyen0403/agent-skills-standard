# Java Best Practices — Examples

## Static Factory Method

```java
public class User {
    private final String id;
    private final String name;

    private User(String id, String name) {
        this.id = Objects.requireNonNull(id);
        this.name = Objects.requireNonNull(name);
    }

    // Static factory over constructor
    public static User of(String id, String name) {
        return new User(id, name);
    }
}
```

## Composition over Inheritance

```java
public class OrderService {
    private final OrderRepository repo;   // Injected
    private final NotificationService notifier; // Injected

    public OrderService(OrderRepository repo, NotificationService notifier) {
        this.repo = Objects.requireNonNull(repo);
        this.notifier = Objects.requireNonNull(notifier);
    }

    public Order placeOrder(OrderRequest request) {
        Objects.requireNonNull(request, "request must not be null"); // Fail fast
        var order = Order.of(request);
        repo.save(order);
        notifier.send(order);
        return order;
    }
}
```

## Builder Pattern (4+ params)

```java
public class Pizza {
    private final int size;
    private final boolean cheese;
    private final boolean pepperoni;
    private final boolean mushrooms;

    private Pizza(Builder b) {
        this.size = b.size;
        this.cheese = b.cheese;
        this.pepperoni = b.pepperoni;
        this.mushrooms = b.mushrooms;
    }

    public static class Builder {
        private final int size;
        private boolean cheese;
        private boolean pepperoni;
        private boolean mushrooms;

        public Builder(int size) { this.size = size; }
        public Builder cheese() { this.cheese = true; return this; }
        public Builder pepperoni() { this.pepperoni = true; return this; }
        public Builder mushrooms() { this.mushrooms = true; return this; }
        public Pizza build() { return new Pizza(this); }
    }
}
// Usage: new Pizza.Builder(12).cheese().pepperoni().build()
```
