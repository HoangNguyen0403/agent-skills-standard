# Constructor injection

Prefer constructor injection because dependencies are explicit, required fields can be `final`, objects are easy to unit-test without Spring, and missing dependencies fail fast:

```java
@Service
public class OrderService {
    private final OrderRepository orders;

    public OrderService(OrderRepository orders) {
        this.orders = orders;
    }
}
```

A single constructor needs no `@Autowired` in modern Spring; Lombok's `@RequiredArgsConstructor` is also common. Field injection hides the dependency graph, complicates direct tests, prevents final fields, and can obscure circular dependencies. Use setter injection only for genuinely optional or replaceable dependencies.



