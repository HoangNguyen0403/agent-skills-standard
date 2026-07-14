# Testing external HTTP clients

Unit-test business branching with a mocked client or port. Add WireMock, MockWebServer, or a containerized mock when you need to exercise real serialization, URLs, headers, timeouts, retries, and client configuration.

Cover success, malformed payloads, 4xx/5xx, connection failures, slow responses, empty data, and invalid authentication. Assert that only transient failures retry, retries are bounded/backed off, and fallback/error mapping is correct. Use a fake clock or deterministic retry settings where possible. Never call an uncontrolled third party in CI. Add contract tests against the provider schema or a consumer contract, keep secrets out of fixtures, and verify trace headers when relevant.



