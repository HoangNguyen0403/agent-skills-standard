Avoid field injection with `@Autowired`. It hides a class's dependencies, makes the object harder to instantiate in a unit test, allows dependencies to be reassigned, and can conceal an overly coupled design.

Prefer constructor injection with final fields:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orders;
    private final PaymentClient payments;
}
```

Spring will use the single constructor automatically; without Lombok, write that constructor explicitly. Constructor injection also makes circular dependencies fail visibly during startup instead of being deferred. Do not work around a cycle with `@Lazy`, a service locator, or `context.getBean()`; refactor responsibilities or introduce an event/interface boundary. Keep configuration similarly explicit with validated `@ConfigurationProperties` records rather than scattered `@Value` fields. Declare all injected dependencies as final, use DTO records at API boundaries, and keep exceptions handled explicitly rather than logging and swallowing them.


