Keep the service test isolated from the network. Inject a client abstraction, mock it for unit tests, and use WireMock for an integration-style HTTP contract test. This lets the test exercise serialization, status handling, timeouts, and retry behavior without depending on a live third-party service.

```java
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock PaymentClient client;
    @InjectMocks PaymentService service;

    @Test
    void mapsClientFailureToDomainFailure() {
        when(client.charge(any())).thenThrow(new TimeoutException());

        assertThatThrownBy(() -> service.pay(request()))
            .isInstanceOf(PaymentUnavailable.class);
    }
}
```

Use AssertJ rather than JUnit assertion methods, and verify that only known transient errors are retried with bounded backoff. For the HTTP adapter, run WireMock with deterministic responses for success, timeout, malformed payload, 4xx, 5xx, and retry exhaustion; do not perform uncontrolled network I/O in tests. Keep external-client tests separate from domain unit tests, use Testcontainers for real infrastructure when needed, and use JaCoCo to identify untested branches rather than chasing a percentage alone.


